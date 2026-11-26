<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/** Per-year document numbers: RIS-2026-0001, RIS-2026-0002, … then RIS-2027-0001. */
class Sequence
{
    public static function number(string $name): string
    {
        $year = (int) now()->format('Y');

        $value = DB::transaction(function () use ($name, $year) {
            DB::table('sequences')->insertOrIgnore(['name' => $name, 'year' => $year, 'value' => 0]);
            // Row lock: two requests saved at the same moment cannot get the same number.
            $current = DB::table('sequences')->where(['name' => $name, 'year' => $year])->lockForUpdate()->value('value');
            DB::table('sequences')->where(['name' => $name, 'year' => $year])->update(['value' => $current + 1]);

            return $current + 1;
        });

        return sprintf('%s-%d-%04d', $name, $year, $value);
    }
}
