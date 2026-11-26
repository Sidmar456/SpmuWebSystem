<?php

namespace App\Modules\Accounts;

enum Role: string
{
    case Admin = 'admin';
    case User = 'user';
    // BAC member: validates purchase requests before the Supply Office approves them (S10.3).
    case Validator = 'validator';
}
