<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Requests\ItemRequest;
use App\Modules\Stocks\Item;
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

        $id = $this->actingAs($this->user)->postJson('/api/turnovers', [
            'item_request_line_id' => $lineId, 'quantity' => 1,
            'reason' => 'unserviceable', 'condition' => 'unserviceable',
        ])->json('turnover.id');

        $this->actingAs($this->admin)->postJson("/api/turnovers/$id/receive")->assertOk();

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
}
