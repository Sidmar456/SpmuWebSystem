<?php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "db.php";

// Total number of stock items
$totalStockQuery = $conn->query("
    SELECT COUNT(*) AS total_stock
    FROM stocks
");

$totalStock = $totalStockQuery->fetch_assoc()["total_stock"];

// New stocks added THIS WEEK
// Week starts on Monday
$newStockQuery = $conn->query("
    SELECT COUNT(*) AS new_stock
    FROM stocks
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
");

$newStock = $newStockQuery->fetch_assoc()["new_stock"];

// Total number of out-of-stock items
$outOfStockQuery = $conn->query("
    SELECT COUNT(*) AS out_of_stock
    FROM stocks
    WHERE UPPER(status) = 'OUT OF STOCK'
");

$outOfStock = $outOfStockQuery->fetch_assoc()["out_of_stock"];

echo json_encode([
    "total_stock" => (int) $totalStock,
    "new_stock" => (int) $newStock,
    "out_of_stock" => (int) $outOfStock
]);

$conn->close();

?>