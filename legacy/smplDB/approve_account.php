<?php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

require_once "db.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}

$data = json_decode(file_get_contents("php://input"), true);

$id = intval($data["id"] ?? 0);

if ($id <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid account ID."
    ]);
    exit;
}

$stmt = $conn->prepare("
    UPDATE users
    SET status = 'approved'
    WHERE id = ?
    AND status = 'pending'
");

$stmt->bind_param("i", $id);

if ($stmt->execute()) {

    if ($stmt->affected_rows > 0) {

        echo json_encode([
            "success" => true,
            "message" => "Account approved successfully."
        ]);

    } else {

        echo json_encode([
            "success" => false,
            "message" => "Account was not found or has already been processed."
        ]);
    }

} else {

    echo json_encode([
        "success" => false,
        "message" => "Unable to approve account."
    ]);
}

$stmt->close();
$conn->close();

?>