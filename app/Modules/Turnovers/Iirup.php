<?php

namespace App\Modules\Turnovers;

use App\Models\User;
use App\Support\Sequence;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Inventory and Inspection Report of Unserviceable Property (IIRUP). */
class Iirup extends Model
{
    // How the disposal committee may dispose of unserviceable property.
    public const METHODS = ['sale', 'transfer', 'destruction', 'donation', 'other'];

    protected $fillable = ['remarks'];

    protected function casts(): array
    {
        return [
            'status' => IirupStatus::class,
            'disposal_date' => 'date:Y-m-d',
            'disposed_on' => 'date:Y-m-d',
        ];
    }

    protected static function booted(): void
    {
        static::creating(fn (Iirup $iirup) => $iirup->iirup_no = Sequence::number('IIRUP'));
    }

    public function turnovers(): HasMany
    {
        return $this->hasMany(Turnover::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
