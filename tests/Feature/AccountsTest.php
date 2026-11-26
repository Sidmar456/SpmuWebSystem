<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Accounts\AccountStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountsTest extends TestCase
{
    use RefreshDatabase;

    public function test_sign_up_creates_a_pending_account_that_cannot_log_in(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Ana Cruz',
            'email' => 'ana@zppsu.edu.ph',
            'office' => 'College of Engineering',
            'password' => 'secret-pass',
            'password_confirmation' => 'secret-pass',
            'privacy_accepted' => true,
        ])->assertCreated();

        $this->assertSame(AccountStatus::Pending, User::firstWhere('email', 'ana@zppsu.edu.ph')->status);
        $this->assertNotNull(User::firstWhere('email', 'ana@zppsu.edu.ph')->privacy_accepted_at);

        $this->postJson('/api/login', ['email' => 'ana@zppsu.edu.ph', 'password' => 'secret-pass'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Your account is still waiting for approval.');
    }

    public function test_wrong_password_does_not_reveal_account_status(): void
    {
        User::factory()->create(['email' => 'p@zppsu.edu.ph', 'status' => AccountStatus::Pending]);

        $this->postJson('/api/login', ['email' => 'p@zppsu.edu.ph', 'password' => 'wrong-password'])
            ->assertJsonPath('errors.email.0', 'Invalid email or password.');
    }

    public function test_approved_user_logs_in(): void
    {
        User::factory()->create(['email' => 'ok@zppsu.edu.ph']);

        $this->postJson('/api/login', ['email' => 'ok@zppsu.edu.ph', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('user.email', 'ok@zppsu.edu.ph')
            ->assertJsonMissingPath('user.password');
    }

    public function test_only_admin_approves_accounts(): void
    {
        $pending = User::factory()->create(['status' => AccountStatus::Pending]);

        $this->actingAs(User::factory()->create())
            ->postJson("/api/accounts/{$pending->id}/approve")->assertForbidden();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/accounts/{$pending->id}/approve")->assertOk();

        $this->assertSame(AccountStatus::Approved, $pending->fresh()->status);
    }

    public function test_guest_gets_401_not_a_redirect(): void
    {
        $this->getJson('/api/items')->assertUnauthorized();
        $this->get('/api/items')->assertUnauthorized();
    }
}
