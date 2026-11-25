<?php

namespace App\Modules\Notifications;

use App\Models\User;
use App\Modules\Accounts\AccountStatus;
use App\Modules\Accounts\Role;
use Illuminate\Support\Facades\Notification;

class Notify
{
    public static function user(User $user, string $title, string $message, ?string $link = null): void
    {
        $user->notify(new SupplyNotification($title, $message, $link));
    }

    public static function admins(string $title, string $message, ?string $link = null): void
    {
        $admins = User::where('role', Role::Admin)->where('status', AccountStatus::Approved)->get();
        Notification::send($admins, new SupplyNotification($title, $message, $link));
    }
}
