<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pre-inspection: a person asks the Supply Office (acting as inspectorate) to check issued equipment.
        Schema::create('inspections', function (Blueprint $table) {
            $table->id();
            $table->string('inspection_no', 30)->nullable()->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_request_line_id')->constrained()->restrictOnDelete();
            $table->string('problem', 500);
            $table->string('status', 20)->default('requested')->index();
            $table->date('scheduled_for')->nullable();
            $table->string('outcome', 20)->nullable();
            $table->text('findings')->nullable();
            $table->foreignId('inspected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('inspected_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inspections');
    }
};
