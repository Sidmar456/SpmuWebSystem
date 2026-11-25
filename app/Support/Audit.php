<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/** Append-only record of account and supplier changes (S6.4). */
class Audit
{
    public static function log(string $action, Model $subject, array $details = []): void
    {
        DB::table('audit_logs')->insert([
            'user_id' => auth()->id(),
            'action' => $action,
            'subject_type' => class_basename($subject),
            'subject_id' => $subject->getKey(),
            'details' => $details ? json_encode($details) : null,
            'created_at' => now(),
        ]);
    }
}
