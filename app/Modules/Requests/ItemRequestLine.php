<?php

namespace App\Modules\Requests;

use App\Modules\Stocks\Item;
use App\Modules\Turnovers\Turnover;
use App\Modules\Turnovers\TurnoverStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ItemRequestLine extends Model
{
    protected $fillable = ['item_id', 'quantity_requested', 'quantity_approved'];

    protected function casts(): array
    {
        return [
            'quantity_requested' => 'integer',
            'quantity_approved' => 'integer',
            'quantity_issued' => 'integer',
            'quantity_returned' => 'integer',
        ];
    }

    public function request(): BelongsTo
    {
        return $this->belongsTo(ItemRequest::class, 'item_request_id');
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function turnovers(): HasMany
    {
        return $this->hasMany(Turnover::class);
    }

    /** Units still held by the requester and not already in a pending turnover. */
    public function turnableQuantity(): int
    {
        $pending = $this->turnovers()->where('status', TurnoverStatus::Pending)->sum('quantity');

        return max(0, $this->quantity_issued - $this->quantity_returned - (int) $pending);
    }
}
