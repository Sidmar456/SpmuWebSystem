<?php

namespace App\Modules\Turnovers;

enum ItemCondition: string
{
    // Goes back into stock when received.
    case Serviceable = 'serviceable';
    // Recorded but not added back to stock (for disposal).
    case Unserviceable = 'unserviceable';
}
