<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Requests\ItemRequest;
use App\Modules\Requests\RequestStatus;
use App\Modules\Stocks\Item;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RequestsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    public function test_full_flow_request_approve_issue_deducts_stock(): void
    {
        $user = User::factory()->create();
        $admin = User::factory()->admin()->create();
        $paper = Item::factory()->withQuantity(20)->create();

        $id = $this->actingAs($user)->postJson('/api/requests', [
            'purpose' => 'Seminar handouts',
            'lines' => [['item_id' => $paper->id, 'quantity' => 5]],
        ])->assertCreated()->json('request.id');

        $this->assertMatchesRegularExpression('/^RIS-\d{4}-\d{4}$/', ItemRequest::find($id)->request_no);

        $line = ItemRequest::find($id)->lines()->sole();
        $this->actingAs($admin)->postJson("/api/requests/$id/approve", [
            'lines' => [['id' => $line->id, 'quantity_approved' => 4]],
        ])->assertOk();

        $this->assertSame(20, $paper->fresh()->quantity, 'Approval must not deduct stock.');

        $this->actingAs($admin)->postJson("/api/requests/$id/issue", ['received_by' => 'Ana Cruz'])
            ->assertOk()
            ->assertJsonPath('request.status', 'issued');

        $this->assertSame(16, $paper->fresh()->quantity);
    }

    public function test_cannot_request_more_than_available(): void
    {
        $item = Item::factory()->withQuantity(2)->create();

        $this->actingAs(User::factory()->create())->postJson('/api/requests', [
            'purpose' => 'x', 'lines' => [['item_id' => $item->id, 'quantity' => 3]],
        ])->assertUnprocessable()->assertJsonValidationErrors('lines.0.quantity');
    }

    public function test_issue_fails_without_change_when_stock_ran_out_after_approval(): void
    {
        $admin = User::factory()->admin()->create();
        $item = Item::factory()->withQuantity(5)->create();
        $other = Item::factory()->withQuantity(5)->create();

        $id = $this->actingAs(User::factory()->create())->postJson('/api/requests', [
            'purpose' => 'x', 'lines' => [
                ['item_id' => $other->id, 'quantity' => 2],
                ['item_id' => $item->id, 'quantity' => 5],
            ],
        ])->json('request.id');
        $this->actingAs($admin)->postJson("/api/requests/$id/approve")->assertOk();

        $item->forceFill(['quantity' => 1])->save();

        $this->actingAs($admin)->postJson("/api/requests/$id/issue", ['received_by' => 'A'])->assertUnprocessable();

        $this->assertSame(5, $other->fresh()->quantity, 'Whole issue rolls back.');
        $this->assertSame(RequestStatus::Approved, ItemRequest::find($id)->status);
    }

    public function test_personnel_see_only_their_own_requests(): void
    {
        $item = Item::factory()->withQuantity(10)->create();
        [$a, $b] = User::factory()->count(2)->create();

        $id = $this->actingAs($a)->postJson('/api/requests', [
            'purpose' => 'mine', 'lines' => [['item_id' => $item->id, 'quantity' => 1]],
        ])->json('request.id');

        $this->actingAs($b)->getJson('/api/requests')->assertJsonCount(0, 'data');
        $this->actingAs($b)->getJson("/api/requests/$id")->assertForbidden();
        $this->actingAs($b)->postJson("/api/requests/$id/cancel")->assertForbidden();
        $this->actingAs($b)->postJson("/api/requests/$id/approve")->assertForbidden();
    }

    public function test_reject_needs_a_reason(): void
    {
        $item = Item::factory()->withQuantity(10)->create();
        $id = $this->actingAs(User::factory()->create())->postJson('/api/requests', [
            'purpose' => 'x', 'lines' => [['item_id' => $item->id, 'quantity' => 1]],
        ])->json('request.id');

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->postJson("/api/requests/$id/reject")->assertJsonValidationErrors('remarks');
        $this->actingAs($admin)->postJson("/api/requests/$id/reject", ['remarks' => 'Out of budget'])->assertOk();
    }
}
