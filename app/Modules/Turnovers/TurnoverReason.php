<?php

namespace App\Modules\Turnovers;

enum TurnoverReason: string
{
    case NoLongerNeeded = 'no_longer_needed';
    case Transfer = 'transfer';
    case Retirement = 'retirement';
    case Unserviceable = 'unserviceable';
    case Other = 'other';
}
