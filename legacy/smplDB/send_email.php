<?php

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require __DIR__ . '/vendor/autoload.php';

$mail = new PHPMailer(true);

try {

    // Gmail SMTP settings
    $mail->isSMTP();
    $mail->Host       = 'smtp.gmail.com';
    $mail->SMTPAuth   = true;
    $mail->Username   = 'spmuinventory@gmail.com';

    // PUT YOUR GOOGLE APP PASSWORD HERE
    $mail->Password   = 'ekqldjpgoqvlxbzg';

    $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    $mail->Port       = 587;

    // Company email
    $mail->setFrom(
        'spmuinventory@gmail.com',
        'SPMU Inventory System'
    );

    // YOUR EMAIL FOR TESTING
    $mail->addAddress(
        'spmuinventory@gmail.com',
        'Test User'
    );

    // Email
    $mail->isHTML(true);

    $mail->Subject = 'Test Email - SPMU Inventory System';

    $mail->Body = '
        <h2>SPMU Inventory System</h2>

        <p>Hello!</p>

        <p>
            This is a test email from the
            <strong>SPMU Inventory System</strong>.
        </p>

        <p>
            PHPMailer and Gmail SMTP are working correctly.
        </p>
    ';

    $mail->AltBody =
        'This is a test email from the SPMU Inventory System.';

    $mail->send();

    echo 'Email sent successfully!';

} catch (Exception $e) {

    echo 'Email could not be sent.<br>';
    echo 'Error: ' . $mail->ErrorInfo;
}