<?php

namespace Database\Factories;

use App\Modules\Stocks\Item;
use App\Modules\Stocks\ItemType;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Item> */
class ItemFactory extends Factory
{
    protected $model = Item::class;

    public function definition(): array
    {
        return [
            'stock_no' => 'SN-'.fake()->unique()->numerify('#####'),
            'name' => fake()->words(2, true),
            'unit' => 'piece',
            'category' => 'Office supplies',
            'type' => ItemType::Consumable,
            'reorder_level' => 5,
        ];
    }

    public function property(): static
    {
        return $this->state(['type' => ItemType::Property, 'unit' => 'unit', 'category' => 'Equipment']);
    }

    /** quantity is not fillable, so set it after create like the ledger would. */
    public function withQuantity(int $quantity): static
    {
        return $this->afterCreating(fn (Item $item) => $item->forceFill(['quantity' => $quantity])->save());
    }
}
