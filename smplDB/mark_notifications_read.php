<?php
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once "db.php";

$userId = $_SESSION["user_id"]
    ?? $_SESSION["id"]
    ?? $_SESSION["user"]["id"]
    ?? null;

if (!$userId || !is_numeric($userId)) {
    echo json_encode(["success" => false, "message" => "Not authenticated."]);
    exit;
}

$userId = (int) $userId;

$data = json_decode(file_get_contents("php://input"), true);

if (isset($data["notification_id"])) {
    // Mark a single notification as read
    $notifId = (int) $data["notification_id"];
    $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?");
    $stmt->bind_param("ii", $notifId, $userId);
    $stmt->execute();
    $stmt->close();
} else {
    // Mark all notifications as read
    $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0");
    $stmt->bind_param("i", $userId);
    $stmt->execute();
    $stmt->close();
}

echo json_encode(["success" => true, "message" => "Notifications marked as read."]);
?>