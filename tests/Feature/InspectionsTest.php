<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Inspections\Inspection;
use App\Modules\Requests\ItemRequest;
use App\Modules\Stocks\Item;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class InspectionsTest extends TestCase
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

    /** Issue $item to $this->user and return the request line id. */
    private function issue(Item $item, int $quantity = 1): int
    {
        $id = $this->actingAs($this->user)->postJson('/api/requests', [
            'purpose' => 'Office use', 'lines' => [['item_id' => $item->id, 'quantity' => $quantity]],
        ])->json('request.id');
        $this->actingAs($this->admin)->postJson("/api/requests/$id/approve");
        $this->actingAs($this->admin)->postJson("/api/requests/$id/issue", ['received_by' => 'Ana']);

        return ItemRequest::find($id)->lines()->sole()->id;
    }

    private function requestInspection(int $lineId): int
    {
        return $this->actingAs($this->user)->postJson('/api/inspections', [
            'item_request_line_id' => $lineId, 'problem' => 'Does not power on.',
        ])->assertCreated()->json('inspection.id');
    }

    public function test_request_schedule_and_report(): void
    {
        $lineId = $this->issue(Item::factory()->property()->withQuantity(1)->create());
        $id = $this->requestInspection($lineId);

        $this->assertMatchesRegularExpression('/^PIR-\d{4}-\d{4}$/', Inspection::find($id)->inspection_no);

        $this->actingAs($this->admin)->postJson("/api/inspections/$id/schedule", ['scheduled_for' => now()->addDay()->toDateString()])
            ->assertOk()->assertJsonPath('inspection.status', 'scheduled');

        $this->actingAs($this->admin)->postJson("/api/inspections/$id/report", ['outcome' => 'unserviceable', 'findings' => 'Burnt board.'])
            ->assertOk()
            ->assertJsonPath('inspection.status', 'inspected')
            ->assertJsonPath('inspection.outcome', 'unserviceable')
            ->assertJsonPath('inspection.inspector.name', $this->admin->name);

        // Closed: no second report, no cancel.
        $this->actingAs($this->admin)->postJson("/api/inspections/$id/report", ['outcome' => 'repair', 'findings' => 'x'])->assertUnprocessable();
        $this->actingAs($this->user)->postJson("/api/inspections/$id/cancel")->assertUnprocessable();
    }

    public function test_only_property_in_your_care_can_be_inspected(): void
    {
        $paper = $this->issue(Item::factory()->withQuantity(5)->create());
        $this->actingAs($this->user)->postJson('/api/inspections', ['item_request_line_id' => $paper, 'problem' => 'x'])
            ->assertJsonValidationErrors('item_request_line_id');

        $laptop = $this->issue(Item::factory()->property()->withQuantity(1)->create());
        $other = User::factory()->create();
        $this->actingAs($other)->postJson('/api/inspections', ['item_request_line_id' => $laptop, 'problem' => 'x'])
            ->assertJsonValidationErrors('item_request_line_id');
    }

    public function test_one_open_request_per_item_and_cancel_frees_it(): void
    {
        $lineId = $this->issue(Item::factory()->property()->withQuantity(1)->create());
        $id = $this->requestInspection($lineId);

        $this->actingAs($this->user)->postJson('/api/inspections', ['item_request_line_id' => $lineId, 'problem' => 'Again'])
            ->assertJsonValidationErrors('item_request_line_id');

        $this->actingAs($this->user)->postJson("/api/inspections/$id/cancel")->assertOk()->assertJsonPath('inspection.status', 'cancelled');
        $this->requestInspection($lineId);
    }

    public function test_personnel_see_only_their_own_and_cannot_decide(): void
    {
        $id = $this->requestInspection($this->issue(Item::factory()->property()->withQuantity(1)->create()));
        $other = User::factory()->create();

        $this->actingAs($other)->getJson("/api/inspections/$id")->assertForbidden();
        $this->actingAs($other)->getJson('/api/inspections')->assertJsonCount(0, 'data');
        $this->actingAs($other)->postJson("/api/inspections/$id/cancel")->assertForbidden();
        $this->actingAs($this->user)->postJson("/api/inspections/$id/report", ['outcome' => 'repair', 'findings' => 'x'])->assertForbidden();
        $this->actingAs($this->admin)->getJson('/api/inspections')->assertJsonCount(1, 'data');
    }

    private function report(int $id, string $outcome): void
    {
        $this->actingAs($this->admin)->postJson("/api/inspections/$id/report", ['outcome' => $outcome, 'findings' => 'Checked.'])->assertOk();
    }

    private function turnOver(int $lineId, int $inspectionId)
    {
        return $this->actingAs($this->user)->postJson('/api/turnovers', [
            'item_request_line_id' => $lineId, 'quantity' => 1,
            'reason' => 'unserviceable', 'condition' => 'unserviceable', 'inspection_id' => $inspectionId,
        ]);
    }

    public function test_unserviceable_report_links_to_turnover(): void
    {
        $lineId = $this->issue(Item::factory()->property()->withQuantity(1)->create());
        $id = $this->requestInspection($lineId);
        $this->report($id, 'unserviceable');

        $turnoverId = $this->turnOver($lineId, $id)->assertCreated()->json('turnover.id');

        $this->actingAs($this->user)->getJson("/api/turnovers/$turnoverId")
            ->assertJsonPath('turnover.inspection.inspection_no', Inspection::find($id)->inspection_no);
        $this->actingAs($this->user)->getJson("/api/inspections/$id")
            ->assertJsonPath('inspection.turnovers.0.id', $turnoverId);
    }

    public function test_only_an_unserviceable_report_for_the_same_item_can_be_linked(): void
    {
        $lineId = $this->issue(Item::factory()->property()->withQuantity(1)->create());
        $repair = $this->requestInspection($lineId);
        $this->report($repair, 'repair');
        $this->turnOver($lineId, $repair)->assertJsonValidationErrors('inspection_id');

        $open = $this->requestInspection($lineId);
        $this->turnOver($lineId, $open)->assertJsonValidationErrors('inspection_id');

        $otherLine = $this->issue(Item::factory()->property()->withQuantity(1)->create());
        $this->report($open, 'unserviceable');
        $this->turnOver($otherLine, $open)->assertJsonValidationErrors('inspection_id');

        // The report decides the condition.
        $this->actingAs($this->user)->postJson('/api/turnovers', [
            'item_request_line_id' => $lineId, 'quantity' => 1, 'reason' => 'other', 'condition' => 'serviceable', 'inspection_id' => $open,
        ])->assertJsonValidationErrors('condition');
    }

    public function test_schedule_date_cannot_be_in_the_past(): void
    {
        $id = $this->requestInspection($this->issue(Item::factory()->property()->withQuantity(1)->create()));

        $this->actingAs($this->admin)->postJson("/api/inspections/$id/schedule", ['scheduled_for' => now()->subDay()->toDateString()])
            ->assertJsonValidationErrors('scheduled_for');
    }
}
