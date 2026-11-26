<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Accepted items go into stock as an item, then out on an RIS; property also gets an ICS or a PAR.
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->foreignId('item_request_id')->nullable()->after('inspected_by')->constrained()->nullOnDelete();
            $table->string('ics_no', 30)->nullable()->unique()->after('item_request_id');
            $table->string('par_no', 30)->nullable()->unique()->after('ics_no');
        });

        Schema::table('purchase_request_lines', function (Blueprint $table) {
            $table->foreignId('item_id')->nullable()->after('quantity_accepted')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('purchase_request_lines', function (Blueprint $table) {
            $table->dropConstrainedForeignId('item_id');
        });
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('item_request_id');
            $table->dropColumn(['ics_no', 'par_no']);
        });
    }
};
