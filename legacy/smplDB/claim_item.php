<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: POST, OPTIONS");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "db.php";

try {

    // Get JSON request
    $input = json_decode(file_get_contents("php://input"), true);

    $claimCode = trim($input['claim_code'] ?? '');

    if ($claimCode === '') {
        echo json_encode([
            "success" => false,
            "message" => "Please enter a claim code."
        ]);
        exit;
    }

    // Claim codes are 6 digits
    if (!preg_match('/^\d{6}$/', $claimCode)) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid claim code. Enter a 6-digit code."
        ]);
        exit;
    }

    /*
     * Find an approved request using the claim code.
     *
     * claim_code_used = 0 means the item has not yet been claimed.
     */
    $sql = "
        SELECT
            sr.id,
            sr.amount,
            sr.status,
            sr.claim_code,
            sr.claim_code_used,
            sr.created_at,
            sr.expected_return_date,

            s.id AS stock_id,
            s.item_name,
            s.image,
            s.item_type,

            u.id AS user_id,
            u.name AS user_name,
            u.email
        FROM stock_requests sr
        INNER JOIN stocks s
            ON sr.stock_id = s.id
        INNER JOIN users u
            ON sr.user_id = u.id
        WHERE sr.claim_code = ?
          AND UPPER(TRIM(sr.status)) = 'APPROVED'
          AND sr.claim_code_used = 0
        LIMIT 1
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        throw new Exception("Database prepare failed: " . $conn->error);
    }

    $stmt->bind_param("s", $claimCode);
    $stmt->execute();

    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode([
            "success" => false,
            "message" => "Invalid, expired, or already used claim code."
        ]);
        exit;
    }

    $request = $result->fetch_assoc();

    echo json_encode([
        "success" => true,
        "message" => "Claim code verified.",
        "request" => [
            "id" => (int)$request['id'],
            "stock_id" => (int)$request['stock_id'],
            "item_name" => $request['item_name'],
            "amount" => (int)$request['amount'],
            "user_id" => (int)$request['user_id'],
            "user_name" => $request['user_name'],
            "email" => $request['email'],
            "status" => $request['status'],
            "created_at" => $request['created_at'],
            "image" => $request['image'],
            "item_type" => $request['item_type'] ?: "non_returnable",
            "expected_return_date" => $request['expected_return_date']
        ]
    ]);

    $stmt->close();

} catch (Exception $e) {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Server error.",
        "error" => $e->getMessage()
    ]);
}
?>
