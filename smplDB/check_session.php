<?php

session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    exit;
}

if (isset($_SESSION["user_id"])) {

    echo json_encode([
        "success" => true,
        "user" => [
            "id" => $_SESSION["user_id"],
            "name" => $_SESSION["name"],
            "email" => $_SESSION["email"],
            "role" => $_SESSION["role"]
        ]
    ]);

} else {

    echo json_encode([
        "success" => false,
        "message" => "Not logged in."
    ]);

}

?>