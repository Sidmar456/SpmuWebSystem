<?php

namespace App\Modules\Turnovers;

enum TurnoverStatus: string
{
    case Pending = 'pending';
    case Received = 'received';
    case Rejected = 'rejected';
}
