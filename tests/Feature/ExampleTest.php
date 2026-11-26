<?php

namespace Tests\Feature;

// use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    /**
     * A basic test example.
     */
    public function test_the_application_returns_a_successful_response(): void
    {
        // CI runs the tests before `npm run build`, so there is no Vite manifest yet.
        $response = $this->withoutVite()->get('/');

        $response->assertStatus(200);
    }
}
