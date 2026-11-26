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

$name = isset($input["name"])
    ? trim($input["name"])
    : "";

$email = isset($input["email"])
    ? trim($input["email"])
    : "";

$phone = isset($input["phone"])
    ? trim($input["phone"])
    : "";

$contract = isset($input["contract"])
    ? trim($input["contract"])
    : "";

if ($name === "") {
    echo json_encode([
        "success" => false,
        "message" => "Supplier name is required."
    ]);
    exit;
}

if ($email === "") {
    echo json_encode([
        "success" => false,
        "message" => "Supplier email is required."
    ]);
    exit;
}

if ($phone === "") {
    echo json_encode([
        "success" => false,
        "message" => "Contact number is required."
    ]);
    exit;
}

if ($contract === "") {
    echo json_encode([
        "success" => false,
        "message" => "Contract information is required."
    ]);
    exit;
}

try {

    $sql = "
        INSERT INTO suppliers
        (name, email, phone, contract)
        VALUES (?, ?, ?, ?)
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception($conn->error);
    }

    $stmt->bind_param(
        "ssss",
        $name,
        $email,
        $phone,
        $contract
    );

    if (!$stmt->execute()) {
        throw new Exception($stmt->error);
    }

    $supplierId = $stmt->insert_id;

    $stmt->close();
    $conn->close();

    echo json_encode([
        "success" => true,
        "message" => "Supplier added successfully.",
        "supplier" => [
            "id" => $supplierId,
            "name" => $name,
            "email" => $email,
            "phone" => $phone,
            "contract" => $contract
        ]
    ]);

    exit;

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => $e->getMessage()
    ]);

    exit;
}