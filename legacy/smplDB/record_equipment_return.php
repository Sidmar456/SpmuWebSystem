<?php
session_start();

date_default_timezone_set("Asia/Manila");

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once "db.php";
require_once "notification_helper.php";

$userId = $_SESSION["user_id"] ?? $_SESSION["id"] ?? $_SESSION["user"]["id"] ?? null;
$userRole = strtolower(trim($_SESSION["role"] ?? $_SESSION["user"]["role"] ?? ""));
$staffName = trim($_SESSION["name"] ?? $_SESSION["user"]["name"] ?? "Admin Staff");

// Only staff / admin can record equipment returns
if (!$userId || $userRole !== "admin") {
    http_response_code(403);
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Only administrators and authorized staff can record equipment returns."
    ]);
    exit;
}

$input = json_decode(file_get_contents("php://input"), true);

$borrowingId = (int)($input["borrowing_id"] ?? 0);
$condition = trim($input["equipment_condition"] ?? "Good");
$receivedBy = trim($input["received_by"] ?? $staffName);
$remarks = trim($input["remarks"] ?? "");

if ($borrowingId <= 0) {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid borrowing ID."]);
    exit;
}

$validConditions = ["Good", "Damaged", "Needs Maintenance", "Missing"];
if (!in_array($condition, $validConditions)) {
    $condition = "Good";
}

if ($receivedBy === "") {
    $receivedBy = $staffName;
}

try {
    $conn->begin_transaction();

    // 1. Lock and fetch borrowing record
    $selectSql = "
        SELECT 
            b.id,
            b.request_id,
            b.stock_id,
            b.user_id,
            b.amount,
            b.status,
            s.item_name,
            s.amount AS stock_amount,
            u.name AS borrower_name
        FROM equipment_borrowings b
        INNER JOIN stocks s ON b.stock_id = s.id
        INNER JOIN users u ON b.user_id = u.id
        WHERE b.id = ?
        FOR UPDATE
    ";

    $stmt = $conn->prepare($selectSql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }

    $stmt->bind_param("i", $borrowingId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        $stmt->close();
        $conn->rollback();
        http_response_code(404);
        echo json_encode(["success" => false, "message" => "Borrowing record not found."]);
        exit;
    }

    $borrowing = $result->fetch_assoc();
    $stmt->close();

    // Check if already returned
    if ($borrowing["status"] === "RETURNED") {
        $conn->rollback();
        http_response_code(400);
        echo json_encode([
            "success" => false,
            "message" => "This equipment borrowing record has already been confirmed as returned."
        ]);
        exit;
    }

    $stockId = (int)$borrowing["stock_id"];
    $borrowAmount = (int)$borrowing["amount"];
    $borrowerId = (int)$borrowing["user_id"];
    $itemName = $borrowing["item_name"];

    // 2. Determine new status
    $newStatus = "RETURNED";
    if ($condition === "Missing") {
        $newStatus = "MISSING";
    } elseif ($condition === "Damaged") {
        $newStatus = "DAMAGED";
    }

    // 3. Update the borrowing record
    $updateBorrowSql = "
        UPDATE equipment_borrowings
        SET 
            actual_return_date = NOW(),
            status = ?,
            equipment_condition = ?,
            received_by = ?,
            remarks = ?,
            updated_at = NOW()
        WHERE id = ? AND status = 'BORROWED'
    ";

    $upStmt = $conn->prepare($updateBorrowSql);
    if (!$upStmt) {
        throw new Exception("Prepare update failed: " . $conn->error);
    }

    $upStmt->bind_param("ssssi", $newStatus, $condition, $receivedBy, $remarks, $borrowingId);
    if (!$upStmt->execute() || $upStmt->affected_rows === 0) {
        throw new Exception("Unable to update borrowing record. It may already be returned.");
    }
    $upStmt->close();

    // 4. Stock restoration rule:
    // When returned in "Good" condition, restore available quantity to stocks.
    // Damaged, Needs Maintenance, or Missing equipment remains unavailable until staff repairs/clears it.
    $stockRestored = false;
    if ($condition === "Good") {
        $stockUpdateSql = "
            UPDATE stocks
            SET 
                amount = amount + ?,
                status = CASE 
                    WHEN (amount + ?) > 10 THEN 'IN STOCK' 
                    WHEN (amount + ?) > 0 THEN 'LOW STOCK' 
                    ELSE 'OUT OF STOCK' 
                END
            WHERE id = ?
        ";

        $stkStmt = $conn->prepare($stockUpdateSql);
        if (!$stkStmt) {
            throw new Exception("Stock update prepare failed: " . $conn->error);
        }

        $stkStmt->bind_param("iiii", $borrowAmount, $borrowAmount, $borrowAmount, $stockId);
        if (!$stkStmt->execute()) {
            throw new Exception("Failed to restore stock quantity: " . $stkStmt->error);
        }
        $stkStmt->close();
        $stockRestored = true;
    }

    $conn->commit();

    // 5. Send confirmation notification to the borrower
    try {
        $msg = "Your return of {$borrowAmount} unit(s) of '{$itemName}' was confirmed in {$condition} condition by {$receivedBy}.";
        createNotification($conn, $borrowerId, "Equipment Return Confirmed", $msg, "equipment_returned", $borrowingId);
    } catch (Throwable $e) {
        error_log("Return notification error: " . $e->getMessage());
    }

    echo json_encode([
        "success" => true,
        "message" => "Equipment return successfully recorded.",
        "condition" => $condition,
        "stock_restored" => $stockRestored,
        "received_by" => $receivedBy,
        "return_date" => date("Y-m-d H:i:s")
    ]);

} catch (Exception $e) {
    if ($conn->connect_errno === 0) {
        $conn->rollback();
    }

    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to record equipment return: " . $e->getMessage()
    ]);
}

$conn->close();
?>
