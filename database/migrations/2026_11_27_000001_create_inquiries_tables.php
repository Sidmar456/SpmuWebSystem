<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Supplies Availability Inquiry (SAI): the end user asks before preparing a purchase request.
        Schema::create('inquiries', function (Blueprint $table) {
            $table->id();
            $table->string('inquiry_no', 30)->nullable()->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('office')->nullable();
            $table->string('purpose');
            $table->string('status', 20)->default('pending')->index();
            $table->foreignId('answered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('answered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('inquiry_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inquiry_id')->constrained()->cascadeOnDelete();
            $table->string('description');
            $table->string('unit', 30);
            $table->unsignedInteger('quantity');
            // null until the Supply Office answers: available | not_available.
            $table->string('availability', 20)->nullable();
            $table->string('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inquiry_lines');
        Schema::dropIfExists('inquiries');
    }
};
