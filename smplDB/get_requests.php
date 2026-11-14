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
    $sql = "
    SELECT
        r.id,
        r.user_id,
        r.stock_id,
        r.amount,
        r.status,
        r.created_at,
        r.request_group_id,
        r.claim_code,
        r.expected_return_date,
        u.name AS user_name,
        u.email AS email,
        s.item_name,
        s.image,
        s.item_type
    FROM stock_requests r
    INNER JOIN users u
        ON r.user_id = u.id
    INNER JOIN stocks s
        ON r.stock_id = s.id
    WHERE UPPER(r.status) = 'PENDING'
    ORDER BY r.created_at DESC, r.id DESC
    ";

    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception($conn->error);
    }

    $requests = [];

    while ($row = $result->fetch_assoc()) {
        $row["item_type"] = $row["item_type"] ?: "non_returnable";
        $requests[] = $row;
    }

    echo json_encode([
        "success" => true,
        "requests" => $requests
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>
