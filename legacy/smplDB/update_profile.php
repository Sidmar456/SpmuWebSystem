
<?php

session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once "db.php";

// Make sure user is logged in
if (!isset($_SESSION['user_id'])) {
    echo json_encode([
        "success" => false,
        "message" => "Unauthorized. Please log in first."
    ]);
    exit;
}

$user_id = (int) $_SESSION['user_id'];

// Read JSON request
$data = json_decode(file_get_contents("php://input"), true);

$name = trim($data['name'] ?? "");
$email = trim($data['email'] ?? "");
$current_password = $data['current_password'] ?? "";
$new_password = $data['new_password'] ?? "";

// Validate name and email
if ($name === "" || $email === "") {
    echo json_encode([
        "success" => false,
        "message" => "Name and email are required."
    ]);
    exit;
}

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid email format."
    ]);
    exit;
}

// Get current user
$stmt = $conn->prepare(
    "SELECT id, name, email, password, role
     FROM users
     WHERE id = ?
     LIMIT 1"
);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("i", $user_id);
$stmt->execute();

$result = $stmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "User not found."
    ]);
    $stmt->close();
    exit;
}

$user = $result->fetch_assoc();
$stmt->close();

// Check if email belongs to another account
$stmt = $conn->prepare(
    "SELECT id
     FROM users
     WHERE email = ?
     AND id != ?
     LIMIT 1"
);

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Database error: " . $conn->error
    ]);
    exit;
}

$stmt->bind_param("si", $email, $user_id);
$stmt->execute();

$emailResult = $stmt->get_result();

if ($emailResult->num_rows > 0) {
    echo json_encode([
        "success" => false,
        "message" => "Email address is already in use by another account."
    ]);
    $stmt->close();
    exit;
}

$stmt->close();

// Determine whether password should be changed
$changePassword = false;
$hashedPassword = $user['password'];

if ($new_password !== "") {

    // New password must be at least 6 characters
    if (strlen($new_password) < 6) {
        echo json_encode([
            "success" => false,
            "message" => "New password must be at least 6 characters long."
        ]);
        exit;
    }

    // Current password is required
    if ($current_password === "") {
        echo json_encode([
            "success" => false,
            "message" => "Current password is required to change your password."
        ]);
        exit;
    }

    // Verify current password
    if (!password_verify($current_password, $user['password'])) {
        echo json_encode([
            "success" => false,
            "message" => "Incorrect current password."
        ]);
        exit;
    }

    $changePassword = true;
    $hashedPassword = password_hash($new_password, PASSWORD_DEFAULT);
}

// Update database
if ($changePassword) {

    $stmt = $conn->prepare(
        "UPDATE users
         SET name = ?, email = ?, password = ?
         WHERE id = ?"
    );

    if (!$stmt) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $conn->error
        ]);
        exit;
    }

    $stmt->bind_param(
        "sssi",
        $name,
        $email,
        $hashedPassword,
        $user_id
    );

} else {

    $stmt = $conn->prepare(
        "UPDATE users
         SET name = ?, email = ?
         WHERE id = ?"
    );

    if (!$stmt) {
        echo json_encode([
            "success" => false,
            "message" => "Database error: " . $conn->error
        ]);
        exit;
    }

    $stmt->bind_param(
        "ssi",
        $name,
        $email,
        $user_id
    );
}

// Execute update
if ($stmt->execute()) {

    // Update session information
    $_SESSION['name'] = $name;
    $_SESSION['email'] = $email;

    echo json_encode([
        "success" => true,
        "message" => "Profile updated successfully.",
        "user" => [
            "id" => $user_id,
            "name" => $name,
            "email" => $email,
            "role" => $user['role']
        ]
    ]);

} else {

    echo json_encode([
        "success" => false,
        "message" => "Failed to update profile: " . $stmt->error
    ]);
}

$stmt->close();
$conn->close();

?>

