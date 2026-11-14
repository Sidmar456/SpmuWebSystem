<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once "db.php";

try {
    $sql = "
        SELECT
            sr.id,
            sr.amount,
            sr.status,
            sr.claim_code,
            sr.claim_document,
            sr.created_at,
            sr.received_by,
            sr.claimed_at,
            s.item_name,
            s.image AS item_image,
            u.id AS user_id,
            u.name AS user_name,
            u.email
        FROM stock_requests sr
        INNER JOIN stocks s
            ON sr.stock_id = s.id
        INNER JOIN users u
            ON sr.user_id = u.id
        WHERE UPPER(TRIM(sr.status)) = 'COMPLETED'
        ORDER BY sr.claimed_at DESC, sr.id DESC
    ";
    // replace double single quote with single quote
    $sql = str_replace("'", "\x27", $sql);

    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception("Database query failed: " . $conn->error);
    }

    $transactions = [];

    while ($row = $result->fetch_assoc()) {
        $transactions[] = [
            "id" => (int)$row["id"],
            "user_id" => (int)$row["user_id"],
            "item_name" => $row["item_name"],
            "item_image" => $row["item_image"] ?? null,
            "amount" => (int)$row["amount"],
            "user_name" => $row["user_name"],
            "email" => $row["email"],
            "received_by" => $row["received_by"],
            "claim_code" => $row["claim_code"],
            "claim_document" => $row["claim_document"] ?? null,
            "status" => $row["status"],
            "created_at" => $row["created_at"],
            "claimed_at" => $row["claimed_at"]
        ];
    }

    echo json_encode([
        "success" => true,
        "transactions" => $transactions
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unable to load transactions.",
        "error" => $e->getMessage()
    ]);
}
?>