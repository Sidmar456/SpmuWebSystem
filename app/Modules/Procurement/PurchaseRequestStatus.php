<?php

namespace App\Modules\Procurement;

enum PurchaseRequestStatus: string
{
    // Going through the office steps (PrStep).
    case Submitted = 'submitted';
    // Sent back to the end user for corrections (TWG or BAC).
    case Returned = 'returned';
    // PO signed by the supplier: waiting for delivery.
    case Ordered = 'ordered';
    // Fully delivered: waiting for the inspectorate (Supply Office).
    case Delivered = 'delivered';
    // IAR recorded: accepted quantities are known.
    case Inspected = 'inspected';
    // Accepted items stocked in and issued to the end user (RIS, plus ICS or PAR for property).
    case Issued = 'issued';
}
