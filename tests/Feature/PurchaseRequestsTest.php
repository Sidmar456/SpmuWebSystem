<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Inspections\Inspection;
use App\Modules\Procurement\Inquiry;
use App\Modules\Procurement\PurchaseRequest;
use App\Modules\Requests\ItemRequest;
use App\Modules\Stocks\Item;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class PurchaseRequestsTest extends TestCase
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

    /** An answered SAI: paper available, microscope not available. */
    private function answeredInquiry(): Inquiry
    {
        $id = $this->actingAs($this->user)->postJson('/api/inquiries', [
            'purpose' => 'Lab', 'lines' => [
                ['description' => 'Bond paper', 'unit' => 'ream', 'quantity' => 5],
                ['description' => 'Microscope', 'unit' => 'unit', 'quantity' => 2],
            ],
        ])->json('inquiry.id');
        $inquiry = Inquiry::find($id);
        $this->actingAs($this->admin)->postJson("/api/inquiries/$id/answer", ['lines' => [
            ['id' => $inquiry->lines[0]->id, 'availability' => 'available'],
            ['id' => $inquiry->lines[1]->id, 'availability' => 'not_available'],
        ]]);

        return $inquiry->fresh('lines');
    }

    private function line(?int $inquiryLineId, float $cost = 1500): array
    {
        return ['inquiry_line_id' => $inquiryLineId, 'description' => 'Microscope, binocular', 'unit' => 'unit', 'quantity' => 2, 'unit_cost' => $cost];
    }

    public function test_pr_from_not_available_sai_lines_only_once(): void
    {
        $inquiry = $this->answeredInquiry();
        [$paper, $scope] = $inquiry->lines;

        $this->actingAs($this->user)->postJson('/api/purchase-requests', ['purpose' => 'Lab', 'inquiry_id' => $inquiry->id, 'lines' => [$this->line($paper->id)]])
            ->assertJsonValidationErrors('lines.0.inquiry_line_id');

        $this->actingAs($this->user)->postJson('/api/purchase-requests', ['purpose' => 'Lab', 'inquiry_id' => $inquiry->id, 'lines' => [$this->line($scope->id, 12500.5)]])
            ->assertCreated()
            ->assertJsonPath('purchase_request.status', 'submitted')
            ->assertJsonPath('purchase_request.lines.0.unit_cost', '12500.50');

        $this->actingAs($this->user)->postJson('/api/purchase-requests', ['purpose' => 'Lab', 'inquiry_id' => $inquiry->id, 'lines' => [$this->line($scope->id)]])
            ->assertJsonValidationErrors('lines.0.inquiry_line_id');

        $this->actingAs($this->user)->getJson('/api/purchase-requests')->assertJsonPath('data.0.total', fn ($total) => (float) $total === 25001.0); // number on SQLite, string on MySQL
        $this->actingAs($this->user)->getJson("/api/inquiries/{$inquiry->id}")->assertJsonPath('inquiry.lines.1.purchase_request_line.purchase_request.pr_no', fn ($no) => str_starts_with($no, 'PR-'));
    }

    public function test_parts_pr_from_a_repair_report_but_not_an_unserviceable_one(): void
    {
        $item = Item::factory()->property()->withQuantity(2)->create();
        $requestId = $this->actingAs($this->user)->postJson('/api/requests', ['purpose' => 'Use', 'lines' => [['item_id' => $item->id, 'quantity' => 2]]])->json('request.id');
        $this->actingAs($this->admin)->postJson("/api/requests/$requestId/approve");
        $this->actingAs($this->admin)->postJson("/api/requests/$requestId/issue", ['received_by' => 'Ana']);
        $lineId = ItemRequest::find($requestId)->lines()->sole()->id;

        $report = function (string $outcome) use ($lineId) {
            $id = $this->actingAs($this->user)->postJson('/api/inspections', ['item_request_line_id' => $lineId, 'problem' => 'Broken'])->json('inspection.id');
            $this->actingAs($this->admin)->postJson("/api/inspections/$id/report", ['outcome' => $outcome, 'findings' => 'Checked']);

            return $id;
        };

        $dead = $report('unserviceable');
        $this->actingAs($this->user)->postJson('/api/purchase-requests', ['purpose' => 'Parts', 'inspection_id' => $dead, 'lines' => [$this->line(null)]])
            ->assertJsonValidationErrors('inspection_id');

        $repair = $report('repair');
        $this->actingAs($this->user)->postJson('/api/purchase-requests', ['purpose' => 'Parts', 'inspection_id' => $repair, 'lines' => [$this->line(99)]])
            ->assertCreated()->assertJsonPath('purchase_request.lines.0.inquiry_line_id', null);
        $this->assertCount(1, Inspection::find($repair)->purchaseRequests);
    }

    public function test_needs_one_source_and_owner_only(): void
    {
        $inquiry = $this->answeredInquiry();
        $this->actingAs($this->user)->postJson('/api/purchase-requests', ['purpose' => 'x', 'lines' => [$this->line(null)]])
            ->assertJsonValidationErrors(['inquiry_id', 'inspection_id']);

        $other = User::factory()->create();
        $this->actingAs($other)->postJson('/api/purchase-requests', ['purpose' => 'x', 'inquiry_id' => $inquiry->id, 'lines' => [$this->line($inquiry->lines[1]->id)]])
            ->assertJsonValidationErrors('inquiry_id');

        $id = $this->actingAs($this->user)->postJson('/api/purchase-requests', ['purpose' => 'x', 'inquiry_id' => $inquiry->id, 'lines' => [$this->line($inquiry->lines[1]->id)]])->json('purchase_request.id');
        $this->actingAs($other)->getJson("/api/purchase-requests/$id")->assertForbidden();
        $this->actingAs($this->admin)->getJson("/api/purchase-requests/$id")->assertOk();
    }

    private function submittedPr(): int
    {
        $inquiry = $this->answeredInquiry();

        return $this->actingAs($this->user)->postJson('/api/purchase-requests', ['purpose' => 'Lab', 'inquiry_id' => $inquiry->id, 'lines' => [$this->line($inquiry->lines[1]->id)]])->json('purchase_request.id');
    }

    private function step(User $by, int $id, string $step, array $extra = [])
    {
        return $this->actingAs($by)->postJson("/api/purchase-requests/$id/steps", ['step' => $step, 'done_on' => now()->toDateString()] + $extra);
    }

    public function test_office_steps_in_order_with_bac_validator(): void
    {
        $bac = User::factory()->create(['role' => 'validator']);
        $id = $this->submittedPr();

        // Order is enforced, and each step belongs to one role.
        $this->step($this->admin, $id, 'series_assigned', ['series_no' => 'X'])->assertJsonValidationErrors('step');
        $this->step($bac, $id, 'twg_verified')->assertForbidden();
        $this->step($this->admin, $id, 'twg_verified')->assertOk();
        $this->step($this->admin, $id, 'series_assigned')->assertJsonValidationErrors('series_no');
        $this->step($this->admin, $id, 'series_assigned', ['series_no' => '2026-11-045'])->assertOk();

        // Supply cannot do BAC's step; BAC sees every PR.
        $this->step($this->admin, $id, 'bac_validated')->assertForbidden();
        $this->actingAs($bac)->getJson('/api/purchase-requests')->assertJsonCount(1, 'data');
        $this->actingAs($bac)->getJson("/api/purchase-requests/$id")->assertJsonPath('next_step', 'bac_validated');
        $this->step($bac, $id, 'bac_validated')->assertOk();
        $this->step($bac, $id, 'bid_awarded', ['awarded_to' => 'ABC Trading', 'award_amount' => 24000])->assertOk();

        foreach (['burs_certified', 'funds_certified', 'contract_approved'] as $step) {
            $this->step($this->admin, $id, $step)->assertOk();
        }
        $this->step($this->admin, $id, 'po_signed', ['po_no' => 'PO-2026-0101'])->assertOk()
            ->assertJsonPath('purchase_request.status', 'ordered')
            ->assertJsonPath('purchase_request.steps.3.details.awarded_to', 'ABC Trading');
        $this->step($this->admin, $id, 'po_signed', ['po_no' => 'again'])->assertJsonValidationErrors('step');
    }

    public function test_bac_returns_and_end_user_corrects_then_steps_restart(): void
    {
        $bac = User::factory()->create(['role' => 'validator']);
        $id = $this->submittedPr();
        $this->step($this->admin, $id, 'twg_verified');
        $this->step($this->admin, $id, 'series_assigned', ['series_no' => '045']);

        $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/return", ['step' => 'series_assigned', 'remarks' => 'x'])->assertJsonValidationErrors('step');
        $this->actingAs($bac)->postJson("/api/purchase-requests/$id/return", ['step' => 'bac_validated', 'remarks' => 'Specs too brand-specific'])
            ->assertOk()->assertJsonPath('purchase_request.status', 'returned');
        $this->step($bac, $id, 'bac_validated')->assertJsonValidationErrors('step');

        $lineId = PurchaseRequest::find($id)->lines()->sole()->id;
        $this->actingAs($bac)->putJson("/api/purchase-requests/$id", ['purpose' => 'x', 'lines' => []])->assertForbidden();
        $this->actingAs($this->user)->putJson("/api/purchase-requests/$id", [
            'purpose' => 'Lab', 'lines' => [['id' => $lineId, 'description' => 'Microscope, binocular, 1000x, any brand', 'quantity' => 2, 'unit_cost' => 11000]],
        ])->assertOk()->assertJsonPath('purchase_request.status', 'submitted');

        $this->actingAs($this->user)->getJson("/api/purchase-requests/$id")
            ->assertJsonPath('next_step', 'twg_verified')->assertJsonCount(0, 'purchase_request.steps');
    }

    public function test_delivery_then_iar_with_accepted_quantities(): void
    {
        $bac = User::factory()->create(['role' => 'validator']);
        $id = $this->submittedPr();
        $today = now()->toDateString();

        $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/delivery", ['delivered_on' => $today, 'delivery_ref' => 'DR-1'])->assertJsonValidationErrors('status');

        foreach (['twg_verified' => [], 'series_assigned' => ['series_no' => '045']] as $step => $extra) {
            $this->step($this->admin, $id, $step, $extra);
        }
        $this->step($bac, $id, 'bac_validated');
        $this->step($bac, $id, 'bid_awarded', ['awarded_to' => 'ABC', 'award_amount' => 1]);
        foreach (['burs_certified' => [], 'funds_certified' => [], 'contract_approved' => [], 'po_signed' => ['po_no' => 'PO-1']] as $step => $extra) {
            $this->step($this->admin, $id, $step, $extra);
        }

        $this->actingAs($this->user)->postJson("/api/purchase-requests/$id/delivery", ['delivered_on' => $today, 'delivery_ref' => 'DR-1'])->assertForbidden();
        $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/delivery", ['delivered_on' => $today, 'delivery_ref' => 'DR-0042'])
            ->assertOk()->assertJsonPath('purchase_request.status', 'delivered');

        $lineId = PurchaseRequest::find($id)->lines()->sole()->id; // quantity 2
        $iar = fn (int $accepted) => $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/iar", [
            'inspected_on' => $today, 'lines' => [['id' => $lineId, 'quantity_accepted' => $accepted]], 'inspection_remarks' => 'One unit has a cracked lens',
        ]);
        $iar(3)->assertJsonValidationErrors('lines.0.quantity_accepted');
        $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/iar", ['inspected_on' => $today, 'lines' => [['id' => $lineId, 'quantity_accepted' => 1]]])
            ->assertJsonValidationErrors('inspection_remarks');
        $iar(1)->assertOk()
            ->assertJsonPath('purchase_request.status', 'inspected')
            ->assertJsonPath('purchase_request.lines.0.quantity_accepted', 1);
        $this->assertMatchesRegularExpression('/^IAR-\d{4}-\d{4}$/', PurchaseRequest::find($id)->iar_no);
        $iar(1)->assertJsonValidationErrors('status');
    }

    /** Take PR $id from submitted through the IAR, accepting $accepted per line (in line order). */
    private function throughIar(int $id, array $accepted): void
    {
        $bac = User::factory()->create(['role' => 'validator']);
        $this->step($this->admin, $id, 'twg_verified');
        $this->step($this->admin, $id, 'series_assigned', ['series_no' => '045']);
        $this->step($bac, $id, 'bac_validated');
        $this->step($bac, $id, 'bid_awarded', ['awarded_to' => 'ABC', 'award_amount' => 1]);
        foreach (['burs_certified' => [], 'funds_certified' => [], 'contract_approved' => [], 'po_signed' => ['po_no' => 'PO-1']] as $step => $extra) {
            $this->step($this->admin, $id, $step, $extra);
        }
        $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/delivery", ['delivered_on' => now()->toDateString(), 'delivery_ref' => 'DR-1']);
        $lines = PurchaseRequest::find($id)->lines()->orderBy('id')->pluck('id')->values();
        $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/iar", [
            'inspected_on' => now()->toDateString(), 'inspection_remarks' => 'ok',
            'lines' => $lines->map(fn ($lineId, $i) => ['id' => $lineId, 'quantity_accepted' => $accepted[$i]])->all(),
        ])->assertOk();
    }

    public function test_issue_stocks_in_then_out_on_ris_with_ics_and_par(): void
    {
        $inquiry = $this->answeredInquiry();
        $id = $this->actingAs($this->user)->postJson('/api/purchase-requests', ['purpose' => 'Lab', 'inquiry_id' => $inquiry->id, 'lines' => [$this->line($inquiry->lines[1]->id, 12000)]])->json('purchase_request.id');
        $pr = PurchaseRequest::find($id);
        // A second, expensive line on the same PR (added directly: the SAI had one not-available item).
        $pr->lines()->create(['description' => 'Centrifuge', 'unit' => 'unit', 'quantity' => 1, 'unit_cost' => 80000]);
        $this->throughIar($id, [2, 1]);
        [$scopeLine, $centrifugeLine] = $pr->lines()->orderBy('id')->get();
        $existing = Item::factory()->property()->withQuantity(0)->create();

        $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/issue", ['received_by' => 'Ana', 'lines' => [['id' => $scopeLine->id, 'item_id' => $existing->id]]])
            ->assertJsonValidationErrors('lines');

        $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/issue", ['received_by' => 'Ana', 'lines' => [
            ['id' => $scopeLine->id, 'item_id' => $existing->id],
            ['id' => $centrifugeLine->id, 'new_item' => ['stock_no' => 'EQ-CEN-01', 'name' => 'Centrifuge', 'type' => 'property']],
        ]])->assertOk()->assertJsonPath('purchase_request.status', 'issued');

        $pr->refresh();
        $this->assertMatchesRegularExpression('/^ICS-\d{4}-\d{4}$/', $pr->ics_no);
        $this->assertMatchesRegularExpression('/^PAR-\d{4}-\d{4}$/', $pr->par_no);
        $this->assertSame(0, $existing->fresh()->quantity, 'stocked in and issued out');
        $this->assertSame(2, $existing->movements()->count());
        $this->assertSame('issued', $pr->itemRequest->status->value);

        // Issued property is now in the end user's care, so it can be turned over later.
        $this->actingAs($this->user)->getJson('/api/turnovers/holdings')->assertJsonCount(2, 'data');
        $this->actingAs($this->admin)->postJson("/api/purchase-requests/$id/issue", ['received_by' => 'Ana', 'lines' => []])->assertJsonValidationErrors('status');
    }
}
