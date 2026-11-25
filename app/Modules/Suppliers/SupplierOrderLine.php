<?php

namespace App\Modules\Suppliers;

use App\Modules\Stocks\Item;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupplierOrderLine extends Model
{
    public $timestamps = false;

    protected $fillable = ['item_id', 'quantity'];

    protected function casts(): array
    {
        return ['quantity' => 'integer', 'quantity_received' => 'integer'];
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }
}
