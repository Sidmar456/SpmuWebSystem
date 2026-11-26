<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A turnover may follow a pre-inspection that found the item unserviceable.
        Schema::table('turnovers', function (Blueprint $table) {
            $table->foreignId('inspection_id')->nullable()->after('item_request_line_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('turnovers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inspection_id');
        });
    }
};
