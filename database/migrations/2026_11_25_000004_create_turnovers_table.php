<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Property Return Slip (PRS): a person turns over a specific issued property item.
        Schema::create('turnovers', function (Blueprint $table) {
            $table->id();
            $table->string('turnover_no', 30)->nullable()->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_request_line_id')->constrained()->restrictOnDelete();
            $table->unsignedInteger('quantity');
            $table->string('reason', 30);
            $table->string('condition', 20);
            $table->string('status', 20)->default('pending')->index();
            $table->string('remarks')->nullable();
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('turnovers');
    }
};
