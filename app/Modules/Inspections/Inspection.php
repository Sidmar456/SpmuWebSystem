<?php

namespace App\Modules\Inspections;

use App\Models\User;
use App\Modules\Procurement\PurchaseRequest;
use App\Modules\Requests\ItemRequestLine;
use App\Modules\Turnovers\Turnover;
use App\Support\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Pre-inspection request and report (PIR). */
class Inspection extends Model
{
    protected $fillable = ['user_id', 'item_request_line_id', 'problem'];

    protected function casts(): array
    {
        return [
            'status' => InspectionStatus::class,
            'outcome' => InspectionOutcome::class,
            'scheduled_for' => 'date:Y-m-d',
            'inspected_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(fn (Inspection $inspection) => $inspection->inspection_no = Sequence::number('PIR'));
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function line(): BelongsTo
    {
        return $this->belongsTo(ItemRequestLine::class, 'item_request_line_id');
    }

    /** Turnovers (PRS) that followed this report. */
    public function turnovers(): HasMany
    {
        return $this->hasMany(Turnover::class);
    }

    /** Parts purchase requests prepared with this report. */
    public function purchaseRequests(): HasMany
    {
        return $this->hasMany(PurchaseRequest::class);
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }
}
