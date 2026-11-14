<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once "db.php";

try {
    $input = json_decode(file_get_contents("php://input"), true);
    
    // Support JSON or POST FormData
    $id = (int)($input["id"] ?? $_POST["id"] ?? 0);
    $amount = isset($input["amount"]) ? (int)$input["amount"] : (isset($_POST["amount"]) ? (int)$_POST["amount"] : -1);
    $details = trim($input["details"] ?? $_POST["details"] ?? "");
    $itemName = trim($input["item_name"] ?? $_POST["item_name"] ?? "");
    $newItemType = isset($input["item_type"]) ? trim($input["item_type"]) : (isset($_POST["item_type"]) ? trim($_POST["item_type"]) : null);

    if ($id <= 0) {
        echo json_encode([
            "success" => false,
            "message" => "Valid stock ID is required."
        ]);
        exit;
    }

    if ($amount < 0) {
        echo json_encode([
            "success" => false,
            "message" => "Amount cannot be negative."
        ]);
        exit;
    }

    // Fetch existing item
    $checkStmt = $conn->prepare("SELECT id, item_name, details, item_type FROM stocks WHERE id = ?");
    $checkStmt->bind_param("i", $id);
    $checkStmt->execute();
    $existing = $checkStmt->get_result()->fetch_assoc();
    $checkStmt->close();

    if (!$existing) {
        echo json_encode([
            "success" => false,
            "message" => "Stock item does not exist."
        ]);
        exit;
    }

    $finalItemType = $existing["item_type"] ?: "non_returnable";

    if ($newItemType !== null && in_array($newItemType, ["returnable", "non_returnable"])) {
        // Validation: If changing from returnable to non_returnable, prevent if there are active loans
        if ($existing["item_type"] === "returnable" && $newItemType === "non_returnable") {
            $loanCheck = $conn->prepare("SELECT COUNT(*) AS active_loans FROM equipment_borrowings WHERE stock_id = ? AND status = 'BORROWED'");
            if ($loanCheck) {
                $loanCheck->bind_param("i", $id);
                $loanCheck->execute();
                $loanRes = $loanCheck->get_result()->fetch_assoc();
                $loanCheck->close();

                if ($loanRes && (int)$loanRes["active_loans"] > 0) {
                    echo json_encode([
                        "success" => false,
                        "message" => "Cannot change classification to Non-Returnable while there are active borrowed units for this equipment (" . $loanRes["active_loans"] . " active loan(s)). Please resolve all active returns first."
                    ]);
                    exit;
                }
            }
        }
        $finalItemType = $newItemType;
    }

    // Determine status automatically based on quantity
    $status = ($amount == 0) ? "OUT OF STOCK" : (($amount <= 10) ? "LOW STOCK" : "IN STOCK");
    $finalName = ($itemName !== "") ? $itemName : $existing["item_name"];

    $updateStmt = $conn->prepare("
        UPDATE stocks 
        SET amount = ?, status = ?, details = ?, item_name = ?, item_type = ?
        WHERE id = ?
    ");
    $updateStmt->bind_param("issssi", $amount, $status, $details, $finalName, $finalItemType, $id);

    if ($updateStmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Stock updated successfully.",
            "stock" => [
                "id" => $id,
                "item_name" => $finalName,
                "amount" => $amount,
                "status" => $status,
                "details" => $details,
                "item_type" => $finalItemType
            ]
        ]);
    } else {
        throw new Exception($updateStmt->error);
    }

    $updateStmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unable to update stock.",
        "error" => $e->getMessage()
    ]);
}

$conn->close();
?>
