<?php
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "db.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

try {
    if (!isset($_SESSION["user_id"])) {
        echo json_encode([
            "success" => false,
            "message" => "User is not logged in."
        ]);
        exit;
    }

    $userId = $_SESSION["user_id"];

    $sql = "
        SELECT
            r.id,
            r.user_id,
            r.stock_id,
            r.amount,
            r.status,
            r.created_at,
            r.request_group_id,

            -- Claim code information
            r.claim_code,
            r.claim_code_used,
            r.claim_code_created_at,

            -- Claim/receipt information
            r.received_by,
            r.claimed_at,
            r.expected_return_date,

            s.item_name,
            s.image,
            s.item_type

        FROM stock_requests r
        INNER JOIN stocks s ON r.stock_id = s.id
        WHERE r.user_id = ?
        ORDER BY r.created_at DESC
    ";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $result = $stmt->get_result();

    $requests = [];

    while ($row = $result->fetch_assoc()) {
        $requests[] = [
            "id" => (int)$row["id"],
            "user_id" => (int)$row["user_id"],
            "stock_id" => (int)$row["stock_id"],
            "amount" => (int)$row["amount"],
            "status" => $row["status"],
            "created_at" => $row["created_at"],
            "request_group_id" => $row["request_group_id"],

            "claim_code" => $row["claim_code"],
            "claim_code_used" => (int)$row["claim_code_used"],
            "claim_code_created_at" => $row["claim_code_created_at"],

            "received_by" => $row["received_by"],
            "claimed_at" => $row["claimed_at"],
            "expected_return_date" => $row["expected_return_date"],

            "item_name" => $row["item_name"],
            "image" => $row["image"],
            "item_type" => $row["item_type"] ?: "non_returnable"
        ];
    }

    echo json_encode([
        "success" => true,
        "requests" => $requests
    ]);

    $stmt->close();

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>
