<?php

namespace App\Modules\Procurement;

use App\Models\User;
use App\Modules\Inspections\Inspection;
use App\Modules\Inspections\InspectionOutcome;
use App\Modules\Inspections\InspectionStatus;
use App\Modules\Notifications\Notify;
use App\Modules\Requests\ItemRequest;
use App\Modules\Requests\RequestStatus;
use App\Modules\Stocks\Item;
use App\Modules\Stocks\ItemType;
use App\Modules\Stocks\MovementType;
use App\Modules\Stocks\StockLedger;
use App\Support\Sequence;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** The end user prepares a PR for items tagged not available, or for parts after a pre-inspection. */
class PurchaseRequestController
{
    public function __construct(private StockLedger $ledger) {}

    public function index(Request $request): JsonResponse
    {
        $prs = PurchaseRequest::query()
            ->with('user:id,name,office')
            ->withCount('lines')
            ->withSum('lines as total', DB::raw('quantity * unit_cost'))
            ->when(! $this->seesAll($request->user()), fn ($q) => $q->where('user_id', $request->user()->id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest('id')
            ->paginate(25);

        return response()->json($prs);
    }

    public function show(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        abort_unless($this->seesAll($request->user()) || $purchaseRequest->user_id === $request->user()->id, 403);

        return response()->json([
            'purchase_request' => $purchaseRequest->load(['user:id,name,email,office', 'lines.item:id,stock_no,name,unit,type', 'itemRequest:id,request_no,issued_at,received_by', 'inquiry:id,inquiry_no', 'inspection:id,inspection_no,outcome', 'steps.recorder:id,name', 'inspector:id,name']),
            'next_step' => $purchaseRequest->status === PurchaseRequestStatus::Submitted ? $purchaseRequest->nextStep()?->value : null,
            'par_threshold' => config('spmu.par_threshold'),
        ]);
    }

    /** Record the next office step. The BAC validator records its own steps; the Supply Office records the rest. */
    public function recordStep(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        return DB::transaction(fn () => $this->recordLockedStep($request, $this->lock($purchaseRequest)));
    }

    private function recordLockedStep(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        $step = $this->currentStepFor($request->user(), $purchaseRequest, $request->input('step'));

        $data = $request->validate([
            'done_on' => ['required', 'date', 'before_or_equal:today'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ] + $step->rules());

        $purchaseRequest->steps()->create([
            'step' => $step,
            'done_on' => $data['done_on'],
            'remarks' => $data['remarks'] ?? null,
            'details' => array_intersect_key($data, $step->rules()) ?: null,
            'recorded_by' => $request->user()->id,
        ]);
        $purchaseRequest->touch();

        $next = $purchaseRequest->nextStep();
        $link = "/purchase-requests/{$purchaseRequest->id}";
        if (! $next) {
            $purchaseRequest->forceFill(['status' => PurchaseRequestStatus::Ordered])->save();
            Notify::user($purchaseRequest->user, 'Purchase order signed', "{$purchaseRequest->pr_no}: the supplier signed the PO. The Supply Office will tell you when the delivery arrives.", $link);
        } elseif ($next->role() !== $step->role()) {
            Notify::role($next->role(), 'Purchase request waiting', "{$purchaseRequest->pr_no} is ready for your step.", $link);
        }

        return response()->json(['purchase_request' => $purchaseRequest->fresh(['lines', 'steps.recorder:id,name'])]);
    }

    /** Full delivery against the signed PO. The Supply Office then requests inspection. */
    public function recordDelivery(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        $this->requireStatus($purchaseRequest, PurchaseRequestStatus::Ordered, 'Only a PR with a signed PO can be delivered.');

        $data = $request->validate([
            'delivered_on' => ['required', 'date', 'before_or_equal:today'],
            'delivery_ref' => ['required', 'string', 'max:50'],
        ]);

        $purchaseRequest->forceFill($data + ['status' => PurchaseRequestStatus::Delivered])->save();

        return response()->json(['purchase_request' => $purchaseRequest]);
    }

    /** Inspection and Acceptance Report: how much of each line the inspectorate accepts. */
    public function recordIar(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        $this->requireStatus($purchaseRequest, PurchaseRequestStatus::Delivered, 'Record the delivery before the inspection.');

        $data = $request->validate([
            'inspected_on' => ['required', 'date', 'before_or_equal:today', 'after_or_equal:'.$purchaseRequest->delivered_on->toDateString()],
            'inspection_remarks' => ['nullable', 'string', 'max:255'],
            'lines' => ['required', 'array'],
            'lines.*.id' => ['required', 'integer', 'distinct'],
            'lines.*.quantity_accepted' => ['required', 'integer', 'min:0'],
        ]);

        $lines = $purchaseRequest->lines()->get()->keyBy('id');
        if (collect($data['lines'])->pluck('id')->sort()->values()->all() !== $lines->keys()->sort()->values()->all()) {
            throw ValidationException::withMessages(['lines' => 'Inspect every item of this purchase request.']);
        }
        foreach ($data['lines'] as $i => $line) {
            if ($line['quantity_accepted'] > $lines[$line['id']]->quantity) {
                throw ValidationException::withMessages(["lines.$i.quantity_accepted" => "At most {$lines[$line['id']]->quantity} can be accepted."]);
            }
        }
        $short = collect($data['lines'])->contains(fn ($line) => $line['quantity_accepted'] < $lines[$line['id']]->quantity);
        if ($short && empty($data['inspection_remarks'])) {
            throw ValidationException::withMessages(['inspection_remarks' => 'Give the reason some items were not accepted.']);
        }

        DB::transaction(function () use ($request, $purchaseRequest, $data) {
            foreach ($data['lines'] as $line) {
                PurchaseRequestLine::whereKey($line['id'])->update(['quantity_accepted' => $line['quantity_accepted']]);
            }
            $purchaseRequest->forceFill([
                'status' => PurchaseRequestStatus::Inspected,
                'iar_no' => Sequence::number('IAR'),
                'inspected_on' => $data['inspected_on'],
                'inspection_remarks' => $data['inspection_remarks'] ?? null,
                'inspected_by' => $request->user()->id,
            ])->save();
        });

        Notify::user($purchaseRequest->user, 'Delivery inspected', "{$purchaseRequest->pr_no}: the delivery was inspected ({$purchaseRequest->iar_no}). The Supply Office will issue the accepted items.", "/purchase-requests/{$purchaseRequest->id}");

        return response()->json(['purchase_request' => $purchaseRequest->fresh(['lines', 'inspector:id,name'])]);
    }

    /**
     * Accepted items go into stock (an existing item, or a new one), then straight out to the end user on an RIS.
     * Property also gets an ICS (below the PAR threshold) or a PAR (at or above it), by the PR unit cost.
     */
    public function issue(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        $this->requireStatus($purchaseRequest, PurchaseRequestStatus::Inspected, 'Record the IAR before issuing.');

        $accepted = $purchaseRequest->lines()->where('quantity_accepted', '>', 0)->get()->keyBy('id');
        if ($accepted->isEmpty()) {
            throw ValidationException::withMessages(['lines' => 'Nothing was accepted, so there is nothing to issue.']);
        }

        $data = $request->validate([
            'received_by' => ['required', 'string', 'max:255'],
            'lines' => ['required', 'array'],
            'lines.*.id' => ['required', 'integer', 'distinct'],
            'lines.*.item_id' => ['nullable', 'integer', 'exists:items,id', 'required_without:lines.*.new_item'],
            'lines.*.new_item' => ['nullable', 'array'],
            'lines.*.new_item.stock_no' => ['required_with:lines.*.new_item', 'string', 'max:50', 'distinct', 'unique:items,stock_no'],
            'lines.*.new_item.name' => ['required_with:lines.*.new_item', 'string', 'max:255'],
            'lines.*.new_item.type' => ['required_with:lines.*.new_item', Rule::enum(ItemType::class)],
        ]);

        if (collect($data['lines'])->pluck('id')->sort()->values()->all() !== $accepted->keys()->sort()->values()->all()) {
            throw ValidationException::withMessages(['lines' => 'Choose a stock item for every accepted line.']);
        }

        $by = $request->user();
        DB::transaction(function () use ($purchaseRequest, $data, $accepted, $by) {
            $ris = ItemRequest::create([
                'user_id' => $purchaseRequest->user_id,
                'office' => $purchaseRequest->office,
                'purpose' => "{$purchaseRequest->purpose} ({$purchaseRequest->pr_no})",
                'status' => RequestStatus::Approved,
            ]);
            $threshold = config('spmu.par_threshold');

            foreach ($data['lines'] as $row) {
                $line = $accepted[$row['id']];
                $item = isset($row['new_item'])
                    ? Item::create($row['new_item'] + ['unit' => $line->unit, 'description' => $line->description, 'reorder_level' => 0])
                    : Item::findOrFail($row['item_id']);

                $this->ledger->move($item, $line->quantity_accepted, MovementType::StockIn, $by, $purchaseRequest, $purchaseRequest->iar_no);
                $risLine = $ris->lines()->create(['item_id' => $item->id, 'quantity_requested' => $line->quantity_accepted, 'quantity_approved' => $line->quantity_accepted]);
                $this->ledger->move($item, -$line->quantity_accepted, MovementType::Issue, $by, $ris, $ris->request_no);
                $risLine->forceFill(['quantity_issued' => $line->quantity_accepted])->save();
                // Decided once, at issue, so a later threshold change never moves a line to the other slip.
                $slip = $item->type !== ItemType::Property ? null : ((float) $line->unit_cost >= $threshold ? 'par' : 'ics');
                $line->forceFill(['item_id' => $item->id, 'slip' => $slip])->save();
            }

            $slips = $accepted->pluck('slip');
            $ris->forceFill(['decided_by' => $by->id, 'decided_at' => now(), 'status' => RequestStatus::Issued, 'issued_by' => $by->id, 'issued_at' => now(), 'received_by' => $data['received_by']])->save();
            $purchaseRequest->forceFill([
                'status' => PurchaseRequestStatus::Issued,
                'item_request_id' => $ris->id,
                'ics_no' => $slips->contains('ics') ? Sequence::number('ICS') : null,
                'par_no' => $slips->contains('par') ? Sequence::number('PAR') : null,
            ])->save();
        });

        Notify::user($purchaseRequest->user, 'Purchased items issued', "Items for {$purchaseRequest->pr_no} were released to {$data['received_by']}. Sign the RIS".($purchaseRequest->ics_no || $purchaseRequest->par_no ? ' and the ICS/PAR' : '').'.', "/purchase-requests/{$purchaseRequest->id}");

        return response()->json(['purchase_request' => $purchaseRequest->fresh(['lines.item', 'itemRequest:id,request_no'])]);
    }

    private function requireStatus(PurchaseRequest $pr, PurchaseRequestStatus $status, string $message): void
    {
        if ($pr->status !== $status) {
            throw ValidationException::withMessages(['status' => $message]);
        }
    }

    /** TWG (through the Supply Office) or BAC sends the PR back for corrections. */
    public function returnForCorrections(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        return DB::transaction(fn () => $this->returnLocked($request, $this->lock($purchaseRequest)));
    }

    private function returnLocked(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        $step = $this->currentStepFor($request->user(), $purchaseRequest, $request->input('step'));
        if (! $step->canReturn()) {
            throw ValidationException::withMessages(['step' => 'This step cannot return the PR.']);
        }

        $data = $request->validate(['remarks' => ['required', 'string', 'max:255']]);

        $purchaseRequest->forceFill(['status' => PurchaseRequestStatus::Returned, 'returned_remarks' => $data['remarks'], 'returned_at_step' => $step])->save();
        Notify::user($purchaseRequest->user, 'Purchase request returned', "{$purchaseRequest->pr_no} needs corrections: {$data['remarks']}", "/purchase-requests/{$purchaseRequest->id}");

        return response()->json(['purchase_request' => $purchaseRequest]);
    }

    /** The end user corrects a returned PR (purpose, specs, quantities, costs) and resubmits; the office steps start over. */
    public function update(Request $request, PurchaseRequest $purchaseRequest): JsonResponse
    {
        abort_unless($purchaseRequest->user_id === $request->user()->id, 403);
        if ($purchaseRequest->status !== PurchaseRequestStatus::Returned) {
            throw ValidationException::withMessages(['status' => 'Only a returned purchase request can be corrected.']);
        }

        $data = $request->validate([
            'purpose' => ['required', 'string', 'max:255'],
            'lines' => ['required', 'array'],
            'lines.*.id' => ['required', 'integer', 'distinct'],
            'lines.*.description' => ['required', 'string', 'max:500'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
            'lines.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:9999999999'],
        ]);

        $ids = $purchaseRequest->lines()->pluck('id')->sort()->values()->all();
        if (collect($data['lines'])->pluck('id')->sort()->values()->all() !== $ids) {
            throw ValidationException::withMessages(['lines' => 'Correct the items of this purchase request only.']);
        }

        DB::transaction(function () use ($purchaseRequest, $data) {
            foreach ($data['lines'] as $line) {
                PurchaseRequestLine::whereKey($line['id'])->update(['description' => $line['description'], 'quantity' => $line['quantity'], 'unit_cost' => $line['unit_cost']]);
            }
            $purchaseRequest->steps()->delete();
            $purchaseRequest->forceFill(['purpose' => $data['purpose'], 'status' => PurchaseRequestStatus::Submitted, 'returned_remarks' => null, 'returned_at_step' => null])->save();
        });

        Notify::admins('Purchase request resubmitted', "{$request->user()->name} corrected {$purchaseRequest->pr_no}.", "/purchase-requests/{$purchaseRequest->id}");

        return response()->json(['purchase_request' => $purchaseRequest->fresh('lines')]);
    }

    /**
     * Re-read the PR under a row lock. Two people acting on the same step at once then queue up:
     * the second sees the step already done and gets a 422, not a duplicate-key error.
     */
    private function lock(PurchaseRequest $pr): PurchaseRequest
    {
        return PurchaseRequest::lockForUpdate()->findOrFail($pr->id);
    }

    /** The step being acted on must be the PR's next step, and the user must hold that step's role. */
    private function currentStepFor(User $user, PurchaseRequest $pr, mixed $requested): PrStep
    {
        $next = $pr->status === PurchaseRequestStatus::Submitted ? $pr->nextStep() : null;
        if (! $next || $requested !== $next->value) {
            throw ValidationException::withMessages(['step' => $next ? 'Record the steps in order. The next step is '.str_replace('_', ' ', $next->value).'.' : 'This purchase request has no step waiting.']);
        }
        abort_unless($user->role === $next->role(), 403);

        return $next;
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'purpose' => ['required', 'string', 'max:255'],
            'inquiry_id' => ['required_without:inspection_id', 'prohibits:inspection_id', 'nullable', 'integer'],
            'inspection_id' => ['required_without:inquiry_id', 'nullable', 'integer'],
            'lines' => ['required', 'array', 'min:1', 'max:30'],
            'lines.*.inquiry_line_id' => ['nullable', 'integer', 'distinct'],
            'lines.*.description' => ['required', 'string', 'max:500'],
            'lines.*.unit' => ['required', 'string', 'max:30'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
            'lines.*.unit_cost' => ['required', 'numeric', 'min:0', 'max:9999999999'],
        ]);
        $user = $request->user();

        $pr = DB::transaction(function () use ($data, $user) {
            if (isset($data['inquiry_id'])) {
                $this->checkInquiry($data, $user);
            } else {
                $this->checkInspection($data['inspection_id'], $user);
                // Parts lines are free text; they never point at an SAI line.
                $data['lines'] = array_map(fn ($line) => array_merge($line, ['inquiry_line_id' => null]), $data['lines']);
            }

            $pr = PurchaseRequest::create(['user_id' => $user->id, 'office' => $user->office] + $data);
            $pr->lines()->createMany($data['lines']);

            return $pr;
        });

        Notify::admins('New purchase request', "{$user->name} submitted {$pr->pr_no}.", "/purchase-requests/{$pr->id}");

        return response()->json(['purchase_request' => $pr->load('lines')], 201);
    }

    /** Every line comes from this answered SAI, was tagged not available, and is not in another PR yet. */
    private function checkInquiry(array $data, User $user): void
    {
        $inquiry = Inquiry::with('lines')->lockForUpdate()->find($data['inquiry_id']);
        if (! $inquiry || $inquiry->user_id !== $user->id || $inquiry->status !== InquiryStatus::Answered) {
            throw ValidationException::withMessages(['inquiry_id' => 'Choose one of your answered availability inquiries.']);
        }

        $allowed = $inquiry->lines->where('availability', Availability::NotAvailable)->pluck('id');
        $used = PurchaseRequestLine::whereIn('inquiry_line_id', $allowed)->pluck('inquiry_line_id');
        foreach ($data['lines'] as $i => $line) {
            $id = $line['inquiry_line_id'] ?? null;
            if (! $allowed->contains($id) || $used->contains($id)) {
                throw ValidationException::withMessages(["lines.$i.inquiry_line_id" => 'Only items tagged not available, and not already in a purchase request, can be added.']);
            }
        }
    }

    /** Parts PR: the person's own report that found the item for replacement, repair or recoverable. */
    private function checkInspection(int $inspectionId, User $user): void
    {
        $inspection = Inspection::find($inspectionId);
        if (! $inspection
            || $inspection->user_id !== $user->id
            || $inspection->status !== InspectionStatus::Inspected
            || $inspection->outcome === InspectionOutcome::Unserviceable) {
            throw ValidationException::withMessages(['inspection_id' => 'Choose your pre-inspection report that found the item for replacement, repair or recoverable.']);
        }
    }

    /** The Supply Office and the BAC see every PR; personnel see their own. */
    private function seesAll(User $user): bool
    {
        return Gate::forUser($user)->any(['admin', 'validator']);
    }
}
