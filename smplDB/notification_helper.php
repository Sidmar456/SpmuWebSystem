<?php
/**
 * Insert a notification into the notifications table.
 *
 * @param mysqli $conn       Database connection
 * @param int    $userId     Target user ID
 * @param string $title      Short notification title
 * @param string $message    Notification body text
 * @param string $type       Notification type (new_request, request_approved, request_cancelled, etc.)
 * @param int|null $refId    Optional reference ID (e.g., request ID)
 */
function createNotification($conn, $userId, $title, $message, $type = "general", $refId = null) {
    $stmt = $conn->prepare(
        "INSERT INTO notifications (user_id, title, message, type, reference_id, created_at)
         VALUES (?, ?, ?, ?, ?, NOW())"
    );

    if (!$stmt) {
        error_log("createNotification: prepare failed - " . $conn->error);
        return false;
    }

    $stmt->bind_param("isssi", $userId, $title, $message, $type, $refId);
    $result = $stmt->execute();

    if (!$result) {
        error_log("createNotification: execute failed - " . $stmt->error);
    }

    $stmt->close();
    return $result;
}

/**
 * Get all admin user IDs from the users table.
 *
 * @param mysqli $conn Database connection
 * @return array List of admin user IDs
 */
function getAdminUserIds($conn) {
    $adminIds = [];

    $result = $conn->query("SELECT id FROM users WHERE LOWER(TRIM(role)) = 'admin'");

    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $adminIds[] = (int) $row["id"];
        }
    }

    return $adminIds;
}
?>