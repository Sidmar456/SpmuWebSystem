<?php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "db.php";

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$id = isset($_GET['id']) ? (int)$_GET['id'] : 0;

if ($id <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid stock ID."
    ]);
    exit;
}

try {
    $stmt = $conn->prepare("SELECT * FROM stocks WHERE id = ? LIMIT 1");
    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode([
            "success" => false,
            "message" => "Stock item not found."
    ]);
    exit;
}

    $stock = $result->fetch_assoc();

    echo json_encode([
        "success" => true,
        "stock" => $stock
    ]);

    $stmt->close();
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
?>