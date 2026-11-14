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
    // 1. Overall Inventory Totals
    $stockSummaryQuery = $conn->query("
        SELECT 
            COALESCE(SUM(amount), 0) AS total_units,
            COUNT(*) AS total_items
        FROM stocks
    ");
    $stockSummary = $stockSummaryQuery->fetch_assoc();

    // 2. Overall Request Totals
    $reqSummaryQuery = $conn->query("
        SELECT
            COUNT(*) AS total_requests,
            COALESCE(SUM(amount), 0) AS total_units_requested,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27COMPLETED\x27 THEN 1 ELSE 0 END), 0) AS completed_requests,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27COMPLETED\x27 THEN amount ELSE 0 END), 0) AS completed_units,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27PENDING\x27 THEN 1 ELSE 0 END), 0) AS pending_requests,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27PENDING\x27 THEN amount ELSE 0 END), 0) AS pending_units,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27APPROVED\x27 THEN 1 ELSE 0 END), 0) AS approved_requests,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27APPROVED\x27 THEN amount ELSE 0 END), 0) AS approved_units
        FROM stock_requests
    ");
    $reqSummary = $reqSummaryQuery->fetch_assoc();

    // 3. Daily Breakdown (Last 7 Days)
    $daily = [];
    for ($i = 6; $i >= 0; $i--) {
        $dateStr = date("Y-m-d", strtotime("-$i days"));
        $dayLabel = date("D, M j", strtotime("-$i days"));
        $shortDay = date("D", strtotime("-$i days"));

        $daily[$dateStr] = [
            "date" => $dateStr,
            "label" => $dayLabel,
            "short" => $shortDay,
            "items_in_stock" => (int)$stockSummary["total_units"],
            "total_requests" => 0,
            "completed" => 0,
            "pending" => 0,
            "approved" => 0,
            "units_requested" => 0,
            "units_completed" => 0
        ];
    }

    $dailyReqQuery = $conn->query("
        SELECT 
            DATE(created_at) AS req_date,
            COUNT(*) AS total_requests,
            COALESCE(SUM(amount), 0) AS units_requested,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27COMPLETED\x27 THEN 1 ELSE 0 END), 0) AS completed,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27COMPLETED\x27 THEN amount ELSE 0 END), 0) AS units_completed,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27PENDING\x27 THEN 1 ELSE 0 END), 0) AS pending,
            COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27APPROVED\x27 THEN 1 ELSE 0 END), 0) AS approved
        FROM stock_requests
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
        GROUP BY DATE(created_at)
    ");

    while ($row = $dailyReqQuery->fetch_assoc()) {
        $d = $row["req_date"];
        if (isset($daily[$d])) {
            $daily[$d]["total_requests"] = (int)$row["total_requests"];
            $daily[$d]["units_requested"] = (int)$row["units_requested"];
            $daily[$d]["completed"] = (int)$row["completed"];
            $daily[$d]["units_completed"] = (int)$row["units_completed"];
            $daily[$d]["pending"] = (int)$row["pending"];
            $daily[$d]["approved"] = (int)$row["approved"];
        }
    }

    // 4. Weekly Breakdown (Last 4 Weeks)
    $weekly = [];
    for ($w = 3; $w >= 0; $w--) {
        $start = date("Y-m-d", strtotime("-" . (($w + 1) * 7 - 1) . " days"));
        $end = date("Y-m-d", strtotime("-" . ($w * 7) . " days"));
        $weekKey = "W-" . (4 - $w);
        $label = ($w === 0) ? "This Week" : ($w === 1 ? "Last Week" : "$w Wks Ago");

        $weekQuery = $conn->query("
            SELECT
                COUNT(*) AS total_requests,
                COALESCE(SUM(amount), 0) AS units_requested,
                COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27COMPLETED\x27 THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27COMPLETED\x27 THEN amount ELSE 0 END), 0) AS units_completed,
                COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27PENDING\x27 THEN 1 ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27APPROVED\x27 THEN 1 ELSE 0 END), 0) AS approved
            FROM stock_requests
            WHERE DATE(created_at) BETWEEN \x27$start\x27 AND \x27$end\x27
        ");
        $wData = $weekQuery->fetch_assoc();

        $weekly[] = [
            "key" => $weekKey,
            "label" => $label,
            "range" => date("M j", strtotime($start)) . " - " . date("M j", strtotime($end)),
            "items_in_stock" => (int)$stockSummary["total_units"],
            "total_requests" => (int)$wData["total_requests"],
            "units_requested" => (int)$wData["units_requested"],
            "completed" => (int)$wData["completed"],
            "units_completed" => (int)$wData["units_completed"],
            "pending" => (int)$wData["pending"],
            "approved" => (int)$wData["approved"]
        ];
    }

    // 5. Monthly Breakdown (Last 6 Months)
    $monthly = [];
    for ($m = 5; $m >= 0; $m--) {
        $mYearMonth = date("Y-m", strtotime("-$m months"));
        $mLabel = date("M Y", strtotime("-$m months"));
        $mShort = date("M", strtotime("-$m months"));

        $monthQuery = $conn->query("
            SELECT
                COUNT(*) AS total_requests,
                COALESCE(SUM(amount), 0) AS units_requested,
                COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27COMPLETED\x27 THEN 1 ELSE 0 END), 0) AS completed,
                COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27COMPLETED\x27 THEN amount ELSE 0 END), 0) AS units_completed,
                COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27PENDING\x27 THEN 1 ELSE 0 END), 0) AS pending,
                COALESCE(SUM(CASE WHEN UPPER(TRIM(status)) = \x27APPROVED\x27 THEN 1 ELSE 0 END), 0) AS approved
            FROM stock_requests
            WHERE DATE_FORMAT(created_at, \x27%Y-%m\x27) = \x27$mYearMonth\x27
        ");
        $mData = $monthQuery->fetch_assoc();

        $monthly[] = [
            "month" => $mYearMonth,
            "label" => $mLabel,
            "short" => $mShort,
            "items_in_stock" => (int)$stockSummary["total_units"],
            "total_requests" => (int)$mData["total_requests"],
            "units_requested" => (int)$mData["units_requested"],
            "completed" => (int)$mData["completed"],
            "units_completed" => (int)$mData["units_completed"],
            "pending" => (int)$mData["pending"],
            "approved" => (int)$mData["approved"]
        ];
    }

    echo json_encode([
        "success" => true,
        "summary" => [
            "total_stock_units" => (int)$stockSummary["total_units"],
            "total_stock_items" => (int)$stockSummary["total_items"],
            "total_requests" => (int)$reqSummary["total_requests"],
            "total_units_requested" => (int)$reqSummary["total_units_requested"],
            "completed_requests" => (int)$reqSummary["completed_requests"],
            "completed_units" => (int)$reqSummary["completed_units"],
            "pending_requests" => (int)$reqSummary["pending_requests"],
            "pending_units" => (int)$reqSummary["pending_units"],
            "approved_requests" => (int)$reqSummary["approved_requests"],
            "approved_units" => (int)$reqSummary["approved_units"]
        ],
        "daily" => array_values($daily),
        "weekly" => $weekly,
        "monthly" => $monthly
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Failed to load chart analytics.",
        "error" => $e->getMessage()
    ]);
}

$conn->close();
?>