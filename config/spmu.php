<?php

return [
    // Property at or above this unit cost is issued on a PAR; below it, on an ICS (semi-expendable).
    'par_threshold' => (float) env('SPMU_PAR_THRESHOLD', 50000),
];
