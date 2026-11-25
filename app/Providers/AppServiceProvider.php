<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Foundation\Console\ServeCommand;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        // `php artisan serve` drops TMP/TEMP; on Windows PHP then cannot store uploads ("unable to create a temporary file").
        ServeCommand::$passthroughVariables = [...ServeCommand::$passthroughVariables, 'TMP', 'TEMP'];
    }

    public function boot(): void
    {
        // Used as `can:admin` on routes and Gate::allows('admin') in controllers.
        Gate::define('admin', fn (User $user) => $user->isAdmin());

        // Per email and IP, so one office behind a shared IP does not lock everyone out.
        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)
            ->by(strtolower((string) $request->input('email')).'|'.$request->ip()));

        // Reset emails link to the React screen, not a Blade route.
        ResetPassword::createUrlUsing(fn (User $user, string $token) => url('/reset-password?'.http_build_query(['token' => $token, 'email' => $user->email])));
    }
}
