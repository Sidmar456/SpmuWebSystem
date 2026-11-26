<?php

namespace App\Modules\Procurement;

use App\Modules\Accounts\Role;

/**
 * Office steps of a PR, in order (PR.jpg). Each is recorded by the Supply Office for offices without
 * accounts, or by the BAC validator. Only the first step not yet done can be recorded.
 */
enum PrStep: string
{
    case TwgVerified = 'twg_verified';
    case SeriesAssigned = 'series_assigned';
    case BacValidated = 'bac_validated';
    case BidAwarded = 'bid_awarded';
    case BursCertified = 'burs_certified';
    case FundsCertified = 'funds_certified';
    case ContractApproved = 'contract_approved';
    case PoSigned = 'po_signed';

    public function role(): Role
    {
        return in_array($this, [self::BacValidated, self::BidAwarded], true) ? Role::Validator : Role::Admin;
    }

    /** TWG (specs) and BAC may send the PR back to the end user. */
    public function canReturn(): bool
    {
        return $this === self::TwgVerified || $this === self::BacValidated;
    }

    /** Extra fields this step records. */
    public function rules(): array
    {
        return match ($this) {
            self::SeriesAssigned => ['series_no' => ['required', 'string', 'max:50']],
            self::BidAwarded => ['awarded_to' => ['required', 'string', 'max:255'], 'award_amount' => ['required', 'numeric', 'min:0', 'max:9999999999']],
            self::PoSigned => ['po_no' => ['required', 'string', 'max:50']],
            default => [],
        };
    }
}
