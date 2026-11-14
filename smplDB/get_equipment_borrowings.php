<?php
session_start();

date_default_timezone_set("Asia/Manila");

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

$userId = $_SESSION["user_id"] ?? $_SESSION["id"] ?? $_SESSION["user"]["id"] ?? null;
$userRole = strtolower(trim($_SESSION["role"] ?? $_SESSION["user"]["role"] ?? ""));

if (!$userId) {
    http_response_code(401);
    echo json_encode(["success" => false, "message" => "Not authenticated."]);
    exit;
}

$statusFilter = trim($_GET["status"] ?? "all");
$search = trim($_GET["search"] ?? "");

$whereClauses = [];
$params = [];
$types = "";

// Non-admin users can only view their own borrowings
if ($userRole !== "admin") {
    $whereClauses[] = "b.user_id = ?";
    $params[] = (int)$userId;
    $types .= "i";
}

$today = date("Y-m-d");

if ($statusFilter !== "all" && $statusFilter !== "") {
    if (strtolower($statusFilter) === "overdue") {
        $whereClauses[] = "b.status = 'BORROWED' AND b.expected_return_date < ?";
        $params[] = $today;
        $types .= "s";
    } elseif (strtolower($statusFilter) === "due_soon") {
        // Due within next 2 days
        $dueSoonDate = date("Y-m-d", strtotime("+2 days"));
        $whereClauses[] = "b.status = 'BORROWED' AND b.expected_return_date >= ? AND b.expected_return_date <= ?";
        $params[] = $today;
        $params[] = $dueSoonDate;
        $types .= "ss";
    } elseif (strtolower($statusFilter) === "damaged_missing") {
        $whereClauses[] = "(b.status IN ('DAMAGED', 'MISSING') OR b.equipment_condition IN ('Damaged', 'Missing', 'Needs Maintenance'))";
    } elseif (strtolower($statusFilter) === "borrowed") {
        $whereClauses[] = "b.status = 'BORROWED'";
    } elseif (strtolower($statusFilter) === "returned") {
        $whereClauses[] = "b.status = 'RETURNED'";
    }
}

if ($search !== "") {
    $whereClauses[] = "(s.item_name LIKE ? OR u.name LIKE ? OR u.email LIKE ? OR b.asset_number LIKE ? OR b.serial_number LIKE ?)";
    $searchWild = "%" . $search . "%";
    for ($i = 0; $i < 5; $i++) {
        $params[] = $searchWild;
        $types .= "s";
    }
}

$whereSql = "";
if (count($whereClauses) > 0) {
    $whereSql = "WHERE " . implode(" AND ", $whereClauses);
}

$sql = "
    SELECT 
        b.id,
        b.request_id,
        b.stock_id,
        b.user_id,
        b.amount,
        b.asset_number,
        b.serial_number,
        b.borrowed_at,
        b.expected_return_date,
        b.actual_return_date,
        b.status,
        b.equipment_condition,
        b.received_by,
        b.remarks,
        b.created_at,
        s.item_name,
        s.image AS item_image,
        s.item_type,
        u.name AS borrower_name,
        u.email AS borrower_email
    FROM equipment_borrowings b
    INNER JOIN stocks s ON b.stock_id = s.id
    INNER JOIN users u ON b.user_id = u.id
    $whereSql
    ORDER BY 
        CASE 
            WHEN b.status = 'BORROWED' AND b.expected_return_date < '$today' THEN 1
            WHEN b.status = 'BORROWED' THEN 2
            ELSE 3
        END,
        b.borrowed_at DESC,
        b.id DESC
";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Database error: " . $conn->error]);
    exit;
}

if ($types !== "") {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$borrowings = [];
$stats = [
    "total" => 0,
    "borrowed" => 0,
    "due_soon" => 0,
    "overdue" => 0,
    "returned" => 0,
    "damaged_missing" => 0,
];

$dueSoonLimit = date("Y-m-d", strtotime("+2 days"));

while ($row = $result->fetch_assoc()) {
    $row["id"] = (int)$row["id"];
    $row["request_id"] = (int)$row["request_id"];
    $row["stock_id"] = (int)$row["stock_id"];
    $row["user_id"] = (int)$row["user_id"];
    $row["amount"] = (int)$row["amount"];

    // Compute dynamic display status
    $isOverdue = ($row["status"] === "BORROWED" && $row["expected_return_date"] < $today);
    $isDueSoon = ($row["status"] === "BORROWED" && $row["expected_return_date"] >= $today && $row["expected_return_date"] <= $dueSoonLimit);

    $row["is_overdue"] = $isOverdue;
    $row["is_due_soon"] = $isDueSoon;

    $borrowings[] = $row;
}

$stmt->close();

// Compute overall summary stats for filter counters
$statsQuery = "
    SELECT 
        COUNT(*) AS total,
        SUM(CASE WHEN b.status = 'BORROWED' THEN 1 ELSE 0 END) AS borrowed,
        SUM(CASE WHEN b.status = 'BORROWED' AND b.expected_return_date >= '$today' AND b.expected_return_date <= '$dueSoonLimit' THEN 1 ELSE 0 END) AS due_soon,
        SUM(CASE WHEN b.status = 'BORROWED' AND b.expected_return_date < '$today' THEN 1 ELSE 0 END) AS overdue,
        SUM(CASE WHEN b.status = 'RETURNED' THEN 1 ELSE 0 END) AS returned,
        SUM(CASE WHEN b.status IN ('DAMAGED', 'MISSING') OR b.equipment_condition IN ('Damaged', 'Missing', 'Needs Maintenance') THEN 1 ELSE 0 END) AS damaged_missing
    FROM equipment_borrowings b
";
if ($userRole !== "admin") {
    $statsQuery .= " WHERE b.user_id = " . (int)$userId;
}

$stRes = $conn->query($statsQuery);
if ($stRes && $stRow = $stRes->fetch_assoc()) {
    $stats = [
        "total" => (int)$stRow["total"],
        "borrowed" => (int)$stRow["borrowed"],
        "due_soon" => (int)$stRow["due_soon"],
        "overdue" => (int)$stRow["overdue"],
        "returned" => (int)$stRow["returned"],
        "damaged_missing" => (int)$stRow["damaged_missing"],
    ];
}

echo json_encode([
    "success" => true,
    "borrowings" => $borrowings,
    "stats" => $stats
]);

$conn->close();
?>
