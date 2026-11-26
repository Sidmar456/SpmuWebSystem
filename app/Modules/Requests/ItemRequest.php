<?php

namespace App\Modules\Requests;

use App\Models\User;
use App\Support\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Requisition and Issue Slip (RIS). */
class ItemRequest extends Model
{
    protected $fillable = ['user_id', 'office', 'purpose', 'status', 'remarks'];

    protected function casts(): array
    {
        return [
            'status' => RequestStatus::class,
            'decided_at' => 'datetime',
            'issued_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(fn (ItemRequest $request) => $request->request_no = Sequence::number('RIS'));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(ItemRequestLine::class);
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }

    public function issuer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }
}
