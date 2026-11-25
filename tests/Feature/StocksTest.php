<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Stocks\Item;
use App\Modules\Stocks\MovementType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StocksTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_adds_item_with_initial_stock_and_a_movement_is_logged(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/items', [
                'stock_no' => 'OS-001',
                'name' => 'Bond paper A4',
                'unit' => 'ream',
                'type' => 'consumable',
                'reorder_level' => 10,
                'initial_quantity' => 50,
            ])
            ->assertCreated()
            ->assertJsonPath('item.quantity', 50)
            ->assertJsonPath('item.stock_status', 'in_stock');

        $item = Item::firstWhere('stock_no', 'OS-001');
        $this->assertSame(MovementType::StockIn, $item->movements()->sole()->type);
    }

    public function test_empty_item_form_reports_every_missing_field_at_once(): void
    {
        $this->actingAs(User::factory()->admin()->create())
            ->postJson('/api/items', [])
            ->assertJsonValidationErrors(['stock_no', 'name', 'unit', 'type', 'reorder_level']);
    }

    public function test_quantity_cannot_be_set_directly_through_update(): void
    {
        $item = Item::factory()->withQuantity(5)->create();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/items/{$item->id}", [
                'stock_no' => $item->stock_no, 'name' => $item->name, 'unit' => 'piece',
                'type' => 'consumable', 'reorder_level' => 1, 'quantity' => 999,
            ])->assertOk();

        $this->assertSame(5, $item->fresh()->quantity);
    }

    public function test_adjustment_cannot_make_stock_negative(): void
    {
        $item = Item::factory()->withQuantity(3)->create();

        $this->actingAs(User::factory()->admin()->create())
            ->postJson("/api/items/{$item->id}/adjust", ['quantity' => -4, 'remarks' => 'Count'])
            ->assertUnprocessable();

        $this->assertSame(3, $item->fresh()->quantity);
    }

    public function test_low_stock_filter_and_status(): void
    {
        Item::factory()->withQuantity(2)->create(['name' => 'Ink', 'reorder_level' => 5]);
        Item::factory()->withQuantity(50)->create(['name' => 'Paper', 'reorder_level' => 5]);

        $this->actingAs(User::factory()->create())
            ->getJson('/api/items?status=low_stock')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Ink')
            ->assertJsonPath('data.0.stock_status', 'low_stock');
    }

    public function test_personnel_cannot_change_stock(): void
    {
        $item = Item::factory()->withQuantity(3)->create();

        $this->actingAs(User::factory()->create())
            ->postJson("/api/items/{$item->id}/stock-in", ['quantity' => 10])
            ->assertForbidden();
    }
}
