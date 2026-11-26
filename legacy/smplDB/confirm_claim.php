<?php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle browser preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header("Content-Type: application/json");

require_once "db.php";

try {

    /*
     * Because the React frontend sends FormData,
     * use $_POST and $_FILES instead of JSON input.
     */
    $requestId = (int)($_POST['request_id'] ?? 0);
    $receivedBy = trim($_POST['received_by'] ?? '');
    $customDueDateTime = trim($_POST['expected_return_date'] ?? '');

    if ($requestId <= 0) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid request ID."
        ]);
        exit;
    }

    if ($receivedBy === '') {
        echo json_encode([
            "success" => false,
            "message" => "Please enter who received the item."
        ]);
        exit;
    }

    /*
     * Check uploaded document.
     */
    if (!isset($_FILES['claim_document'])) {
        echo json_encode([
            "success" => false,
            "message" => "Please upload a claim document."
        ]);
        exit;
    }

    $file = $_FILES['claim_document'];

    if ($file['error'] !== UPLOAD_ERR_OK) {
        echo json_encode([
            "success" => false,
            "message" => "There was an error uploading the document."
        ]);
        exit;
    }

    /*
     * Maximum file size: 5 MB
     */
    $maxSize = 5 * 1024 * 1024;

    if ($file['size'] > $maxSize) {
        echo json_encode([
            "success" => false,
            "message" => "Document must not exceed 5 MB."
        ]);
        exit;
    }

    /*
     * Check actual MIME type.
     */
    $finfo = new finfo(FILEINFO_MIME_TYPE);
    $mimeType = $finfo->file($file['tmp_name']);

    $allowedTypes = [
        "image/jpeg" => "jpg",
        "image/png"  => "png",
        "image/webp" => "webp",
        "image/gif"  => "gif",
        "application/pdf" => "pdf"
    ];

    if (!isset($allowedTypes[$mimeType])) {
        echo json_encode([
            "success" => false,
            "message" => "Only JPG, PNG, WEBP, GIF, and PDF files are allowed."
        ]);
        exit;
    }

    $extension = $allowedTypes[$mimeType];

    /*
     * Create claim upload directory.
     */
    $uploadDir = __DIR__ . "/uploads/claims/";

    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0777, true)) {
            throw new Exception("Unable to create claim upload directory.");
        }
    }

    /*
     * Generate unique filename.
     */
    $documentName = "claim_" . uniqid() . "." . $extension;
    $documentPath = $uploadDir . $documentName;

    /*
     * Start database transaction.
     */
    $conn->begin_transaction();

    /*
     * Get the approved request and lock it.
     */
    $sql = "
        SELECT
            id,
            user_id,
            stock_id,
            amount,
            status,
            claim_code_used,
            claim_document,
            expected_return_date
        FROM stock_requests
        WHERE id = ?
          AND UPPER(TRIM(status)) = 'APPROVED'
          AND claim_code_used = 0
        FOR UPDATE
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception(
            "Database prepare failed: " . $conn->error
        );
    }

    $stmt->bind_param("i", $requestId);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->rollback();

        echo json_encode([
            "success" => false,
            "message" => "This request is already claimed, cancelled, or is not approved."
        ]);
        exit;
    }

    $request = $result->fetch_assoc();

    $stockId = (int)$request['stock_id'];
    $claimAmount = (int)$request['amount'];

    $stmt->close();

    /*
     * Move uploaded document.
     */
    if (!move_uploaded_file(
        $file['tmp_name'],
        $documentPath
    )) {
        throw new Exception(
            "Unable to save uploaded claim document."
        );
    }

    /*
     * Check current stock.
     */
    $stockSql = "
        SELECT id, amount, item_type, item_name
        FROM stocks
        WHERE id = ?
        FOR UPDATE
    ";

    $stockStmt = $conn->prepare($stockSql);

    if (!$stockStmt) {
        throw new Exception(
            "Stock query failed: " . $conn->error
        );
    }

    $stockStmt->bind_param("i", $stockId);
    $stockStmt->execute();

    $stockResult = $stockStmt->get_result();

    if ($stockResult->num_rows === 0) {
        $stockStmt->close();

        if (file_exists($documentPath)) {
            unlink($documentPath);
        }

        $conn->rollback();

        echo json_encode([
            "success" => false,
            "message" => "Stock item no longer exists."
        ]);
        exit;
    }

    $stock = $stockResult->fetch_assoc();
    $currentAmount = (int)$stock['amount'];
    $stockStmt->close();

    /*
     * Make sure enough stock exists.
     */
    if ($currentAmount < $claimAmount) {
        if (file_exists($documentPath)) {
            unlink($documentPath);
        }

        $conn->rollback();

        echo json_encode([
            "success" => false,
            "message" => "Not enough stock available."
        ]);
        exit;
    }

    $newAmount = $currentAmount - $claimAmount;

    /*
     * Decrease stock.
     */
    $updateStockSql = "
        UPDATE stocks
        SET amount = ?
        WHERE id = ?
    ";

    $updateStockStmt = $conn->prepare($updateStockSql);

    if (!$updateStockStmt) {
        throw new Exception(
            "Stock update failed: " . $conn->error
        );
    }

    $updateStockStmt->bind_param(
        "ii",
        $newAmount,
        $stockId
    );

    if (!$updateStockStmt->execute()) {
        throw new Exception(
            "Unable to decrease stock amount."
        );
    }

    $updateStockStmt->close();

    /*
     * If the stock item is returnable, validate and set the expected return date and time.
     */
    $isReturnable = (($stock['item_type'] ?? 'non_returnable') === 'returnable');
    $borrowingId = null;

    $finalExpectedReturn = null;
    if ($isReturnable) {
        if ($customDueDateTime !== "") {
            // Convert to Y-m-d H:i:s
            $parsedTime = strtotime($customDueDateTime);
            if ($parsedTime !== false) {
                $finalExpectedReturn = date("Y-m-d H:i:s", $parsedTime);
            }
        }
        if (!$finalExpectedReturn) {
            if (!empty($request['expected_return_date'])) {
                $finalExpectedReturn = date("Y-m-d H:i:s", strtotime($request['expected_return_date']));
            } else {
                // Default: 7 days later at 5:00 PM
                $finalExpectedReturn = date("Y-m-d 17:00:00", strtotime("+7 days"));
            }
        }
    }

    /*
     * Mark request as COMPLETED
     * and save claim document and expected return date.
     */
    $completeSql = "
        UPDATE stock_requests
        SET
            status = 'COMPLETED',
            claim_code_used = 1,
            received_by = ?,
            claimed_at = NOW(),
            claim_document = ?,
            expected_return_date = ?
        WHERE id = ?
          AND UPPER(TRIM(status)) = 'APPROVED'
          AND claim_code_used = 0
    ";

    $completeStmt = $conn->prepare($completeSql);

    if (!$completeStmt) {
        throw new Exception(
            "Claim update failed: " . $conn->error
        );
    }

    $completeStmt->bind_param(
        "sssi",
        $receivedBy,
        $documentName,
        $finalExpectedReturn,
        $requestId
    );

    if (!$completeStmt->execute()) {
        throw new Exception(
            "Unable to complete claim."
        );
    }

    if ($completeStmt->affected_rows === 0) {
        throw new Exception(
            "Claim could not be completed."
        );
    }

    $completeStmt->close();

    /*
     * If returnable, insert borrowing record with the specified due date and time.
     */
    if ($isReturnable) {
        $reqUserId = (int)$request['user_id'];

        $borrowSql = "
            INSERT INTO equipment_borrowings
            (
                request_id,
                stock_id,
                user_id,
                amount,
                borrowed_at,
                expected_return_date,
                status,
                equipment_condition,
                received_by
            )
            VALUES (?, ?, ?, ?, NOW(), ?, 'BORROWED', 'Good', ?)
        ";

        $borrowStmt = $conn->prepare($borrowSql);
        if (!$borrowStmt) {
            throw new Exception("Unable to prepare borrowing record: " . $conn->error);
        }

        $borrowStmt->bind_param(
            "iiiiss",
            $requestId,
            $stockId,
            $reqUserId,
            $claimAmount,
            $finalExpectedReturn,
            $receivedBy
        );

        if (!$borrowStmt->execute()) {
            throw new Exception("Unable to create borrowing record: " . $borrowStmt->error);
        }

        $borrowingId = $borrowStmt->insert_id;
        $borrowStmt->close();
    }

    /*
     * Everything succeeded.
     */
    $conn->commit();

    echo json_encode([
        "success" => true,
        "message" => "Item claim recorded and stock updated successfully." . ($isReturnable ? " Due for return on " . date("M d, Y h:i A", strtotime($finalExpectedReturn)) . "." : ""),
        "received_by" => $receivedBy,
        "claimed_amount" => $claimAmount,
        "remaining_stock" => $newAmount,
        "claim_document" => $documentName,
        "is_returnable" => $isReturnable,
        "expected_return_date" => $finalExpectedReturn,
        "borrowing_id" => $borrowingId
    ]);

} catch (Exception $e) {

    /*
     * Roll back database changes.
     */
    if ($conn->connect_errno === 0) {
        $conn->rollback();
    }

    /*
     * Delete uploaded document if the database operation failed.
     */
    if (isset($documentPath) && file_exists($documentPath)) {
        unlink($documentPath);
    }

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Unable to complete claim.",
        "error" => $e->getMessage()
    ]);
}

$conn->close();
?>
