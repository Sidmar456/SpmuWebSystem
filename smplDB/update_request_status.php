<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

session_start();
date_default_timezone_set("Asia/Manila");

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once "db.php";
require_once "notification_helper.php";
require_once __DIR__ . "/vendor/autoload.php";

/* -----------------------------------------
   JSON RESPONSE
----------------------------------------- */
function respond($success, $message, $statusCode = 200, $extra = [])
{
    http_response_code($statusCode);

    echo json_encode(array_merge([
        "success" => $success,
        "message" => $message
    ], $extra));

    exit;
}

/* -----------------------------------------
   VALIDATE METHOD AND DATABASE
----------------------------------------- */
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    respond(false, "Invalid request method.", 405);
}

if (!isset($conn) || !($conn instanceof mysqli)) {
    error_log("update_request_status.php: Database connection unavailable.");
    respond(false, "Database connection failed.", 500);
}

/* -----------------------------------------
   READ REQUEST
----------------------------------------- */
$input = json_decode(file_get_contents("php://input"), true);

if (!is_array($input)) {
    respond(false, "Invalid JSON request.", 400);
}

$requestId = filter_var(
    $input["request_id"] ?? null,
    FILTER_VALIDATE_INT
);

$status = strtoupper(trim((string)($input["status"] ?? "")));

if ($requestId === false || $requestId === null || $requestId <= 0) {
    respond(false, "Request ID is required.", 400);
}

if (!in_array($status, ["APPROVED", "CANCELLED"], true)) {
    respond(false, "Invalid status.", 400);
}

$claimCode = null;
$requestGroupId = null;
$itemCount = 0;
$userId = 0;

