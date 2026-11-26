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
            name,
            email,
            phone,
            contract,
            created_at
        FROM suppliers
        ORDER BY id DESC
    ";

    $result = $conn->query($sql);

    if (!$result) {
        throw new Exception($conn->error);
    }

    $suppliers = [];

    while ($row = $result->fetch_assoc()) {
        $suppliers[] = $row;
    }

    echo json_encode([
        "success" => true,
        "suppliers" => $suppliers
    ]);

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}

$conn->close();
exit;