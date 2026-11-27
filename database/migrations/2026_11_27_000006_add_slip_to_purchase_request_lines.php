<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Which slip a line was issued on (ics | par), fixed at issue so reprints never change.
        Schema::table('purchase_request_lines', function (Blueprint $table) {
            $table->string('slip', 3)->nullable()->after('item_id');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_request_lines', function (Blueprint $table) {
            $table->dropColumn('slip');
        });
    }
};
