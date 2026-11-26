<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // S1.5: when the person accepted the privacy notice at sign up (RA 10173).
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('privacy_accepted_at')->nullable()->after('status');
        });

        // S4.7: RIS and PRS numbers restart at 0001 each year.
        Schema::create('sequences', function (Blueprint $table) {
            $table->string('name', 20);
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('value')->default(0);
            $table->primary(['name', 'year']);
        });

        // Continue from numbers already issued (they followed the row id).
        foreach (['RIS' => ['item_requests', 'request_no'], 'PRS' => ['turnovers', 'turnover_no']] as $name => [$table, $column]) {
            DB::table($table)->whereNotNull($column)->pluck($column)
                ->groupBy(fn ($number) => (int) substr($number, 4, 4))
                ->each(fn ($numbers, $year) => DB::table('sequences')->insert([
                    'name' => $name,
                    'year' => $year,
                    'value' => $numbers->map(fn ($number) => (int) substr($number, 9))->max(),
                ]));
        }

        // S6.4: who changed accounts and suppliers. Stock changes are already in stock_movements.
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action', 50);
            $table->string('subject_type', 50);
            $table->unsignedBigInteger('subject_id');
            $table->json('details')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['subject_type', 'subject_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('sequences');
        Schema::table('users', fn (Blueprint $table) => $table->dropColumn('privacy_accepted_at'));
    }
};
