<?php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

header("Content-Type: application/json");

require_once "db.php";

try {

    // Low stock
    $lowStockQuery = $conn->query("
        SELECT COUNT(*) AS low_stock
        FROM stocks
        WHERE amount <= 10
    ");

    $lowStock = $lowStockQuery->fetch_assoc()["low_stock"];


    // Items in stock
    $inStockQuery = $conn->query("
        SELECT COUNT(*) AS in_stock
        FROM stocks
        WHERE UPPER(status) != 'OUT OF STOCK'
    ");

    $inStock = $inStockQuery->fetch_assoc()["in_stock"];


    // Pending requests
    $pendingQuery = $conn->query("
        SELECT COUNT(*) AS pending_requests
        FROM stocks
        WHERE UPPER(status) = 'PENDING REQUEST'
    ");

    $pendingRequests =
        $pendingQuery->fetch_assoc()["pending_requests"];


    echo json_encode([
        "success" => true,
        "low_stock" => (int)$lowStock,
        "in_stock" => (int)$inStock,
        "pending_requests" => (int)$pendingRequests
    ]);

} catch (Exception $e) {

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}