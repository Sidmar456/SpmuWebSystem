<?php

require_once "db.php";

$name = "Test User";
$email = "testuser@example.com";
$password = "Test1234!";
$role = "user";

$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

$stmt = $conn->prepare("
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, ?)
");

$stmt->bind_param(
    "ssss",
    $name,
    $email,
    $hashedPassword,
    $role
);

if ($stmt->execute()) {
    echo "Account created successfully!<br><br>";
    echo "Name: $name<br>";
    echo "Email: $email<br>";
    echo "Password: $password<br>";
    echo "Role: $role";
} else {
    echo "Error: " . $stmt->error;
}

$stmt->close();
$conn->close();
?>