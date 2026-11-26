<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per office step a PR has passed (TWG, procurement, BAC, budget, accounting, OP).
        Schema::create('purchase_request_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_request_id')->constrained()->cascadeOnDelete();
            $table->string('step', 30);
            $table->date('done_on');
            $table->json('details')->nullable();
            $table->string('remarks')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['purchase_request_id', 'step']);
        });

        Schema::table('purchase_requests', function (Blueprint $table) {
            // Why the PR was returned for corrections, and by which step.
            $table->string('returned_remarks')->nullable()->after('status');
            $table->string('returned_at_step', 30)->nullable()->after('returned_remarks');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_requests', function (Blueprint $table) {
            $table->dropColumn(['returned_remarks', 'returned_at_step']);
        });
        Schema::dropIfExists('purchase_request_steps');
    }
};
