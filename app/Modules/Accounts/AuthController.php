<?php

namespace App\Modules\Accounts;

use App\Models\User;
use App\Modules\Notifications\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password as PasswordBroker;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class AuthController
{
    public function register(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'office' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(8)],
            'privacy_accepted' => ['accepted'],
        ], ['privacy_accepted.accepted' => 'Please read and accept the privacy notice.']);

        $user = User::create(Arr::except($data, 'privacy_accepted') + ['role' => Role::User, 'status' => AccountStatus::Pending]);
        $user->forceFill(['privacy_accepted_at' => now()])->save();

        Notify::admins('New account request', "{$user->name} ({$user->office}) is waiting for approval.", '/accounts');

        return response()->json([
            'message' => 'Account request submitted. Please wait for the Supply Office to approve it.',
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Password is checked first, so a wrong password never reveals whether the account exists or its status.
        if (! Auth::validate($credentials)) {
            throw ValidationException::withMessages(['email' => 'Invalid email or password.']);
        }

        $user = User::where('email', $credentials['email'])->first();

        if ($user->status !== AccountStatus::Approved) {
            throw ValidationException::withMessages([
                'email' => match ($user->status) {
                    AccountStatus::Pending => 'Your account is still waiting for approval.',
                    AccountStatus::Disabled => 'Your account is disabled. Please contact the Supply Office.',
                    default => 'Your account request was rejected.',
                },
            ]);
        }

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['user' => $user]);
    }

    /** Same answer whether or not the email exists, so this cannot be used to find accounts. */
    public function forgotPassword(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        PasswordBroker::sendResetLink($request->only('email'));

        return response()->json(['message' => 'If that email has an account, a reset link is on its way. It works for 60 minutes.']);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $status = PasswordBroker::reset($data, function (User $user, string $password) {
            $user->forceFill(['password' => Hash::make($password), 'remember_token' => Str::random(60)])->save();
        });

        if ($status !== PasswordBroker::PASSWORD_RESET) {
            throw ValidationException::withMessages(['email' => 'This reset link is invalid or has expired. Ask for a new one.']);
        }

        return response()->json(['message' => 'Password changed. You can now log in.']);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['message' => 'Logged out.']);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'office' => ['required', 'string', 'max:255'],
            'current_password' => ['required_with:password', 'nullable', 'current_password'],
            'password' => ['nullable', 'confirmed', Password::min(8)],
        ]);

        $user->fill(['name' => $data['name'], 'office' => $data['office']]);

        if (! empty($data['password'])) {
            $user->password = Hash::make($data['password']);
        }

        $user->save();

        return response()->json(['user' => $user]);
    }
}
