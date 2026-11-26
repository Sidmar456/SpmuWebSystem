<?php

namespace App\Modules\Accounts;

use App\Models\User;
use App\Modules\Notifications\Notify;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AccountController
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::enum(AccountStatus::class)]]);

        $users = User::query()
            ->when($request->status, fn ($q, $status) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json($users);
    }

    public function approve(User $user): JsonResponse
    {
        $this->decide($user, AccountStatus::Approved);
        Notify::user($user, 'Account approved', 'Your SPMU IMS account is approved. You can now log in.', '/login');

        return response()->json(['user' => $user]);
    }

    public function reject(User $user): JsonResponse
    {
        $this->decide($user, AccountStatus::Rejected);
        Notify::user($user, 'Account request rejected', 'Your SPMU IMS account request was not approved. Please contact the Supply Office.');

        return response()->json(['user' => $user]);
    }

    /** Someone left or moved office. Blocked while they still hold property, so nothing is lost on paper. */
    public function disable(Request $request, User $user): JsonResponse
    {
        $this->notSelf($request, $user, 'disable');
        $this->requireStatus($user, AccountStatus::Approved, 'Only approved accounts can be disabled.');
        $this->keepOneAdmin($user);

        if ($held = $user->heldPropertyQuantity()) {
            throw ValidationException::withMessages([
                'status' => "{$user->name} still holds {$held} property unit(s). They must turn them over (and be cleared) first.",
            ]);
        }

        $user->update(['status' => AccountStatus::Disabled]);
        // Sessions live in the database: end any open login at once.
        DB::table('sessions')->where('user_id', $user->id)->delete();
        Audit::log('account.disabled', $user, ['email' => $user->email]);

        return response()->json(['user' => $user]);
    }

    public function enable(User $user): JsonResponse
    {
        $this->requireStatus($user, AccountStatus::Disabled, 'Only disabled accounts can be enabled.');

        $user->update(['status' => AccountStatus::Approved]);
        Audit::log('account.enabled', $user, ['email' => $user->email]);
        Notify::user($user, 'Account enabled', 'Your SPMU IMS account is active again. You can log in.', '/login');

        return response()->json(['user' => $user]);
    }

    public function changeRole(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['role' => ['required', Rule::enum(Role::class)]]);
        $this->notSelf($request, $user, 'change the role of');
        $role = Role::from($data['role']);

        if ($user->role === Role::Admin && $role !== Role::Admin) {
            $this->keepOneAdmin($user);
        }

        $user->update(['role' => $role]);
        Audit::log('account.role_changed', $user, ['email' => $user->email, 'role' => $role->value]);

        return response()->json(['user' => $user]);
    }

    private function notSelf(Request $request, User $user, string $verb): void
    {
        if ($request->user()->is($user)) {
            throw ValidationException::withMessages(['status' => "You cannot {$verb} your own account. Ask another admin."]);
        }
    }

    private function requireStatus(User $user, AccountStatus $status, string $message): void
    {
        if ($user->status !== $status) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }

    /** The Supply Office must never lock itself out. */
    private function keepOneAdmin(User $user): void
    {
        $others = User::where('role', Role::Admin)->where('status', AccountStatus::Approved)->whereKeyNot($user->id)->exists();

        if ($user->role === Role::Admin && ! $others) {
            throw ValidationException::withMessages(['status' => 'This is the only active admin. Make another admin first.']);
        }
    }

    private function decide(User $user, AccountStatus $status): void
    {
        if ($user->status !== AccountStatus::Pending) {
            throw ValidationException::withMessages(['status' => 'Only pending accounts can be approved or rejected.']);
        }

        $user->update(['status' => $status]);
        Audit::log("account.{$status->value}", $user, ['email' => $user->email]);
    }
}
