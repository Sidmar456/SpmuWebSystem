<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Full delivery against the PO, then the Inspection and Acceptance Report (IAR).
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->date('delivered_on')->nullable()->after('returned_at_step');
            $table->string('delivery_ref', 50)->nullable()->after('delivered_on');
            $table->string('iar_no', 30)->nullable()->unique()->after('delivery_ref');
            $table->date('inspected_on')->nullable()->after('iar_no');
            $table->string('inspection_remarks')->nullable()->after('inspected_on');
            $table->foreignId('inspected_by')->nullable()->after('inspection_remarks')->constrained('users')->nullOnDelete();
        });

        Schema::table('purchase_request_lines', function (Blueprint $table) {
            $table->unsignedInteger('quantity_accepted')->nullable()->after('unit_cost');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_request_lines', function (Blueprint $table) {
            $table->dropColumn('quantity_accepted');
        });
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('inspected_by');
            $table->dropColumn(['delivered_on', 'delivery_ref', 'iar_no', 'inspected_on', 'inspection_remarks']);
        });
    }
};
