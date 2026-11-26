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
require_once "notification_helper.php";

$today = date("Y-m-d");
$tomorrow = date("Y-m-d", strtotime("+1 day"));

$notificationsSent = 0;

// 1. Notify users whose equipment is due tomorrow or today
$dueSql = "
    SELECT 
        b.id,
        b.user_id,
        b.expected_return_date,
        s.item_name
    FROM equipment_borrowings b
    INNER JOIN stocks s ON b.stock_id = s.id
    WHERE b.status = 'BORROWED'
      AND b.expected_return_date IN (?, ?)
";
$stmt = $conn->prepare($dueSql);
if ($stmt) {
    $stmt->bind_param("ss", $today, $tomorrow);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($row = $res->fetch_assoc()) {
        $bId = (int)$row["id"];
        $uId = (int)$row["user_id"];
        $iName = $row["item_name"];
        $exp = $row["expected_return_date"];
        $when = ($exp === $today) ? "TODAY" : "tomorrow ($exp)";
        
        $chk = $conn->query("SELECT id FROM notifications WHERE user_id = $uId AND reference_id = $bId AND type = 'due_reminder' AND DATE(created_at) = '$today'");
        if ($chk && $chk->num_rows === 0) {
            createNotification(
                $conn,
                $uId,
                "Equipment Return Due Reminder",
                "Your borrowed equipment '{$iName}' is due for return {$when}. Please return it to the SPMU office.",
                "due_reminder",
                $bId
            );
            $notificationsSent++;
        }
    }
    $stmt->close();
}

// 2. Notify users and admins about overdue equipment
$overdueSql = "
    SELECT 
        b.id,
        b.user_id,
        b.expected_return_date,
        s.item_name,
        u.name AS borrower_name
    FROM equipment_borrowings b
    INNER JOIN stocks s ON b.stock_id = s.id
    INNER JOIN users u ON b.user_id = u.id
    WHERE b.status = 'BORROWED'
      AND b.expected_return_date < ?
";
$oStmt = $conn->prepare($overdueSql);
if ($oStmt) {
    $oStmt->bind_param("s", $today);
    $oStmt->execute();
    $oRes = $oStmt->get_result();
    
    $adminIds = getAdminUserIds($conn);

    while ($row = $oRes->fetch_assoc()) {
        $bId = (int)$row["id"];
        $uId = (int)$row["user_id"];
        $iName = $row["item_name"];
        $bName = $row["borrower_name"];
        $exp = $row["expected_return_date"];

        // Notify user once per day
        $chkUser = $conn->query("SELECT id FROM notifications WHERE user_id = $uId AND reference_id = $bId AND type = 'overdue_alert' AND DATE(created_at) = '$today'");
        if ($chkUser && $chkUser->num_rows === 0) {
            createNotification(
                $conn,
                $uId,
                "Overdue Equipment Notice",
                "Your borrowed equipment '{$iName}' was due on {$exp} and is now OVERDUE. Please return it immediately.",
                "overdue_alert",
                $bId
            );
            $notificationsSent++;
        }

        // Notify admins once per day
        foreach ($adminIds as $aId) {
            $chkAdmin = $conn->query("SELECT id FROM notifications WHERE user_id = $aId AND reference_id = $bId AND type = 'admin_overdue_alert' AND DATE(created_at) = '$today'");
            if ($chkAdmin && $chkAdmin->num_rows === 0) {
                createNotification(
                    $conn,
                    $aId,
                    "Equipment Overdue Notice",
                    "Equipment '{$iName}' borrowed by {$bName} is overdue since {$exp}.",
                    "admin_overdue_alert",
                    $bId
                );
                $notificationsSent++;
            }
        }
    }
    $oStmt->close();
}

echo json_encode([
    "success" => true,
    "message" => "Due and overdue checks processed successfully.",
    "notifications_sent" => $notificationsSent
]);

$conn->close();
?>
