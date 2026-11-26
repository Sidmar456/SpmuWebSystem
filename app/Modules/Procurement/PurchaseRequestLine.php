<?php

namespace App\Modules\Procurement;

use App\Modules\Stocks\Item;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequestLine extends Model
{
    protected $fillable = ['inquiry_line_id', 'description', 'unit', 'quantity', 'unit_cost'];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    protected function casts(): array
    {
        return ['quantity' => 'integer', 'unit_cost' => 'decimal:2', 'quantity_accepted' => 'integer'];
    }

    public function purchaseRequest(): BelongsTo
    {
        return $this->belongsTo(PurchaseRequest::class);
    }
}
