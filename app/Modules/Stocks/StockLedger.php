<?php

namespace App\Modules\Stocks;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The only place that changes items.quantity. Every change is locked and leaves a stock_movements row.
 */
class StockLedger
{
    public function move(
        Item $item,
        int $quantity,
        MovementType $type,
        ?User $by = null,
        ?Model $reference = null,
        ?string $remarks = null,
    ): StockMovement {
        return DB::transaction(function () use ($item, $quantity, $type, $by, $reference, $remarks) {
            $locked = Item::whereKey($item->getKey())->lockForUpdate()->firstOrFail();
            $balance = $locked->quantity + $quantity;

            if ($balance < 0) {
                throw ValidationException::withMessages([
                    'quantity' => "Not enough stock for {$locked->name}. Available: {$locked->quantity} {$locked->unit}.",
                ]);
            }

            $locked->forceFill(['quantity' => $balance])->save();
            $item->setRawAttributes($locked->getAttributes(), true);

            return $locked->movements()->create([
                'user_id' => $by?->id,
                'type' => $type,
                'quantity' => $quantity,
                'balance_after' => $balance,
                'reference_type' => $reference?->getMorphClass(),
                'reference_id' => $reference?->getKey(),
                'remarks' => $remarks,
            ]);
        });
    }
}
