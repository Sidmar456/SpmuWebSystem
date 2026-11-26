<?php

namespace App\Modules\Suppliers;

use App\Models\User;
use App\Support\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A stock request sent to a supplier by email (S3.3). Numbered SR-YYYY-NNNN. */
class SupplierOrder extends Model
{
    protected $fillable = ['supplier_id', 'user_id', 'notes'];

    protected function casts(): array
    {
        return ['delivered_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(fn (SupplierOrder $order) => $order->order_no = Sequence::number('SR'));
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(SupplierOrderLine::class);
    }
}
