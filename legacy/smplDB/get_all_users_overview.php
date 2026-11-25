<?php
session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once "db.php";

try {
    // 1. Fetch only regular users (EXCLUDE admin accounts)
    $usersSql = "
        SELECT 
            id,
            name,
            email,
            role,
            status,
            created_at
        FROM users
        WHERE LOWER(TRIM(role)) != \x27admin\x27
        ORDER BY name ASC
    ";

    $usersResult = $conn->query($usersSql);

    if (!$usersResult) {
        throw new Exception("Users query failed: " . $conn->error);
    }

    $users = [];
    while ($row = $usersResult->fetch_assoc()) {
        $users[] = [
            "id" => (int)$row["id"],
            "name" => $row["name"],
            "email" => $row["email"],
            "role" => $row["role"],
            "status" => $row["status"],
            "created_at" => $row["created_at"]
        ];
    }

    $requestsSql = "
        SELECT
            r.id,
            r.user_id,
            r.stock_id,
            r.amount,
            r.status,
            r.created_at,
            r.request_group_id,
            r.claim_code,
            r.claim_code_used,
            r.claim_code_created_at,
            r.received_by,
            r.claimed_at,
            r.claim_document,
            s.item_name,
            s.image AS item_image,
            u.name AS user_name,
            u.email AS user_email
        FROM stock_requests r
        INNER JOIN users u ON r.user_id = u.id
        LEFT JOIN stocks s ON r.stock_id = s.id
        WHERE LOWER(TRIM(u.role)) != \x27admin\x27
        ORDER BY r.created_at DESC, r.id DESC
    ";

    $requestsResult = $conn->query($requestsSql);

    if (!$requestsResult) {
        throw new Exception("Requests query failed: " . $conn->error);
    }

    $requests = [];
    while ($row = $requestsResult->fetch_assoc()) {
        $requests[] = [
            "id" => (int)$row["id"],
            "user_id" => (int)$row["user_id"],
            "stock_id" => (int)$row["stock_id"],
            "amount" => (int)$row["amount"],
            "status" => $row["status"],
            "created_at" => $row["created_at"],
            "request_group_id" => $row["request_group_id"],
            "claim_code" => $row["claim_code"],
            "claim_code_used" => (int)$row["claim_code_used"],
            "claim_code_created_at" => $row["claim_code_created_at"],
            "received_by" => $row["received_by"],
            "claimed_at" => $row["claimed_at"],
            "claim_document" => $row["claim_document"] ?? null,
            "item_name" => $row["item_name"] ?? "Item",
            "item_image" => $row["item_image"] ?? null,
            "user_name" => $row["user_name"],
            "user_email" => $row["user_email"]
        ];
    }

    echo json_encode([
        "success" => true,
        "users" => $users,
        "requests" => $requests
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Unable to load users overview data.",
        "error" => $e->getMessage()
    ]);
}

$conn->close();
?>