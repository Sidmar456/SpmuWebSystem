<?php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "db.php";

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request method."
    ]);
    exit;
}

$input = json_decode(
    file_get_contents("php://input"),
    true
);

$id = isset($input["id"]) ? intval($input["id"]) : 0;

if ($id <= 0) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid supplier ID."
    ]);
    exit;
}

try {

    // Check if supplier exists
    $check = $conn->prepare(
        "SELECT id FROM suppliers WHERE id = ?"
    );

    $check->bind_param("i", $id);
    $check->execute();
    $result = $check->get_result();

    if ($result->num_rows === 0) {
        $check->close();

        echo json_encode([
            "success" => false,
            "message" => "Supplier not found."
        ]);

        exit;
    }

    $check->close();

    // Delete supplier
    $stmt = $conn->prepare(
        "DELETE FROM suppliers WHERE id = ?"
    );

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param("i", $id);

    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    $stmt->close();
    $conn->close();

    echo json_encode([
        "success" => true,
        "message" => "Supplier removed successfully."
    ]);

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);
}