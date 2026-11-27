<?php

namespace App\Modules\Procurement;

use App\Models\User;
use App\Modules\Inspections\Inspection;
use App\Modules\Requests\ItemRequest;
use App\Support\Sequence;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Purchase request (PR). */
class PurchaseRequest extends Model
{
    protected $fillable = ['user_id', 'office', 'purpose', 'inquiry_id', 'inspection_id'];

    protected function casts(): array
    {
        return [
            'status' => PurchaseRequestStatus::class,
            'returned_at_step' => PrStep::class,
            'delivered_on' => 'date:Y-m-d',
            'inspected_on' => 'date:Y-m-d',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (PurchaseRequest $pr) {
            $pr->pr_no = Sequence::number('PR');
            $pr->status = PurchaseRequestStatus::Submitted;
        });
    }

    /**
     * PRs the Supply Office must act on: an office step it records, the delivery, the IAR or the issue.
     * Steps are recorded strictly in order, so 2 or 3 recorded steps means the BAC holds the PR.
     */
    public static function waitingForSupply(): Builder
    {
        return static::query()->where(fn ($q) => $q
            ->where(fn ($q) => $q->where('status', PurchaseRequestStatus::Submitted)->where(fn ($q) => $q->has('steps', '<', 2)->orHas('steps', '>', 3)))
            ->orWhereIn('status', [PurchaseRequestStatus::Ordered, PurchaseRequestStatus::Delivered, PurchaseRequestStatus::Inspected]));
    }

    /** PRs at a BAC step (exactly 2 or 3 steps recorded, since steps go in order). */
    public static function waitingForBac(): Builder
    {
        return static::query()->where('status', PurchaseRequestStatus::Submitted)->has('steps', '>=', 2)->has('steps', '<=', 3);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lines(): HasMany
    {
        return $this->hasMany(PurchaseRequestLine::class);
    }

    public function steps(): HasMany
    {
        return $this->hasMany(PurchaseRequestStepRecord::class)->orderBy('id');
    }

    /** The first office step not yet done, or null once the PO is signed. */
    public function nextStep(): ?PrStep
    {
        $done = $this->steps()->pluck('step')->map(fn ($s) => $s instanceof PrStep ? $s : PrStep::from($s));

        return collect(PrStep::cases())->first(fn (PrStep $step) => ! $done->contains($step));
    }

    /** The RIS the accepted items were issued on. */
    public function itemRequest(): BelongsTo
    {
        return $this->belongsTo(ItemRequest::class);
    }

    public function inspector(): BelongsTo
    {
        return $this->belongsTo(User::class, 'inspected_by');
    }

    public function inquiry(): BelongsTo
    {
        return $this->belongsTo(Inquiry::class);
    }

    public function inspection(): BelongsTo
    {
        return $this->belongsTo(Inspection::class);
    }
}
