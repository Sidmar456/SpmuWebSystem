<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LaunchTest extends TestCase
{
    use RefreshDatabase;

    public function test_go_live_check_fails_on_a_non_production_setup(): void
    {
        User::factory()->create(['email' => 'admin@example.com']);

        $this->artisan('spmu:check')
            ->expectsOutputToContain('check(s) failed')
            ->assertFailed();
    }
}
