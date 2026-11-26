<?php

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

require_once "db.php";

// Handle CORS preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Only allow POST
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);

    echo json_encode([
        "success" => false,
        "message" => "Only POST requests are allowed."
    ]);

    exit;
}

$imageName = null;
$uploadDir = __DIR__ . "/uploads/stocks/";

try {

    // =========================
    // GET FORM DATA
    // =========================

    $item_name = trim($_POST["item_name"] ?? "");
    $amount = (int)($_POST["amount"] ?? 0);
    $details = trim($_POST["details"] ?? $_POST["description"] ?? "");
    $item_type = trim($_POST["item_type"] ?? "non_returnable");

    // Validate item_type
    if ($item_type !== "returnable" && $item_type !== "non_returnable") {
        $item_type = "non_returnable";
    }

    // =========================
    // VALIDATE DATA
    // =========================

    if ($item_name === "") {
        echo json_encode([
            "success" => false,
            "message" => "Item name is required."
        ]);
        exit;
    }

    if ($amount <= 0) {
        echo json_encode([
            "success" => false,
            "message" => "Amount must be greater than 0."
        ]);
        exit;
    }

    // =========================
    // IMAGE UPLOAD
    // =========================

    if (isset($_FILES["image"]) && $_FILES["image"]["error"] !== UPLOAD_ERR_NO_FILE) {

        $image = $_FILES["image"];

        if ($image["error"] !== UPLOAD_ERR_OK) {
            echo json_encode([
                "success" => false,
                "message" => "Image upload failed.",
                "error_code" => $image["error"]
            ]);
            exit;
        }

        if ($image["size"] > 5 * 1024 * 1024) {
            echo json_encode([
                "success" => false,
                "message" => "Image must be smaller than 5MB."
            ]);
            exit;
        }

        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $image["tmp_name"]);
        finfo_close($finfo);

        $allowedTypes = [
            "image/jpeg" => "jpg",
            "image/png"  => "png",
            "image/webp" => "webp",
            "image/gif"  => "gif"
        ];

        if (!array_key_exists($mimeType, $allowedTypes)) {
            echo json_encode([
                "success" => false,
                "message" => "Only JPG, PNG, WEBP, and GIF images are allowed."
            ]);
            exit;
        }

        if (!is_dir($uploadDir)) {
            if (!mkdir($uploadDir, 0777, true)) {
                echo json_encode([
                    "success" => false,
                    "message" => "Failed to create upload directory."
                ]);
                exit;
            }
        }

        $extension = $allowedTypes[$mimeType];
        $imageName = uniqid("stock_", true) . "." . $extension;
        $uploadPath = $uploadDir . $imageName;

        if (!move_uploaded_file($image["tmp_name"], $uploadPath)) {
            echo json_encode([
                "success" => false,
                "message" => "Failed to save image."
            ]);
            exit;
        }
    }

    // =========================
    // INSERT INTO DATABASE
    // =========================

    $status = "IN STOCK";

    $sql = "
        INSERT INTO stocks
        (
            item_name,
            amount,
            status,
            image,
            details,
            item_type,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        if ($imageName !== null) {
            $uploadedFile = $uploadDir . $imageName;
            if (file_exists($uploadedFile)) {
                unlink($uploadedFile);
            }
        }

        echo json_encode([
            "success" => false,
            "message" => "Failed to prepare database query.",
            "error" => $conn->error
        ]);
        exit;
    }

    $stmt->bind_param(
        "sissss",
        $item_name,
        $amount,
        $status,
        $imageName,
        $details,
        $item_type
    );

    // =========================
    // EXECUTE
    // =========================

    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "Stock added successfully.",
            "id" => $stmt->insert_id,
            "item_name" => $item_name,
            "amount" => $amount,
            "status" => $status,
            "image" => $imageName,
            "details" => $details,
            "item_type" => $item_type
        ]);
    } else {
        if ($imageName !== null) {
            $uploadedFile = $uploadDir . $imageName;
            if (file_exists($uploadedFile)) {
                unlink($uploadedFile);
            }
        }

        echo json_encode([
            "success" => false,
            "message" => "Failed to add stock.",
            "error" => $stmt->error
        ]);
    }

    $stmt->close();

} catch (Exception $e) {
    if ($imageName !== null) {
        $uploadedFile = $uploadDir . $imageName;
        if (file_exists($uploadedFile)) {
            unlink($uploadedFile);
        }
    }

    echo json_encode([
        "success" => false,
        "message" => "Server error.",
        "error" => $e->getMessage()
    ]);
}

$conn->close();
?>
