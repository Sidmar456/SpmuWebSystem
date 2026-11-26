<?php

namespace App\Modules\Inspections;

/** Condition found at pre-inspection. Only `unserviceable` leads to a turnover; the others lead to a purchase request for parts. */
enum InspectionOutcome: string
{
    case Unserviceable = 'unserviceable';
    case Replacement = 'replacement';
    case Repair = 'repair';
    case Recoverable = 'recoverable';

    /** What the person should do next, shown in the notification. */
    public function nextStep(): string
    {
        return match ($this) {
            self::Unserviceable => 'Turn the item over to the Supply Office.',
            default => 'Prepare a purchase request for the parts or consumables, with this report attached.',
        };
    }
}
