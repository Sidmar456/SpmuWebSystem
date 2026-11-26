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

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Only POST requests are allowed."
    ]);
    exit;
}

require_once "db.php";
require_once "notification_helper.php";

function respond($success, $message, $statusCode = 200, $extra = [])
{
    http_response_code($statusCode);

    echo json_encode(array_merge([
        "success" => $success,
        "message" => $message
    ], $extra));

    exit;
}

if (!isset($conn) || !($conn instanceof mysqli)) {
    error_log("request_stock.php: MySQLi connection \$conn is unavailable.");
    respond(false, "Database connection failed.", 500);
}

// Support common session structures.
$userId = $_SESSION["user_id"]
    ?? $_SESSION["id"]
    ?? $_SESSION["user"]["id"]
    ?? null;

$userName = $_SESSION["name"]
    ?? $_SESSION["user"]["name"]
    ?? null;

if (!$userId || !is_numeric($userId)) {
    respond(false, "Your session has expired. Please log in again.", 401);
}

$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    respond(false, "Invalid request data.", 400);
}

// Optional overall expected return date from request payload
$defaultExpectedReturn = !empty($data["expected_return_date"]) ? trim($data["expected_return_date"]) : null;

/*
 * Accept both:
 * Multiple items:
 * {
 *   "items": [
 *     {"stock_id": 1, "amount": 2, "expected_return_date": "2026-11-05"},
 *     {"stock_id": 2, "amount": 3}
 *   ]
 * }
 * Legacy single-item request:
 * {
 *   "stock_id": 1,
 *   "amount": 2
 * }
 */
if (isset($data["items"])) {
    if (!is_array($data["items"]) || count($data["items"]) === 0) {
        respond(false, "Please select at least one stock item.", 400);
    }
    $requestedItems = $data["items"];
} elseif (isset($data["stock_id"], $data["amount"])) {
    $requestedItems = [[
        "stock_id" => $data["stock_id"],
        "amount" => $data["amount"],
        "expected_return_date" => $defaultExpectedReturn
    ]];
} else {
    respond(false, "Invalid request. Please select your stock items again.", 400);
}

// Validate the request before inserting anything.
$itemsByStockId = [];
$returnDatesByStockId = [];

foreach ($requestedItems as $item) {
    if (!is_array($item)) {
        respond(false, "Invalid item information.", 400);
    }

    $stockId = filter_var($item["stock_id"] ?? null, FILTER_VALIDATE_INT);
    $amount = filter_var($item["amount"] ?? null, FILTER_VALIDATE_INT);
    $expDate = !empty($item["expected_return_date"]) ? trim($item["expected_return_date"]) : $defaultExpectedReturn;

    if ($stockId === false || $stockId === null || $stockId < 1) {
        respond(false, "Invalid stock item selected.", 400);
    }

    if ($amount === false || $amount === null || $amount < 1) {
        respond(false, "Every requested quantity must be at least 1.", 400);
    }

    if (!isset($itemsByStockId[$stockId])) {
        $itemsByStockId[$stockId] = 0;
    }
    $itemsByStockId[$stockId] += $amount;

    if ($expDate) {
        $returnDatesByStockId[$stockId] = $expDate;
    }
}

try {
    $conn->begin_transaction();

    /*
     * Check that each stock item exists, is available,
     * retrieve authoritative item_type from database,
     * and check quantity.
     */
    $checkStock = $conn->prepare(
        "SELECT amount, status, item_type
         FROM stocks
         WHERE id = ?
         FOR UPDATE"
    );

    if (!$checkStock) {
        throw new Exception("Unable to prepare stock validation.");
    }

    $stockInfoMap = [];

    foreach ($itemsByStockId as $stockId => $requestedAmount) {
        $checkStock->bind_param("i", $stockId);
        $checkStock->execute();

        $result = $checkStock->get_result();
        $stock = $result->fetch_assoc();

        if (!$stock) {
            $conn->rollback();
            respond(false, "One of the selected stock items no longer exists.", 400);
        }

        $availableAmount = (int) $stock["amount"];
        $stockStatus = strtoupper(trim((string) $stock["status"]));

        if ($stockStatus === "OUT OF STOCK" || $availableAmount < 1) {
            $conn->rollback();
            respond(false, "One of the selected items is no longer in stock.", 400);
        }

        if ($requestedAmount > $availableAmount) {
            $conn->rollback();
            respond(
                false,
                "The requested quantity exceeds the available stock. Please refresh and try again.",
                400
            );
        }

        $stockInfoMap[$stockId] = $stock;
    }

    $checkStock->close();

    /*
     * Create one stock_requests row per item.
     * All rows are saved together in one transaction.
     */
    $insertRequest = $conn->prepare(
        "INSERT INTO stock_requests
        (user_id, stock_id, amount, status, created_at, request_group_id, expected_return_date)
        VALUES (?, ?, ?, 'Pending', NOW(), ?, ?)"
    );

    if (!$insertRequest) {
        throw new Exception("Unable to prepare stock request insertion.");
    }

    $userId = (int) $userId;

    // Generate ONE group ID for this entire submission.
    $requestGroupId = bin2hex(random_bytes(16));

    foreach ($itemsByStockId as $stockId => $requestedAmount) {
        $stockItemType = $stockInfoMap[$stockId]["item_type"] ?? "non_returnable";
        
        // Compute expected return date for returnables
        $itemExpDate = null;
        if ($stockItemType === "returnable") {
            $customDate = $returnDatesByStockId[$stockId] ?? null;
            if ($customDate && preg_match('/^\d{4}-\d{2}-\d{2}$/', $customDate)) {
                $itemExpDate = $customDate;
            } else {
                // Default 7 days loan period if not specified
                $itemExpDate = date("Y-m-d", strtotime("+7 days"));
            }
        }

        $insertRequest->bind_param(
            "iiiss",
            $userId,
            $stockId,
            $requestedAmount,
            $requestGroupId,
            $itemExpDate
        );

        if (!$insertRequest->execute()) {
            throw new Exception(
                "Unable to save stock request: " . $insertRequest->error
            );
        }
    }

    $insertRequest->close();

    $conn->commit();

    // Notify all administrators about the new request
    try {
        if (!$userName && $userId) {
            $uStmt = $conn->prepare("SELECT name FROM users WHERE id = ?");
            if ($uStmt) {
                $uStmt->bind_param("i", $userId);
                $uStmt->execute();
                $uRow = $uStmt->get_result()->fetch_assoc();
                if ($uRow && !empty($uRow["name"])) {
                    $userName = $uRow["name"];
                }
                $uStmt->close();
            }
        }

        $requesterName = $userName ?: "A user";
        $itemCount = count($itemsByStockId);
        $itemWord = $itemCount === 1 ? "item" : "items";
        $title = "New Request from {$requesterName}";
        $message = "{$requesterName} submitted a request for {$itemCount} {$itemWord}.";

        $adminIds = getAdminUserIds($conn);
        foreach ($adminIds as $adminId) {
            createNotification(
                $conn,
                $adminId,
                $title,
                $message,
                "new_request",
                null
            );
        }
    } catch (Throwable $notifErr) {
        error_log("Notification error (new request): " . $notifErr->getMessage());
    }

    respond(
        true,
        "Your stock request has been submitted successfully.",
        200,
        ["item_count" => count($itemsByStockId)]
    );
} catch (Throwable $error) {
    try {
        $conn->rollback();
    } catch (Throwable $ignored) {
    }

    error_log("Bulk stock request error: " . $error->getMessage());

    respond(
        false,
        "Unable to submit your stock request. Please check the database configuration.",
        500
    );
}
?>
