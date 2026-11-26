<?php

use App\Models\User;
use App\Modules\Accounts\AccountStatus;
use App\Modules\Accounts\Role;
use App\Modules\Notifications\Notify;
use App\Modules\Requests\ItemRequest;
use App\Modules\Requests\RequestStatus;
use App\Modules\Stocks\Item;
use App\Modules\Turnovers\Turnover;
use App\Modules\Turnovers\TurnoverStatus;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use Illuminate\Support\Facades\Validator;

// First Supply Office admin on a new server. The password is typed, never stored in a file.
Artisan::command('spmu:admin {email} {name}', function (string $email, string $name) {
    $password = $this->secret('Password (at least 8 characters)');

    $validator = Validator::make(compact('email', 'password'), [
        'email' => ['required', 'email', 'unique:users,email'],
        'password' => ['required', 'min:8'],
    ]);

    if ($validator->fails()) {
        $this->error($validator->errors()->first());

        return 1;
    }

    User::create([
        'name' => $name,
        'email' => $email,
        'password' => $password,
        'office' => 'Supply Office',
        'role' => Role::Admin,
        'status' => AccountStatus::Approved,
    ]);

    $this->info("Admin {$email} created.");
})->purpose('Create an approved Supply Office admin account');

// S2.5: morning list of items at or below their reorder level. Skipped when there are none.
Artisan::command('spmu:low-stock', function () {
    $items = Item::lowStock()->orderBy('quantity')->get(['name', 'unit', 'quantity']);

    if ($items->isEmpty()) {
        $this->info('No low-stock items.');

        return;
    }

    $list = $items->map(fn (Item $item) => "{$item->name} ({$item->quantity} {$item->unit})")->implode(', ');
    Notify::admins('Low stock today', "{$items->count()} items are at or below their reorder level: {$list}.", '/stocks?status=low_stock');

    $this->info("Notified admins about {$items->count()} items.");
})->purpose('Notify admins about low-stock items');

Schedule::command('spmu:low-stock')->dailyAt('07:00');

// Requests and turnovers must not wait unseen: remind admins of anything older than N days.
Artisan::command('spmu:waiting {--days=3}', function () {
    $before = now()->subDays((int) $this->option('days'));

    $counts = [
        'requests to review' => ItemRequest::where('status', RequestStatus::Pending)->where('created_at', '<', $before)->count(),
        'approved requests not yet issued' => ItemRequest::where('status', RequestStatus::Approved)->where('decided_at', '<', $before)->count(),
        'turnovers to receive' => Turnover::where('status', TurnoverStatus::Pending)->where('created_at', '<', $before)->count(),
    ];
    $waiting = array_filter($counts);

    if (! $waiting) {
        $this->info('Nothing is waiting too long.');

        return;
    }

    $list = collect($waiting)->map(fn ($n, $what) => "{$n} {$what}")->implode(', ');
    Notify::admins('Waiting more than '.$this->option('days').' days', "Please act on: {$list}.", '/dashboard');

    $this->info("Reminded admins: {$list}.");
})->purpose('Remind admins about requests and turnovers that are waiting too long');

Schedule::command('spmu:waiting')->dailyAt('07:00');
