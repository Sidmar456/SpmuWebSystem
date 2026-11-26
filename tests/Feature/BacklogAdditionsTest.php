<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Notifications\SupplyNotification;
use App\Modules\Requests\ItemRequest;
use App\Modules\Stocks\Item;
use App\Modules\Stocks\MovementType;
use App\Modules\Stocks\StockLedger;
use App\Modules\Suppliers\Supplier;
use App\Modules\Suppliers\SupplierOrderMail;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/** S1.5, S1.6, S2.5, S3.3, S4.7, S6.3, S6.4. */
class BacklogAdditionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    public function test_sign_up_requires_the_privacy_notice(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Ana', 'email' => 'ana@zppsu.edu.ph', 'office' => 'CoE',
            'password' => 'secret-pass', 'password_confirmation' => 'secret-pass',
        ])->assertUnprocessable()->assertJsonValidationErrors('privacy_accepted');
    }

    public function test_forgot_password_does_not_reveal_accounts_and_reset_works(): void
    {
        $user = User::factory()->create(['email' => 'ana@zppsu.edu.ph']);

        $known = $this->postJson('/api/forgot-password', ['email' => 'ana@zppsu.edu.ph'])->assertOk()->json('message');
        $unknown = $this->postJson('/api/forgot-password', ['email' => 'nobody@zppsu.edu.ph'])->assertOk()->json('message');
        $this->assertSame($known, $unknown);

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $n) use (&$token, $user) {
            $token = $n->token;

            return str_contains($n->toMail($user)->actionUrl, '/reset-password?token=');
        });

        $this->postJson('/api/reset-password', ['token' => 'wrong', 'email' => $user->email, 'password' => 'new-secret', 'password_confirmation' => 'new-secret'])
            ->assertUnprocessable();
        $this->postJson('/api/reset-password', ['token' => $token, 'email' => $user->email, 'password' => 'new-secret', 'password_confirmation' => 'new-secret'])
            ->assertOk();

        $this->assertTrue(Hash::check('new-secret', $user->fresh()->password));
    }

    public function test_low_stock_command_notifies_admins_only_when_needed(): void
    {
        $admin = User::factory()->admin()->create();

        $this->artisan('spmu:low-stock')->expectsOutput('No low-stock items.')->assertSuccessful();
        Notification::assertNothingSent();

        Item::factory()->withQuantity(2)->create(['name' => 'Ink']);
        $this->artisan('spmu:low-stock')->assertSuccessful();
        Notification::assertSentTo($admin, SupplyNotification::class, fn ($n) => str_contains($n->message, 'Ink (2 piece)'));
    }

    public function test_request_numbers_restart_each_year(): void
    {
        $user = User::factory()->create();
        $make = fn () => ItemRequest::create(['user_id' => $user->id, 'purpose' => 'x', 'status' => 'pending'])->request_no;

        $this->travelTo('2026-12-31 10:00');
        $this->assertSame(['RIS-2026-0001', 'RIS-2026-0002'], [$make(), $make()]);

        $this->travelTo('2027-01-02 10:00');
        $this->assertSame('RIS-2027-0001', $make());
    }

    public function test_monthly_stock_report_csv(): void
    {
        $admin = User::factory()->admin()->create();
        $item = Item::factory()->create(['stock_no' => 'OS-1', 'name' => 'Paper']);
        $ledger = app(StockLedger::class);

        $this->travelTo('2026-10-15');
        $ledger->move($item, 10, MovementType::StockIn, $admin);
        $this->travelTo('2026-11-10');
        $ledger->move($item, 5, MovementType::StockIn, $admin);
        $ledger->move($item, -3, MovementType::Issue, $admin);
        $ledger->move($item, -1, MovementType::Adjustment, $admin, remarks: 'Damaged');
        $this->travelTo('2026-12-01');
        $ledger->move($item, -2, MovementType::Issue, $admin);

        $csv = $this->actingAs($admin)->get('/api/reports/stock?month=2026-11')->assertOk()->streamedContent();

        // Opening 10, +5 in, 3 issued, -1 adjusted, closing 11. The December issue is not counted.
        $this->assertStringContainsString('OS-1,Paper,piece,10,5,3,0,-1,11', $csv);
        $this->actingAs(User::factory()->create())->get('/api/reports/stock?month=2026-11')->assertForbidden();
    }

    public function test_stock_request_is_emailed_and_delivery_adds_stock(): void
    {
        $admin = User::factory()->admin()->create();
        $supplier = Supplier::create(['name' => 'ABC Trading', 'email' => 'sales@abc.test']);
        $paper = Item::factory()->create(['supplier_id' => $supplier->id]);
        $ink = Item::factory()->create(['supplier_id' => $supplier->id]);
        $other = Item::factory()->create();

        $this->actingAs($admin)->postJson("/api/suppliers/{$supplier->id}/orders", ['lines' => [['item_id' => $other->id, 'quantity' => 1]]])
            ->assertUnprocessable()->assertJsonValidationErrors('lines.0.item_id');

        $order = $this->postJson("/api/suppliers/{$supplier->id}/orders", ['lines' => [
            ['item_id' => $paper->id, 'quantity' => 10],
            ['item_id' => $ink->id, 'quantity' => 4],
        ]])->assertCreated()->json('order');

        $this->assertMatchesRegularExpression('/^SR-\d{4}-0001$/', $order['order_no']);
        Notification::assertSentOnDemand(SupplierOrderMail::class, fn ($n, $channels, $notifiable) => array_key_exists('sales@abc.test', $notifiable->routes['mail']));

        // Ink came short: 3 of 4.
        $inkLine = collect($order['lines'])->firstWhere('item_id', $ink->id)['id'];
        $this->postJson("/api/supplier-orders/{$order['id']}/deliver", ['lines' => [['id' => $inkLine, 'quantity_received' => 3]]])->assertOk();

        $this->assertSame([10, 3], [$paper->fresh()->quantity, $ink->fresh()->quantity]);
        $this->postJson("/api/supplier-orders/{$order['id']}/deliver")->assertUnprocessable();
        $this->deleteJson("/api/suppliers/{$supplier->id}")->assertUnprocessable();
    }

    public function test_account_and_supplier_changes_are_audited(): void
    {
        $admin = User::factory()->admin()->create();
        $pending = User::factory()->create(['status' => 'pending']);

        $this->actingAs($admin)->postJson("/api/accounts/{$pending->id}/approve")->assertOk();
        $id = $this->postJson('/api/suppliers', ['name' => 'ABC Trading'])->assertCreated()->json('supplier.id');
        $this->putJson("/api/suppliers/$id", ['name' => 'ABC Trading Corp.'])->assertOk();
        $this->deleteJson("/api/suppliers/$id")->assertOk();

        $this->assertSame(
            ['account.approved', 'supplier.created', 'supplier.updated', 'supplier.deleted'],
            DB::table('audit_logs')->orderBy('id')->pluck('action')->all(),
        );
        $this->assertSame($admin->id, DB::table('audit_logs')->value('user_id'));
        $this->assertNull(Supplier::find($id));
    }
}
