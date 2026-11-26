<?php

namespace App\Modules\Stocks;

use App\Modules\Suppliers\Supplier;
use Database\Factories\ItemFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Item extends Model
{
    use HasFactory;

    // quantity is left out on purpose: only StockLedger changes it.
    protected $fillable = [
        'stock_no', 'name', 'description', 'unit', 'category', 'type',
        'reorder_level', 'supplier_id', 'image_path',
    ];

    protected $appends = ['stock_status'];

    protected function casts(): array
    {
        return [
            'type' => ItemType::class,
            'quantity' => 'integer',
            'reorder_level' => 'integer',
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function getStockStatusAttribute(): string
    {
        return match (true) {
            $this->quantity === 0 => 'out_of_stock',
            $this->quantity <= $this->reorder_level => 'low_stock',
            default => 'in_stock',
        };
    }

    public function scopeLowStock(Builder $query): Builder
    {
        return $query->whereColumn('quantity', '<=', 'reorder_level');
    }

    protected static function newFactory()
    {
        return ItemFactory::new();
    }
}
