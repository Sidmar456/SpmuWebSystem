<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Requests\ItemRequest;
use App\Modules\Stocks\Item;
use App\Modules\Turnovers\Iirup;
use App\Modules\Turnovers\Turnover;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class TurnoversTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->user = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
    }

    /** Issue $quantity of $item to $this->user and return the request line id. */
    private function issue(Item $item, int $quantity): int
    {
        $id = $this->actingAs($this->user)->postJson('/api/requests', [
            'purpose' => 'Office use', 'lines' => [['item_id' => $item->id, 'quantity' => $quantity]],
        ])->json('request.id');
        $this->actingAs($this->admin)->postJson("/api/requests/$id/approve");
        $this->actingAs($this->admin)->postJson("/api/requests/$id/issue", ['received_by' => 'Ana']);

        return ItemRequest::find($id)->lines()->sole()->id;
    }

    public function test_serviceable_turnover_returns_stock(): void
    {
        $projector = Item::factory()->property()->withQuantity(3)->create();
        $lineId = $this->issue($projector, 2);
        $this->assertSame(1, $projector->fresh()->quantity);

        $this->actingAs($this->user)->getJson('/api/turnovers/holdings')
            ->assertJsonPath('data.0.turnable_quantity', 2);

        $id = $this->actingAs($this->user)->postJson('/api/turnovers', [
            'item_request_line_id' => $lineId, 'quantity' => 1,
            'reason' => 'no_longer_needed', 'condition' => 'serviceable',
        ])->assertCreated()->json('turnover.id');

        $this->assertMatchesRegularExpression('/^PRS-\d{4}-\d{4}$/', Turnover::find($id)->turnover_no);

        $this->actingAs($this->admin)->postJson("/api/turnovers/$id/receive")->assertOk()
            ->assertJsonPath('turnover.status', 'received');

        $this->assertSame(2, $projector->fresh()->quantity);
        $this->actingAs($this->user)->getJson('/api/turnovers/holdings')
            ->assertJsonPath('data.0.turnable_quantity', 1);
    }

    public function test_unserviceable_turnover_does_not_return_stock(): void
    {
        $chair = Item::factory()->property()->withQuantity(1)->create();
        $lineId = $this->issue($chair, 1);

        // Without a pre-inspection the person cannot declare it unserviceable...
        $this->actingAs($this->user)->postJson('/api/turnovers', [
            'item_request_line_id' => $lineId, 'quantity' => 1, 'reason' => 'unserviceable', 'condition' => 'unserviceable',
        ])->assertJsonValidationErrors('condition');

        // ...but the counter may find it unserviceable on receipt.
        $id = $this->actingAs($this->user)->postJson('/api/turnovers', [
            'item_request_line_id' => $lineId, 'quantity' => 1, 'reason' => 'no_longer_needed', 'condition' => 'serviceable',
        ])->json('turnover.id');

        $this->actingAs($this->admin)->postJson("/api/turnovers/$id/receive", ['condition' => 'unserviceable'])->assertOk();

        $this->assertSame(0, $chair->fresh()->quantity);
        $this->actingAs($this->user)->getJson('/api/turnovers/holdings')->assertJsonCount(0, 'data');
    }

    public function test_cannot_turn_over_more_than_held_including_pending(): void
    {
        $item = Item::factory()->property()->withQuantity(5)->create();
        $lineId = $this->issue($item, 2);
        $body = ['item_request_line_id' => $lineId, 'reason' => 'transfer', 'condition' => 'serviceable'];

        $this->actingAs($this->user)->postJson('/api/turnovers', $body + ['quantity' => 2])->assertCreated();
        $this->actingAs($this->user)->postJson('/api/turnovers', $body + ['quantity' => 1])
            ->assertJsonValidationErrors('quantity');
    }

    public function test_consumables_and_other_peoples_items_cannot_be_turned_over(): void
    {
        $paper = Item::factory()->withQuantity(5)->create();
        $lineId = $this->issue($paper, 1);
        $body = ['item_request_line_id' => $lineId, 'quantity' => 1, 'reason' => 'other', 'condition' => 'serviceable'];

        $this->actingAs($this->user)->postJson('/api/turnovers', $body)
            ->assertJsonValidationErrors('item_request_line_id');

        $projector = Item::factory()->property()->withQuantity(1)->create();
        $body['item_request_line_id'] = $this->issue($projector, 1);

        $this->actingAs(User::factory()->create())->postJson('/api/turnovers', $body)
            ->assertJsonValidationErrors('item_request_line_id');
    }

    public function test_history_lists_requests_and_turnovers_for_owner_only(): void
    {
        $item = Item::factory()->property()->withQuantity(2)->create();
        $lineId = $this->issue($item, 1);
        $this->actingAs($this->user)->postJson('/api/turnovers', [
            'item_request_line_id' => $lineId, 'quantity' => 1, 'reason' => 'transfer', 'condition' => 'serviceable',
        ]);

        $this->actingAs($this->user)->getJson('/api/history')->assertJsonCount(2, 'data');
        $this->actingAs(User::factory()->create())->getJson('/api/history')->assertJsonCount(0, 'data');
        $this->actingAs($this->admin)->getJson("/api/history?user_id={$this->user->id}")->assertJsonCount(2, 'data');
    }

    public function test_unserviceable_register_and_are_number(): void
    {
        $chair = Item::factory()->property()->withQuantity(2)->create();
        $submit = function () use ($chair) {
            $lineId = $this->issue($chair, 1); // acts as admin, so issue before acting as the user

            return $this->actingAs($this->user)->postJson('/api/turnovers', [
                'item_request_line_id' => $lineId, 'quantity' => 1, 'reason' => 'other', 'condition' => 'serviceable',
            ])->json('turnover.id');
        };
        $broken = $submit();
        $working = $submit();
        $this->actingAs($this->admin)->postJson("/api/turnovers/$broken/receive", ['condition' => 'unserviceable']);
        $this->actingAs($this->admin)->postJson("/api/turnovers/$working/receive");

        $this->actingAs($this->admin)->getJson('/api/turnovers?status=received&condition=unserviceable')
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $broken);

        $this->actingAs($this->admin)->postJson("/api/turnovers/$broken/are", ['are_no' => 'ARE-2026-015'])
            ->assertOk()->assertJsonPath('turnover.are_no', 'ARE-2026-015');
        $this->actingAs($this->admin)->postJson("/api/turnovers/$working/are", ['are_no' => 'x'])->assertJsonValidationErrors('are_no');
        $this->actingAs($this->user)->postJson("/api/turnovers/$broken/are", ['are_no' => 'x'])->assertForbidden();
    }

    /** A received unserviceable turnover (found at the counter) and its id. */
    private function unserviceable(?string $areNo = null): int
    {
        $lineId = $this->issue(Item::factory()->property()->withQuantity(1)->create(), 1);
        $id = $this->actingAs($this->user)->postJson('/api/turnovers', [
            'item_request_line_id' => $lineId, 'quantity' => 1, 'reason' => 'other', 'condition' => 'serviceable',
        ])->json('turnover.id');
        $this->actingAs($this->admin)->postJson("/api/turnovers/$id/receive", ['condition' => 'unserviceable']);
        if ($areNo) {
            $this->actingAs($this->admin)->postJson("/api/turnovers/$id/are", ['are_no' => $areNo]);
        }

        return $id;
    }

    public function test_iirup_consolidates_register_items_then_disposal(): void
    {
        $a = $this->unserviceable('ARE-1');
        $b = $this->unserviceable('ARE-2');
        $noAre = $this->unserviceable();

        $this->actingAs($this->admin)->postJson('/api/iirups', ['turnover_ids' => [$a, $noAre]])->assertJsonValidationErrors('turnover_ids');

        $id = $this->actingAs($this->admin)->postJson('/api/iirups', ['turnover_ids' => [$a, $b]])
            ->assertCreated()->assertJsonPath('iirup.status', 'submitted')->assertJsonPath('iirup.turnovers_count', 2)->json('iirup.id');
        $this->assertMatchesRegularExpression('/^IIRUP-\d{4}-\d{4}$/', Iirup::find($id)->iirup_no);

        // Already consolidated items leave the register and cannot go in a second IIRUP.
        $this->actingAs($this->admin)->getJson('/api/turnovers?status=received&condition=unserviceable&unconsolidated=1')
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $noAre);
        $this->actingAs($this->admin)->postJson('/api/iirups', ['turnover_ids' => [$a]])->assertJsonValidationErrors('turnover_ids');
        $this->actingAs($this->admin)->postJson("/api/turnovers/$a/are", ['are_no' => 'ARE-9'])->assertJsonValidationErrors('are_no');

        $this->actingAs($this->admin)->postJson("/api/iirups/$id/dispose", ['disposal_method' => 'sale', 'disposed_on' => now()->toDateString()])
            ->assertJsonValidationErrors('status');
        $this->actingAs($this->admin)->postJson("/api/iirups/$id/schedule", ['disposal_date' => now()->toDateString()])
            ->assertOk()->assertJsonPath('iirup.status', 'scheduled');
        $this->actingAs($this->admin)->postJson("/api/iirups/$id/dispose", ['disposal_method' => 'melting', 'disposed_on' => now()->toDateString()])
            ->assertJsonValidationErrors('disposal_method');
        $this->actingAs($this->admin)->postJson("/api/iirups/$id/dispose", ['disposal_method' => 'destruction', 'disposed_on' => now()->toDateString()])
            ->assertOk()->assertJsonPath('iirup.status', 'disposed');
        $this->actingAs($this->admin)->postJson("/api/iirups/$id/schedule", ['disposal_date' => now()->toDateString()])->assertJsonValidationErrors('status');

        $this->actingAs($this->user)->getJson("/api/turnovers/$a")->assertJsonPath('turnover.iirup.status', 'disposed');
        $this->actingAs($this->user)->getJson('/api/iirups')->assertForbidden();
    }
}
