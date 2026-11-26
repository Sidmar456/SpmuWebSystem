<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ARE number the received unserviceable item is indexed to (unserviceable stockroom register).
        Schema::table('turnovers', function (Blueprint $table) {
            $table->string('are_no', 50)->nullable()->after('remarks');
        });
    }

    public function down(): void
    {
        Schema::table('turnovers', function (Blueprint $table) {
            $table->dropColumn('are_no');
        });
    }
};
