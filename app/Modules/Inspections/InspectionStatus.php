<?php

namespace App\Modules\Inspections;

enum InspectionStatus: string
{
    case Requested = 'requested';
    case Scheduled = 'scheduled';
    case Inspected = 'inspected';
    case Cancelled = 'cancelled';

    /** Still waiting for the inspection report. */
    public function isOpen(): bool
    {
        return $this === self::Requested || $this === self::Scheduled;
    }
}
