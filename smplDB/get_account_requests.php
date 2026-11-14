<?php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

require_once "db.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}

$sql = "
    SELECT 
        id,
        name,
        email,
        role,
        status,
        created_at
    FROM users
    WHERE status = 'pending'
    ORDER BY created_at DESC
";

$result = $conn->query($sql);

if (!$result) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $conn->error
    ]);
    exit;
}

$requests = [];

while ($row = $result->fetch_assoc()) {
    $requests[] = $row;
}

echo json_encode([
    "success" => true,
    "requests" => $requests
]);

$conn->close();

?>