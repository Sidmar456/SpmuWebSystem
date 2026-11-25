<?php

namespace App\Modules\Accounts;

enum Role: string
{
    case Admin = 'admin';
    case User = 'user';
}
