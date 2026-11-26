<?php

namespace App\Modules\Accounts;

enum AccountStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';
    // Was approved; turned off by an admin (left ZPPSU, transferred). Can be enabled again.
    case Disabled = 'disabled';
}
