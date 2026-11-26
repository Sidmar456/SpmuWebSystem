<?php

namespace App\Modules\Suppliers;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Email to the supplier listing the items the Supply Office needs. */
class SupplierOrderMail extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public SupplierOrder $order) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $order = $this->order->loadMissing('lines.item', 'supplier', 'user');

        $mail = (new MailMessage)
            ->subject("Stock request {$order->order_no} from ZPPSU Supply Office")
            ->greeting('Good day'.($order->supplier->contact_person ? ", {$order->supplier->contact_person}" : '').'!')
            ->line('The ZPPSU Supply and Property Management Unit would like to request the following items:');

        foreach ($order->lines as $line) {
            $mail->line("• {$line->quantity} {$line->item->unit} {$line->item->name} ({$line->item->stock_no})");
        }

        if ($order->notes) {
            $mail->line("Notes: {$order->notes}");
        }

        return $mail
            ->line('Please reply to this email with your quotation or delivery schedule.')
            ->salutation("{$order->user->name}, Supply Office");
    }
}
