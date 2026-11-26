<?php

namespace App\Http\Middleware;

use App\Modules\Accounts\AccountStatus;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/** A session that belongs to an account no longer approved (e.g. just disabled) is ended on its next request. */
class EnsureAccountActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->status !== AccountStatus::Approved) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            // API calls get a JSON 401; page visits load the app, which then shows the login screen.
            abort_if($request->is('api/*'), 401, 'Your account is not active. Please contact the Supply Office.');
        }

        return $next($request);
    }
}
