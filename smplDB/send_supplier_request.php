
<?php

date_default_timezone_set("Asia/Manila");

session_start();

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json; charset=UTF-8");

// Handle CORS preflight requests.
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Only allow POST requests.
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Only POST requests are allowed."
    ]);
    exit;
}

require_once __DIR__ . "/db.php";

try {
    // --------------------------------------------------
    // 1. CHECK USER SESSION
    // --------------------------------------------------

    if (empty($_SESSION["user_id"])) {
        http_response_code(401);

        echo json_encode([
            "success" => false,
            "message" => "Your session has expired. Please log in again."
        ]);
        exit;
    }

    // --------------------------------------------------
    // 2. READ JSON FROM REACT
    // --------------------------------------------------

    $rawInput = file_get_contents("php://input");
    $data = json_decode($rawInput, true);

    if (!is_array($data)) {
        throw new Exception("Invalid request data.");
    }

    $supplierId = filter_var(
        $data["supplier_id"] ?? null,
        FILTER_VALIDATE_INT
    );

    $itemsInput = $data["items"] ?? null;
    $message = trim((string) ($data["message"] ?? ""));

    // --------------------------------------------------
    // 3. VALIDATE SUPPLIER AND ITEMS
    // --------------------------------------------------

    if ($supplierId === false || $supplierId === null || $supplierId <= 0) {
        throw new Exception("Please select a valid supplier.");
    }

    if (!is_array($itemsInput) || count($itemsInput) < 1) {
        throw new Exception("Please add at least one item.");
    }

    if (count($itemsInput) > 50) {
        throw new Exception("You can request a maximum of 50 items.");
    }

    if ($message === "") {
        throw new Exception("Please enter a request message.");
    }

    $items = [];

    foreach ($itemsInput as $index => $item) {
        $itemNumber = $index + 1;

        if (!is_array($item)) {
            throw new Exception(
                "Invalid information for item " . $itemNumber . "."
            );
        }

        $itemName = trim(
            (string) ($item["item_name"] ?? "")
        );

        $quantity = filter_var(
            $item["quantity"] ?? null,
            FILTER_VALIDATE_INT
        );

        if ($itemName === "") {
            throw new Exception(
                "Please enter the name of item " . $itemNumber . "."
            );
        }

        if (strlen($itemName) > 200) {
            throw new Exception(
                "The name of item " . $itemNumber . " is too long."
            );
        }

        if (
            $quantity === false ||
            $quantity === null ||
            $quantity <= 0
        ) {
            throw new Exception(
                "Enter a valid whole-number quantity for item " .
                $itemNumber . "."
            );
        }

        $items[] = [
            "item_name" => $itemName,
            "quantity" => $quantity
        ];
    }

    // --------------------------------------------------
    // 4. GET SUPPLIER FROM DATABASE
    // --------------------------------------------------

    $stmt = $conn->prepare(
        "SELECT id, name, email
         FROM suppliers
         WHERE id = ?
         LIMIT 1"
    );

    if (!$stmt) {
        throw new Exception("Unable to prepare the supplier query.");
    }

    $stmt->bind_param("i", $supplierId);

    if (!$stmt->execute()) {
        $stmt->close();
        throw new Exception("Unable to retrieve supplier information.");
    }

    $result = $stmt->get_result();
    $supplier = $result->fetch_assoc();

    $stmt->close();

    if (!$supplier) {
        throw new Exception("The selected supplier was not found.");
    }

    if (
        empty($supplier["email"]) ||
        !filter_var($supplier["email"], FILTER_VALIDATE_EMAIL)
    ) {
        throw new Exception(
            "The selected supplier does not have a valid email address."
        );
    }

    // --------------------------------------------------
    // 5. PREPARE EMAIL CONTENT
    // --------------------------------------------------

    $safeSupplierName = htmlspecialchars(
        $supplier["name"],
        ENT_QUOTES,
        "UTF-8"
    );

    $safeMessage = nl2br(
        htmlspecialchars($message, ENT_QUOTES, "UTF-8")
    );

    $dateSent = date("F j, Y - g:i A");

    $referenceId =
        "PO-" .
        date("Ymd") .
        "-" .
        str_pad((string) $supplierId, 4, "0", STR_PAD_LEFT) .
        "-" .
        strtoupper(substr(bin2hex(random_bytes(3)), 0, 6));

    $safeItemsRows = "";
    $plainTextItems = "";

    foreach ($items as $item) {
        $safeItemName = htmlspecialchars(
            $item["item_name"],
            ENT_QUOTES,
            "UTF-8"
        );

        $quantity = $item["quantity"];

        $safeItemsRows .= "
            <tr>
                <td style='
                    padding: 14px 16px;
                    font-size: 14px;
                    color: #0f172a;
                    border-top: 1px solid #e2e8f0;
                '>
                    {$safeItemName}
                </td>

                <td style='
                    padding: 14px 16px;
                    font-size: 14px;
                    font-weight: bold;
                    color: #2563eb;
                    text-align: right;
                    border-top: 1px solid #e2e8f0;
                    white-space: nowrap;
                '>
                    {$quantity} unit(s)
                </td>
            </tr>
        ";

        $plainTextItems .=
            $item["item_name"] .
            " - Quantity: " .
            $quantity .
            "\n";
    }

    $itemCount = count($items);

    // --------------------------------------------------
    // 6. BUILD HTML EMAIL
    // --------------------------------------------------

    $body = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPMU Supplier Request</title>
</head>

<body style="
    margin: 0;
    padding: 0;
    background-color: #f1f5f9;
    font-family: Arial, Helvetica, sans-serif;
    color: #1e293b;
">

    <div style="
        max-width: 680px;
        margin: 25px auto;
        padding: 20px;
    ">

        <div style="
            background-color: #1e3a8a;
            padding: 28px 24px;
            border-radius: 12px 12px 0 0;
            color: #ffffff;
        ">
            <div style="
                font-size: 12px;
                letter-spacing: 2px;
                color: #bfdbfe;
                font-weight: bold;
            ">
                SPMU INVENTORY SYSTEM
            </div>

            <h1 style="
                margin: 12px 0 8px;
                font-size: 25px;
            ">
                Stock Request
            </h1>

            <p style="
                margin: 0;
                font-size: 14px;
                color: #dbeafe;
            ">
                Request for supplier quotation and availability
            </p>
        </div>

        <div style="
            background-color: #ffffff;
            padding: 28px 24px;
            border: 1px solid #e2e8f0;
            border-top: none;
        ">

            <p style="font-size: 15px;">
                Dear <strong>{$safeSupplierName}</strong>,
            </p>

            <p style="
                font-size: 14px;
                line-height: 1.8;
                color: #475569;
            ">
                We would like to request a quotation for the items listed
                below. Please confirm their availability, unit prices,
                and estimated delivery schedule.
            </p>

            <div style="
                margin: 22px 0;
                padding: 16px;
                background-color: #f8fafc;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
            ">
                <table style="
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 13px;
                ">
                    <tr>
                        <td style="
                            padding: 5px 0;
                            color: #64748b;
                        ">
                            Request Reference
                        </td>

                        <td style="
                            padding: 5px 0;
                            text-align: right;
                            font-weight: bold;
                            color: #0f172a;
                        ">
                            {$referenceId}
                        </td>
                    </tr>

                    <tr>
                        <td style="
                            padding: 5px 0;
                            color: #64748b;
                        ">
                            Date Sent
                        </td>

                        <td style="
                            padding: 5px 0;
                            text-align: right;
                            color: #0f172a;
                        ">
                            {$dateSent}
                        </td>
                    </tr>

                    <tr>
                        <td style="
                            padding: 5px 0;
                            color: #64748b;
                        ">
                            Number of Items
                        </td>

                        <td style="
                            padding: 5px 0;
                            text-align: right;
                            font-weight: bold;
                            color: #0f172a;
                        ">
                            {$itemCount}
                        </td>
                    </tr>
                </table>
            </div>

            <h3 style="
                margin: 25px 0 12px;
                font-size: 17px;
                color: #0f172a;
            ">
                Requested Items
            </h3>

            <table style="
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
            ">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="
                            padding: 14px 16px;
                            text-align: left;
                            font-size: 12px;
                            color: #475569;
                            text-transform: uppercase;
                        ">
                            Item Name
                        </th>

                        <th style="
                            padding: 14px 16px;
                            text-align: right;
                            font-size: 12px;
                            color: #475569;
                            text-transform: uppercase;
                        ">
                            Quantity
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {$safeItemsRows}
                </tbody>
            </table>

            <h3 style="
                margin: 26px 0 10px;
                font-size: 16px;
                color: #0f172a;
            ">
                Additional Remarks
            </h3>

            <div style="
                padding: 16px;
                background-color: #f8fafc;
                border-left: 4px solid #2563eb;
                border-radius: 4px;
                font-size: 14px;
                line-height: 1.8;
                color: #475569;
            ">
                {$safeMessage}
            </div>

            <p style="
                margin-top: 25px;
                font-size: 14px;
                line-height: 1.8;
                color: #475569;
            ">
                Kindly reply to this email with your quotation, unit prices,
                item availability, and expected delivery timeline.
                Please include the request reference in your reply.
            </p>

            <p style="
                font-size: 14px;
                line-height: 1.8;
                color: #475569;
            ">
                Thank you for your cooperation.
            </p>

            <p style="
                margin-bottom: 0;
                font-size: 14px;
                line-height: 1.8;
                color: #0f172a;
            ">
                Best regards,<br>
                <strong>SPMU Inventory System</strong><br>
                <a
                    href="mailto:spmuinventory@gmail.com"
                    style="color: #2563eb; text-decoration: none;"
                >
                    spmuinventory@gmail.com
                </a>
            </p>

        </div>

        <div style="
            padding: 18px;
            text-align: center;
            background-color: #e2e8f0;
            border-radius: 0 0 12px 12px;
            font-size: 12px;
            line-height: 1.7;
            color: #64748b;
        ">
            This email was generated by the SPMU Inventory System.<br>
            Please do not share confidential information in your reply.
        </div>

    </div>

</body>
</html>
HTML;

    // --------------------------------------------------
    // 7. LOAD PHPMailer AND SMTP CONFIGURATION
    // --------------------------------------------------

    require_once __DIR__ . "/vendor/autoload.php";

    $configPath =
        "C:/laragon/www/smplDB/secure/spmu_mail_config.php";

    if (!file_exists($configPath)) {
        throw new Exception(
            "The SMTP configuration file could not be found."
        );
    }

    $mailConfig = require $configPath;

    if (!is_array($mailConfig)) {
        throw new Exception(
            "The SMTP configuration file has an invalid format."
        );
    }

    $smtpUsername = trim(
        (string) (
            $mailConfig["smtp_username"] ??
            "spmuinventory@gmail.com"
        )
    );

    $smtpPassword = trim(
        (string) ($mailConfig["smtp_password"] ?? "")
    );

    if ($smtpPassword === "") {
        throw new Exception(
            "The SMTP password is missing from the configuration file."
        );
    }

    // --------------------------------------------------
    // 8. SEND EMAIL USING PHPMailer
    // --------------------------------------------------

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);

    $mail->isSMTP();

    $mail->Host = "smtp.gmail.com";
    $mail->SMTPAuth = true;
    $mail->Username = $smtpUsername;
    $mail->Password = $smtpPassword;

    $mail->SMTPSecure =
        \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;

    $mail->Port = 587;
    $mail->CharSet = "UTF-8";

    // Sender.
    $mail->setFrom(
        $smtpUsername,
        "SPMU Inventory System"
    );

    // Replies should go to the company inventory email.
    $mail->addReplyTo(
        $smtpUsername,
        "SPMU Inventory System"
    );

    // Supplier recipient.
    $mail->addAddress(
        $supplier["email"],
        $supplier["name"]
    );

    // Email subject.
    $mail->Subject =
        "SPMU Inventory System - Stock Request (" .
        $referenceId .
        ")";

    // HTML email.
    $mail->isHTML(true);
    $mail->Body = $body;

    // Plain-text email for clients that do not display HTML.
    $mail->AltBody =
        "SPMU Inventory System - Stock Request\n\n" .
        "Reference: " . $referenceId . "\n" .
        "Date: " . $dateSent . "\n\n" .
        "Dear " . $supplier["name"] . ",\n\n" .
        "Please provide a quotation for the following items:\n\n" .
        $plainTextItems . "\n" .
        "Additional remarks:\n" . $message . "\n\n" .
        "Please reply with your quotation, unit prices, availability, " .
        "and expected delivery timeline.\n\n" .
        "SPMU Inventory System\n" .
        $smtpUsername;

    // Send the email.
    $mail->send();

    // --------------------------------------------------
    // 9. RETURN SUCCESS RESPONSE TO REACT
    // --------------------------------------------------

    echo json_encode([
        "success" => true,
        "message" => "Stock request sent successfully.",
        "supplier" => [
            "id" => (int) $supplier["id"],
            "name" => $supplier["name"],
            "email" => $supplier["email"]
        ],
        "request" => [
            "reference" => $referenceId,
            "items" => $items,
            "item_count" => count($items)
        ]
    ]);

} catch (\Throwable $e) {

    // Record the actual error in the PHP error log.
    error_log(
        "Supplier email error: " . $e->getMessage()
    );

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" =>
            "Unable to send the supplier request. " .
            "Please check the server configuration."
    ]);
}
