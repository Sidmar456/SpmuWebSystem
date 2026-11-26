<?php

namespace App\Modules\Procurement;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseRequestStepRecord extends Model
{
    protected $table = 'purchase_request_steps';

    protected $fillable = ['step', 'done_on', 'details', 'remarks', 'recorded_by'];

    protected function casts(): array
    {
        return ['step' => PrStep::class, 'done_on' => 'date:Y-m-d', 'details' => 'array'];
    }

    public function recorder(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
