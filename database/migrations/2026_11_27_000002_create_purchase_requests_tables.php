<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Purchase request (PR): from items tagged not available (SAI), or parts for equipment after a pre-inspection.
        Schema::create('purchase_requests', function (Blueprint $table) {
            $table->id();
            $table->string('pr_no', 30)->nullable()->unique();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('office')->nullable();
            $table->string('purpose');
            $table->foreignId('inquiry_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('inspection_id')->nullable()->constrained()->nullOnDelete();
            $table->string('status', 20)->default('submitted')->index();
            $table->timestamps();
        });

        Schema::create('purchase_request_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_request_id')->constrained()->cascadeOnDelete();
            // Unique: an SAI line goes into one PR only.
            $table->foreignId('inquiry_line_id')->nullable()->unique()->constrained()->nullOnDelete();
            $table->string('description', 500);
            $table->string('unit', 30);
            $table->unsignedInteger('quantity');
            $table->decimal('unit_cost', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('purchase_request_lines');
        Schema::dropIfExists('purchase_requests');
    }
};
