<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    // Lines issued before `slip` existed: apply the same rule as at issue (property only, by PR unit cost).
    public function up(): void
    {
        $threshold = config('spmu.par_threshold');
        $property = DB::table('items')->where('type', 'property')->pluck('id');

        DB::table('purchase_request_lines')->whereNull('slip')->whereIn('item_id', $property)->where('unit_cost', '>=', $threshold)->update(['slip' => 'par']);
        DB::table('purchase_request_lines')->whereNull('slip')->whereIn('item_id', $property)->where('unit_cost', '<', $threshold)->update(['slip' => 'ics']);
    }

    // Nothing to undo: the column itself is dropped by 2026_11_27_000006.
    public function down(): void {}
};
