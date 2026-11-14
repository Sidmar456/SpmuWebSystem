<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "db.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}

try {
    $query = $conn->query("
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
        WHERE amount > 0
          AND UPPER(status) != 'OUT OF STOCK'
        ORDER BY item_name ASC
    ");

    $stocks = [];

    while ($row = $query->fetch_assoc()) {
        $row["item_type"] = $row["item_type"] ?: "non_returnable";
        $stocks[] = $row;
    }

    echo json_encode([
        "success" => true,
        "stocks" => $stocks
    ]);

} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>
