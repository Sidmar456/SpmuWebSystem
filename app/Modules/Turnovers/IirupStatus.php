<?php

namespace App\Modules\Turnovers;

enum IirupStatus: string
{
    // Consolidated and submitted to the disposal committee.
    case Submitted = 'submitted';
    case Scheduled = 'scheduled';
    case Disposed = 'disposed';
}
