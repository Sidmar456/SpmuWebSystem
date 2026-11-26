<?php

namespace App\Modules\Procurement;

enum Availability: string
{
    case Available = 'available';
    // Tagged "none / not available": the end user may prepare a purchase request for it.
    case NotAvailable = 'not_available';
}