try {

    /* =========================================
       STEP 1: FIND THE REQUEST GROUP
    ========================================= */

    $conn->begin_transaction();

    $baseStmt = $conn->prepare(
        "SELECT id, request_group_id, user_id, status
         FROM stock_requests
         WHERE id = ?
         FOR UPDATE"
    );

    if (!$baseStmt) {
        throw new Exception("Unable to prepare request lookup.");
    }

    $baseStmt->bind_param("i", $requestId);
    $baseStmt->execute();

    $baseResult = $baseStmt->get_result();
    $baseRequest = $baseResult->fetch_assoc();

    $baseStmt->close();

    if (!$baseRequest) {
        $conn->rollback();
        respond(false, "The requested record was not found.", 404);
    }

    $requestGroupId = $baseRequest["request_group_id"];
    $userId = (int)$baseRequest["user_id"];

    /*
     * If a group ID exists, retrieve every item in the group.
     * If the group ID is NULL or empty, treat this as a
     * legacy single-item request.
     */
    if (
        $requestGroupId !== null &&
        trim((string)$requestGroupId) !== ""
    ) {
        $groupStmt = $conn->prepare(
            "SELECT id, user_id, stock_id, amount, status
             FROM stock_requests
             WHERE request_group_id = ?
             FOR UPDATE"
        );

        if (!$groupStmt) {
            throw new Exception("Unable to prepare group lookup.");
        }

        $groupStmt->bind_param("s", $requestGroupId);
        $groupStmt->execute();

        $groupResult = $groupStmt->get_result();
        $groupRows = $groupResult->fetch_all(MYSQLI_ASSOC);

        $groupStmt->close();

    } else {

        // Backward compatibility for ungrouped requests.
        $groupRows = [$baseRequest];
        $requestGroupId = null;
    }

    if (count($groupRows) === 0) {
        $conn->rollback();
        respond(false, "No items were found in this request.", 404);
    }

    $itemCount = count($groupRows);

    /*
     * Every item in this group must belong to the same user
     * and remain pending before the entire group can change.
     */
    foreach ($groupRows as $row) {

        if ((int)$row["user_id"] !== $userId) {
            throw new Exception(
                "The request group contains inconsistent user information."
            );
        }

        if (
            strtoupper(trim((string)$row["status"])) !== "PENDING"
        ) {
            $conn->rollback();

            respond(
                false,
                "This request or one of its items is no longer pending.",
                409
            );
        }
    }

    /* =========================================
       STEP 2: APPROVE OR CANCEL THE WHOLE GROUP
    ========================================= */

    if ($status === "APPROVED") {

        // One six-digit claim code for the entire group.
        $claimCode = str_pad(
            (string) random_int(0, 999999),
            6,
            "0",
            STR_PAD_LEFT
        );

        if ($requestGroupId !== null) {

            $updateSql = "
                UPDATE stock_requests
                SET
                    status = 'APPROVED',
                    claim_code = ?,
                    claim_code_used = 0,
                    claim_code_created_at = NOW()
                WHERE request_group_id = ?
                  AND UPPER(TRIM(status)) = 'PENDING'
            ";

            $updateStmt = $conn->prepare($updateSql);

            if (!$updateStmt) {
                throw new Exception("Unable to prepare group approval.");
            }

            $updateStmt->bind_param(
                "ss",
                $claimCode,
                $requestGroupId
            );

        } else {

            // Legacy request: only one row exists.
            $updateSql = "
                UPDATE stock_requests
                SET
                    status = 'APPROVED',
                    claim_code = ?,
                    claim_code_used = 0,
                    claim_code_created_at = NOW()
                WHERE id = ?
                  AND UPPER(TRIM(status)) = 'PENDING'
            ";

            $updateStmt = $conn->prepare($updateSql);

            if (!$updateStmt) {
                throw new Exception("Unable to prepare request approval.");
            }

            $updateStmt->bind_param(
                "si",
                $claimCode,
                $requestId
            );
        }

    } else {

        // Cancel every item in the group together.
        if ($requestGroupId !== null) {

            $updateStmt = $conn->prepare(
                "UPDATE stock_requests
                 SET status = 'CANCELLED'
                 WHERE request_group_id = ?
                   AND UPPER(TRIM(status)) = 'PENDING'"
            );

            if (!$updateStmt) {
                throw new Exception("Unable to prepare group cancellation.");
            }

            $updateStmt->bind_param("s", $requestGroupId);

        } else {

            $updateStmt = $conn->prepare(
                "UPDATE stock_requests
                 SET status = 'CANCELLED'
                 WHERE id = ?
                   AND UPPER(TRIM(status)) = 'PENDING'"
            );

            if (!$updateStmt) {
                throw new Exception("Unable to prepare request cancellation.");
            }

            $updateStmt->bind_param("i", $requestId);
        }
    }

    $updateStmt->execute();
    $updatedCount = $updateStmt->affected_rows;
    $updateStmt->close();

    if ($updatedCount !== $itemCount) {

        $conn->rollback();

        respond(
            false,
            "Not all items could be updated. Refresh the request list and try again.",
            409
        );
    }

    /* =========================================
       STEP 3: SAVE ALL CHANGES
    ========================================= */

    $conn->commit();

    /* =========================================
       STEP 4: SEND ONE EMAIL FOR THE GROUP
    ========================================= */

    if ($status === "APPROVED") {

        try {

            if ($requestGroupId !== null) {

                $fetchSql = "
                    SELECT
                        u.name AS user_name,
                        u.email AS user_email,
                        s.item_name,
                        r.amount
                    FROM stock_requests r
                    INNER JOIN users u
                        ON r.user_id = u.id
                    INNER JOIN stocks s
                        ON r.stock_id = s.id
                    WHERE r.request_group_id = ?
                    ORDER BY r.id ASC
                ";

                $fetchStmt = $conn->prepare($fetchSql);

                if (!$fetchStmt) {
                    throw new Exception("Unable to retrieve approved items.");
                }

                $fetchStmt->bind_param("s", $requestGroupId);

            } else {

                $fetchSql = "
                    SELECT
                        u.name AS user_name,
                        u.email AS user_email,
                        s.item_name,
                        r.amount
                    FROM stock_requests r
                    INNER JOIN users u
                        ON r.user_id = u.id
                    INNER JOIN stocks s
                        ON r.stock_id = s.id
                    WHERE r.id = ?
                ";

                $fetchStmt = $conn->prepare($fetchSql);

                if (!$fetchStmt) {
                    throw new Exception("Unable to retrieve approved item.");
                }

                $fetchStmt->bind_param("i", $requestId);
            }

            $fetchStmt->execute();

            $itemResult = $fetchStmt->get_result();
            $approvedItems = $itemResult->fetch_all(MYSQLI_ASSOC);

            $fetchStmt->close();

            if (count($approvedItems) > 0) {

                $userName = $approvedItems[0]["user_name"] ?? "Requester";
                $userEmail = $approvedItems[0]["user_email"] ?? "";

                if (!empty($userEmail)) {

                    $userNameSafe = htmlspecialchars(
                        $userName,
                        ENT_QUOTES,
                        "UTF-8"
                    );

                    $htmlItems = "";
                    $textItems = "";
                    $totalUnits = 0;

                    foreach ($approvedItems as $item) {

                        $itemName = $item["item_name"] ?? "Item";
                        $amount = (int)($item["amount"] ?? 0);
                        $totalUnits += $amount;

                        $itemNameSafe = htmlspecialchars(
                            $itemName,
                            ENT_QUOTES,
                            "UTF-8"
                        );

                        $htmlItems .= "
                            <tr>
                                <td style='padding:12px;border-bottom:1px solid #e2e8f0;color:#1f2937;'>
                                    {$itemNameSafe}
                                </td>
                                <td style='padding:12px;border-bottom:1px solid #e2e8f0;text-align:center;color:#1f2937;'>
                                    {$amount}
                                </td>
                            </tr>
                        ";

                        $textItems .= "- {$itemName}: {$amount}\n";
                    }

                    $mail = new PHPMailer(true);

                    $mail->isSMTP();
                    $mail->Host = "smtp.gmail.com";
                    $mail->SMTPAuth = true;
                    $mail->Username = "spmuinventory@gmail.com";

                    /*          
                     * Set this to your NEW Gmail app password.
                     * Do not reuse a password that has been exposed.
                     */
                    $mail->Password = "ekqldjpgoqvlxbzg";

                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
                    $mail->Port = 587;

                    $mail->CharSet = "UTF-8";

                    $mail->setFrom(
                        "spmuinventory@gmail.com",
                        "SPMU Inventory System"
                    );

                    $mail->addAddress($userEmail, $userName);

                    $mail->isHTML(true);

                    $mail->Subject =
                        "Your Supply Request Has Been Approved - Claim Code: "
                        . $claimCode;

                    $mail->Body = <<<HTML
<!DOCTYPE html>
<html>
<body style="margin:0;padding:20px;background:#f1f5f9;font-family:Arial,sans-serif;">

<div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">

    <div style="background:#172554;padding:28px;text-align:center;">
        <h1 style="color:#ffffff;margin:0;letter-spacing:4px;">SPMU</h1>
        <p style="color:#cbd5e1;margin:8px 0 0;font-size:13px;">
            Supply Property Management Unit
        </p>
    </div>

    <div style="padding:28px;">

        <h2 style="margin:0 0 12px;color:#15803d;font-size:21px;">
            Your Supply Request Has Been Approved!
        </h2>

        <p style="color:#475569;line-height:1.7;">
            Hello <strong>{$userNameSafe}</strong>, your complete supply request
            has been approved. All the items listed below are included under
            one claim code.
        </p>

        <h3 style="color:#1e293b;margin-top:26px;">Approved Items</h3>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;">
            <thead>
                <tr style="background:#f8fafc;">
                    <th style="padding:12px;text-align:left;color:#475569;font-size:13px;">
                        Item Name
                    </th>
                    <th style="padding:12px;text-align:center;color:#475569;font-size:13px;">
                        Quantity
                    </th>
                </tr>
            </thead>
            <tbody>
                {$htmlItems}
            </tbody>
        </table>

        <p style="margin:14px 0 24px;color:#334155;">
            <strong>Total units requested: {$totalUnits}</strong>
        </p>

        <div style="background:#eff6ff;border:2px solid #93c5fd;border-radius:10px;padding:25px;text-align:center;">
            <p style="margin:0 0 12px;color:#1d4ed8;font-size:12px;font-weight:bold;letter-spacing:2px;">
                YOUR ONE-TIME CLAIM CODE
            </p>

            <div style="color:#1e3a8a;font-size:42px;font-weight:bold;letter-spacing:8px;font-family:monospace;">
                {$claimCode}
            </div>

            <p style="margin:14px 0 0;color:#475569;font-size:13px;line-height:1.6;">
                This code is for the entire approved request.
                Present it when claiming all the items listed above.
            </p>
        </div>

        <div style="margin-top:24px;background:#fff7ed;border-left:4px solid #f97316;padding:16px;">
            <strong style="color:#9a3412;">Important reminder</strong>
            <p style="margin:8px 0 0;color:#7c2d12;font-size:13px;line-height:1.7;">
                Bring your employee or school ID, or any required authorization
                document, when collecting your supplies.
            </p>
        </div>

        <h3 style="color:#1e293b;margin-top:26px;">How to claim your supplies</h3>

        <ol style="padding-left:20px;color:#475569;font-size:13px;line-height:2;">
            <li>Visit the SPMU stockroom during office hours.</li>
            <li>Present this email and your claim code.</li>
            <li>Show your valid ID or authorization document.</li>
            <li>Verify all items and sign the release or acknowledgement form.</li>
        </ol>

    </div>

    <div style="background:#f8fafc;padding:18px;text-align:center;border-top:1px solid #e2e8f0;">
        <p style="margin:0;color:#64748b;font-size:11px;">
            Automated notification from the SPMU Inventory System.
            Please do not reply to this email.
        </p>
    </div>

</div>

</body>
</html>
HTML;

                    $mail->AltBody =
                        "Hello {$userName},\n\n" .
                        "Your complete supply request has been approved.\n\n" .
                        "Approved items:\n" .
                        $textItems . "\n" .
                        "Total units: {$totalUnits}\n\n" .
                        "ONE CLAIM CODE FOR ALL ITEMS: {$claimCode}\n\n" .
                        "Present this code and your valid ID at the SPMU stockroom.\n\n" .
                        "SPMU Inventory System";

                    $mail->send();
                }
            }

        } catch (Throwable $mailError) {

            // The request remains approved if email delivery fails.
            error_log(
                "SPMU approval email error for request {$requestId}: " .
                $mailError->getMessage()
            );
        }

        // Notify the user that their request was approved
        try {
            createNotification(
                $conn,
                $userId,
                "Request Approved",
                "Your supply request for " . $itemCount . " item(s) has been approved! Your claim code is: " . $claimCode,
                "request_approved",
                (int)$requestId
            );
        } catch (Throwable $notifErr) {
            error_log("Notification error (approved): " . $notifErr->getMessage());
        }

        respond(
            true,
            "All {$itemCount} item(s) in the request were approved. One claim code was generated.",
            200,
            [
                "status" => "APPROVED",
                "request_id" => (int)$requestId,
                "request_group_id" => $requestGroupId,
                "claim_code" => $claimCode,
                "item_count" => $itemCount
            ]
        );

    } else {

        // Notify the user that their request was cancelled
        try {
            createNotification(
                $conn,
                $userId,
                "Request Cancelled",
                "Your supply request for " . $itemCount . " item(s) has been cancelled by the administrator.",
                "request_cancelled",
                (int)$requestId
            );
        } catch (Throwable $notifErr) {
            error_log("Notification error (cancelled): " . $notifErr->getMessage());
        }

        respond(
            true,
            "All {$itemCount} item(s) in the request were cancelled.",
            200,
            [
                "status" => "CANCELLED",
                "request_id" => (int)$requestId,
                "request_group_id" => $requestGroupId,
                "item_count" => $itemCount
            ]
        );
    }

} catch (Throwable $error) {

    try {
        $conn->rollback();
    } catch (Throwable $ignored) {
        // A transaction may already have been committed or rolled back.
    }

    error_log(
        "update_request_status.php error: " . $error->getMessage()
    );

    respond(
        false,
        "Unable to update the request. Please check the server error log.",
        500
    );
}
?>