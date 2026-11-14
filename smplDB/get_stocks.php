<?php
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
            id,
            item_name,
            amount,
            status,
            image,
            details,
            item_type,
            created_at
        FROM stocks
        ORDER BY created_at DESC, id DESC
    ";

    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception($conn->error);
    }

    $stocks = [];

    while ($row = $result->fetch_assoc()) {
        $stocks[] = [
            "id" => (string)$row["id"],
            "item_name" => $row["item_name"],
            "amount" => (string)$row["amount"],
            "status" => $row["status"],
            "image" => $row["image"],
            "details" => $row["details"],
            "item_type" => $row["item_type"] ?: "non_returnable",
            "created_at" => $row["created_at"]
        ];
    }

    echo json_encode($stocks);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>
