<?php
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
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

// Get notifications for the user, ordered by most recent
$stmt = $conn->prepare(
    "SELECT id, title, message, type, is_read, reference_id, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50"
);

$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$notifications = [];
while ($row = $result->fetch_assoc()) {
    $row["id"] = (int) $row["id"];
    $row["is_read"] = (bool) $row["is_read"];
    $row["reference_id"] = $row["reference_id"] ? (int) $row["reference_id"] : null;
    $notifications[] = $row;
}

$stmt->close();

// Get unread count
$countStmt = $conn->prepare(
    "SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = ? AND is_read = 0"
);
$countStmt->bind_param("i", $userId);
$countStmt->execute();
$countResult = $countStmt->get_result()->fetch_assoc();
$unreadCount = (int) $countResult["unread_count"];
$countStmt->close();

echo json_encode([
    "success" => true,
    "notifications" => $notifications,
    "unread_count" => $unreadCount
]);
?>