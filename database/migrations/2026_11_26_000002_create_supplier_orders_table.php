<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// S3.3: stock requests emailed to a supplier, and what was delivered.
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_no', 30)->unique();
            $table->foreignId('supplier_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained();
            $table->string('status', 20)->default('sent'); // sent | delivered
            $table->text('notes')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamps();
        });

        Schema::create('supplier_order_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('item_id')->constrained();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('quantity_received')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_order_lines');
        Schema::dropIfExists('supplier_orders');
    }
};
