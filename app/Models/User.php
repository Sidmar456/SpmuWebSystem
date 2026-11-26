<?php

namespace App\Models;

use App\Modules\Accounts\AccountStatus;
use App\Modules\Accounts\Role;
use App\Modules\Requests\ItemRequestLine;
use App\Modules\Requests\RequestStatus;
use App\Modules\Stocks\ItemType;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'office',
        'role',
        'status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => Role::class,
            'status' => AccountStatus::class,
        ];
    }

    public function isAdmin(): bool
    {
        return $this->role === Role::Admin;
    }

    /** BAC member: validates purchase requests and records the bidding. */
    public function isValidator(): bool
    {
        return $this->role === Role::Validator;
    }

    /** Property units issued to this person and not yet returned (pending turnovers still count). */
    public function heldPropertyQuantity(): int
    {
        return (int) ItemRequestLine::query()
            ->whereHas('item', fn ($q) => $q->where('type', ItemType::Property))
            ->whereHas('request', fn ($q) => $q->where('user_id', $this->id)->where('status', RequestStatus::Issued))
            ->sum(DB::raw('quantity_issued - quantity_returned'));
    }
}
