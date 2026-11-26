<?php

namespace App\Modules\Procurement;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class InquiryLine extends Model
{
    protected $fillable = ['description', 'unit', 'quantity'];

    protected function casts(): array
    {
        return ['availability' => Availability::class, 'quantity' => 'integer'];
    }

    public function purchaseRequestLine(): HasOne
    {
        return $this->hasOne(PurchaseRequestLine::class);
    }

    public function inquiry(): BelongsTo
    {
        return $this->belongsTo(Inquiry::class);
    }
}
