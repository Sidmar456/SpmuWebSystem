<?php

namespace App\Modules\Turnovers;

use App\Models\User;
use App\Modules\Requests\ItemRequestLine;
use App\Support\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Property Return Slip (PRS). */
class Turnover extends Model
{
    protected $fillable = ['user_id', 'item_request_line_id', 'quantity', 'reason', 'condition', 'remarks'];

    protected function casts(): array
    {
        return [
            'status' => TurnoverStatus::class,
            'reason' => TurnoverReason::class,
            'condition' => ItemCondition::class,
            'quantity' => 'integer',
            'decided_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(fn (Turnover $turnover) => $turnover->turnover_no = Sequence::number('PRS'));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function line(): BelongsTo
    {
        return $this->belongsTo(ItemRequestLine::class, 'item_request_line_id');
    }

    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
