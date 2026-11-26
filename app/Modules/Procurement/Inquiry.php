<?php

namespace App\Modules\Procurement;

use App\Models\User;
use App\Support\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Supplies Availability Inquiry (SAI). */
class Inquiry extends Model
{
    protected $fillable = ['user_id', 'office', 'purpose'];

    protected function casts(): array
    {
        return ['status' => InquiryStatus::class, 'answered_at' => 'datetime'];
    }

    protected static function booted(): void
    {
        static::creating(fn (Inquiry $inquiry) => $inquiry->inquiry_no = Sequence::number('SAI'));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(InquiryLine::class);
    }

    public function answerer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'answered_by');
    }
}
