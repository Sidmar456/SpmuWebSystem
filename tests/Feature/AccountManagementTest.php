<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Accounts\AccountStatus;
use App\Modules\Accounts\Role;
use App\Modules\Notifications\SupplyNotification;
use App\Modules\Requests\ItemRequest;
use App\Modules\Stocks\Item;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class AccountManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    public function test_disable_logs_the_person_out_and_enable_brings_them_back(): void
    {
        $admin = User::factory()->admin()->create();
        $ana = User::factory()->create(['email' => 'ana@zppsu.edu.ph', 'password' => 'secret-pass']);

        // Ana is logged in on her own browser.
        $this->actingAs($ana)->getJson('/api/me')->assertOk();

        $this->actingAs($admin)->postJson("/api/accounts/{$ana->id}/disable")->assertOk();
        $this->assertSame(AccountStatus::Disabled, $ana->fresh()->status);

        // Her open session stops working, and she cannot log in again.
        $this->actingAs($ana->fresh())->getJson('/api/me')->assertUnauthorized();
        $this->app['auth']->forgetGuards();
        $this->postJson('/api/login', ['email' => 'ana@zppsu.edu.ph', 'password' => 'secret-pass'])
            ->assertUnprocessable()
            ->assertJsonPath('errors.email.0', 'Your account is disabled. Please contact the Supply Office.');

        $this->actingAs($admin)->postJson("/api/accounts/{$ana->id}/enable")->assertOk();
        $this->assertSame(AccountStatus::Approved, $ana->fresh()->status);
        $this->assertSame(['account.disabled', 'account.enabled'], DB::table('audit_logs')->pluck('action')->all());
    }

    public function test_cannot_disable_someone_who_still_holds_property(): void
    {
        $admin = User::factory()->admin()->create();
        $ana = User::factory()->create();
        $projector = Item::factory()->property()->withQuantity(3)->create();

        $request = ItemRequest::create(['user_id' => $ana->id, 'purpose' => 'x', 'status' => 'issued']);
        $request->lines()->create(['item_id' => $projector->id, 'quantity_requested' => 1, 'quantity_approved' => 1])
            ->forceFill(['quantity_issued' => 1])->save();

        $this->actingAs($admin)->postJson("/api/accounts/{$ana->id}/disable")
            ->assertUnprocessable()
            ->assertJsonPath('errors.status.0', "{$ana->name} still holds 1 property unit(s). They must turn them over (and be cleared) first.");
    }

    public function test_clearance_lists_what_is_still_held_and_only_self_or_admin_can_see_it(): void
    {
        $admin = User::factory()->admin()->create();
        $ana = User::factory()->create();
        $ben = User::factory()->create();

        $this->actingAs($ana)->getJson("/api/clearance/{$ana->id}")->assertOk()->assertJsonCount(0, 'holdings');
        $this->actingAs($ben)->getJson("/api/clearance/{$ana->id}")->assertForbidden();

        $projector = Item::factory()->property()->withQuantity(3)->create();
        $request = ItemRequest::create(['user_id' => $ana->id, 'purpose' => 'x', 'status' => 'issued']);
        $request->lines()->create(['item_id' => $projector->id, 'quantity_requested' => 2, 'quantity_approved' => 2])
            ->forceFill(['quantity_issued' => 2])->save();

        $this->actingAs($admin)->getJson("/api/clearance/{$ana->id}")->assertOk()
            ->assertJsonCount(1, 'holdings')
            ->assertJsonPath('holdings.0.quantity_issued', 2);
    }

    public function test_waiting_reminder_and_dashboard_age(): void
    {
        $admin = User::factory()->admin()->create();
        $ana = User::factory()->create();

        $this->artisan('spmu:waiting')->expectsOutput('Nothing is waiting too long.')->assertSuccessful();

        $this->travelTo(now()->subDays(5));
        ItemRequest::create(['user_id' => $ana->id, 'purpose' => 'x', 'status' => 'pending']);
        $this->travelBack();

        $this->artisan('spmu:waiting')->expectsOutput('Reminded admins: 1 requests to review.')->assertSuccessful();
        Notification::assertSentTo($admin, SupplyNotification::class, fn ($n) => str_contains($n->message, '1 requests to review'));

        $this->actingAs($admin)->getJson('/api/dashboard')->assertOk()->assertJsonPath('counts.pending_requests', 1)
            ->assertJsonStructure(['oldest' => ['pending_requests', 'to_issue', 'pending_turnovers', 'pending_accounts']]);
    }

    public function test_role_change_and_the_last_admin_is_protected(): void
    {
        $admin = User::factory()->admin()->create();
        $ben = User::factory()->create();

        $this->actingAs($admin)->postJson("/api/accounts/{$admin->id}/role", ['role' => 'user'])->assertUnprocessable();
        $this->postJson("/api/accounts/{$admin->id}/disable")->assertUnprocessable();

        $this->postJson("/api/accounts/{$ben->id}/role", ['role' => 'admin'])->assertOk();
        $this->assertSame(Role::Admin, $ben->fresh()->role);

        // Now Ben may demote the first admin, but not himself as the last one.
        $this->actingAs($ben->fresh())->postJson("/api/accounts/{$admin->id}/role", ['role' => 'user'])->assertOk();
        $this->actingAs($admin->fresh())->postJson("/api/accounts/{$ben->id}/role", ['role' => 'user'])->assertForbidden();
    }

    public function test_admin_can_make_a_bac_validator_who_has_no_admin_access(): void
    {
        $admin = User::factory()->admin()->create();
        $carla = User::factory()->create();

        $this->actingAs($admin)->postJson("/api/accounts/{$carla->id}/role", ['role' => 'validator'])->assertOk();
        $this->assertSame(Role::Validator, $carla->fresh()->role);

        $this->actingAs($carla->fresh())->getJson('/api/accounts')->assertForbidden();
    }
}
