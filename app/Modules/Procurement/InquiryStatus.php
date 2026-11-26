<?php

namespace App\Modules\Procurement;

enum InquiryStatus: string
{
    case Pending = 'pending';
    case Answered = 'answered';
}
