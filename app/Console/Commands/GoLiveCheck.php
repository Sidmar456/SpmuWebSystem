<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Modules\Accounts\AccountStatus;
use App\Modules\Accounts\Role;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * S8.1: the go-live checks that can be read from the server itself (DEPLOYMENT.md section 10).
 * Browser checks (.env not reachable, 401/403) are still done by hand.
 */
class GoLiveCheck extends Command
{
    protected $signature = 'spmu:check';

    protected $description = 'Check that this server is configured for production';

    public function handle(): int
    {
        $checks = [
            'APP_ENV is production' => fn () => app()->environment('production'),
            'APP_DEBUG is off' => fn () => ! config('app.debug'),
            'APP_KEY is set' => fn () => filled(config('app.key')),
            'APP_URL is not localhost' => fn () => ! preg_match('#//(localhost|127\.0\.0\.1)#', config('app.url')),
            'Time zone is Asia/Manila' => fn () => config('app.timezone') === 'Asia/Manila',
            'Database connects' => fn () => (bool) DB::select('select 1'),
            'All migrations ran' => fn () => ! str_contains(self::artisan('migrate:status'), 'Pending'),
            'Frontend is built (public/build)' => fn () => is_file(public_path('build/manifest.json')),
            'Photo storage is linked (storage:link)' => fn () => is_dir(public_path('storage')),
            'Mail is sent for real (not log/array)' => fn () => ! in_array(config('mail.default'), ['log', 'array'], true),
            'Queue uses the database' => fn () => config('queue.default') === 'database',
            'Sessions use the database' => fn () => config('session.driver') === 'database',
            'An approved admin exists' => fn () => User::where('role', Role::Admin)->where('status', AccountStatus::Approved)->exists(),
            'No demo accounts from the seeder' => fn () => ! User::whereIn('email', ['admin@example.com', 'user@example.com'])->exists(),
            'No failed queue jobs' => fn () => DB::table('failed_jobs')->count() === 0,
        ];

        $failed = 0;
        $rows = [];
        foreach ($checks as $label => $check) {
            try {
                $ok = (bool) $check();
            } catch (Throwable $e) {
                $ok = false;
                $label .= ' ('.str($e->getMessage())->limit(60).')';
            }
            $failed += $ok ? 0 : 1;
            $rows[] = [$ok ? 'PASS' : 'FAIL', $label];
        }

        $this->table(['', 'Check'], $rows);

        if ($failed) {
            $this->error("{$failed} check(s) failed. See docs/DEPLOYMENT.md.");

            return self::FAILURE;
        }

        $this->info('All checks passed. Now do the browser checks in docs/DEPLOYMENT.md section 10.');

        return self::SUCCESS;
    }

    private static function artisan(string $command): string
    {
        Artisan::call($command);

        return Artisan::output();
    }
}
