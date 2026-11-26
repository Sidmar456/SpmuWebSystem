<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Inventory and Inspection Report of Unserviceable Property: consolidates register items for the disposal committee.
        Schema::create('iirups', function (Blueprint $table) {
            $table->id();
            $table->string('iirup_no', 30)->nullable()->unique();
            $table->string('status', 20)->default('submitted')->index();
            $table->date('disposal_date')->nullable();
            $table->string('disposal_method', 30)->nullable();
            $table->date('disposed_on')->nullable();
            $table->string('remarks')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::table('turnovers', function (Blueprint $table) {
            $table->foreignId('iirup_id')->nullable()->after('are_no')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('turnovers', function (Blueprint $table) {
            $table->dropConstrainedForeignId('iirup_id');
        });
        Schema::dropIfExists('iirups');
    }
};
