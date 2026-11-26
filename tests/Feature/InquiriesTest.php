<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Procurement\Inquiry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class InquiriesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->user = User::factory()->create();
        $this->admin = User::factory()->admin()->create();
    }

    private function ask(): Inquiry
    {
        $id = $this->actingAs($this->user)->postJson('/api/inquiries', [
            'purpose' => 'Laboratory class',
            'lines' => [
                ['description' => 'Bond paper A4', 'unit' => 'ream', 'quantity' => 10],
                ['description' => 'Microscope', 'unit' => 'unit', 'quantity' => 2],
            ],
        ])->assertCreated()->json('inquiry.id');

        return Inquiry::find($id);
    }

    public function test_ask_and_answer_each_line(): void
    {
        $inquiry = $this->ask();
        $this->assertMatchesRegularExpression('/^SAI-\d{4}-\d{4}$/', $inquiry->inquiry_no);
        [$paper, $scope] = $inquiry->lines;

        $this->actingAs($this->admin)->postJson("/api/inquiries/{$inquiry->id}/answer", [
            'lines' => [['id' => $paper->id, 'availability' => 'available']],
        ])->assertJsonValidationErrors('lines');

        $this->actingAs($this->admin)->postJson("/api/inquiries/{$inquiry->id}/answer", [
            'lines' => [
                ['id' => $paper->id, 'availability' => 'available'],
                ['id' => $scope->id, 'availability' => 'not_available', 'remarks' => 'None in stock'],
            ],
        ])->assertOk()
            ->assertJsonPath('inquiry.status', 'answered')
            ->assertJsonPath('inquiry.lines.1.availability', 'not_available');

        $this->actingAs($this->admin)->postJson("/api/inquiries/{$inquiry->id}/answer", [
            'lines' => [['id' => $paper->id, 'availability' => 'available'], ['id' => $scope->id, 'availability' => 'available']],
        ])->assertJsonValidationErrors('status');
    }

    public function test_lines_from_another_inquiry_are_refused(): void
    {
        $mine = $this->ask();
        $other = $this->ask();

        $this->actingAs($this->admin)->postJson("/api/inquiries/{$mine->id}/answer", [
            'lines' => [
                ['id' => $mine->lines[0]->id, 'availability' => 'available'],
                ['id' => $other->lines[0]->id, 'availability' => 'available'],
            ],
        ])->assertJsonValidationErrors('lines');
    }

    public function test_personnel_see_only_their_own_and_cannot_answer(): void
    {
        $inquiry = $this->ask();
        $other = User::factory()->create();

        $this->actingAs($other)->getJson("/api/inquiries/{$inquiry->id}")->assertForbidden();
        $this->actingAs($other)->getJson('/api/inquiries')->assertJsonCount(0, 'data');
        $this->actingAs($this->user)->postJson("/api/inquiries/{$inquiry->id}/answer", ['lines' => []])->assertForbidden();
        $this->actingAs($this->admin)->getJson('/api/inquiries')->assertJsonCount(1, 'data');
    }
}
