<?php

namespace App\Modules\Turnovers;

use App\Models\User;
use App\Modules\Inspections\Inspection;
use App\Modules\Inspections\InspectionOutcome;
use App\Modules\Inspections\InspectionStatus;
use App\Modules\Notifications\Notify;
use App\Modules\Requests\ItemRequestLine;
use App\Modules\Requests\RequestStatus;
use App\Modules\Stocks\ItemType;
use App\Modules\Stocks\MovementType;
use App\Modules\Stocks\StockLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TurnoverController
{
    public function __construct(private StockLedger $ledger) {}

    /** Property items issued to the current user that can still be turned over. */
    public function holdings(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->heldBy($request->user())]);
    }

    /**
     * Property clearance: what is still under a person's name. An empty list means they are cleared.
     * Personnel see their own; admins see anyone's (for retirement, transfer or resignation).
     */
    public function clearance(Request $request, User $user): JsonResponse
    {
        abort_unless($this->isAdmin($request->user()) || $request->user()->is($user), 403);

        return response()->json([
            'user' => $user->only('id', 'name', 'email', 'office'),
            'holdings' => $this->heldBy($user),
            'checked_at' => now(),
        ]);
    }

    private function heldBy(User $user)
    {
        return ItemRequestLine::query()
            ->with(['item:id,stock_no,name,unit', 'request:id,request_no,issued_at'])
            ->whereHas('item', fn ($q) => $q->where('type', ItemType::Property))
            ->whereHas('request', fn ($q) => $q
                ->where('user_id', $user->id)
                ->where('status', RequestStatus::Issued))
            ->whereColumn('quantity_returned', '<', 'quantity_issued')
            ->get()
            ->map(fn (ItemRequestLine $line) => $line->setAttribute('turnable_quantity', $line->turnableQuantity()))
            ->values();
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(TurnoverStatus::class)],
            'condition' => ['nullable', Rule::enum(ItemCondition::class)],
            'unconsolidated' => ['nullable', 'boolean'],
        ]);

        $turnovers = Turnover::query()
            ->with(['user:id,name,office', 'line.item:id,stock_no,name,unit', 'line.request:id,request_no'])
            ->when(! $this->isAdmin($request->user()), fn ($q) => $q->where('user_id', $request->user()->id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->condition, fn ($q, $c) => $q->where('condition', $c))
            // Unserviceable register: items not yet in an IIRUP.
            ->when($request->boolean('unconsolidated'), fn ($q) => $q->whereNull('iirup_id'))
            ->latest('id')
            ->paginate(25);

        return response()->json($turnovers);
    }

    public function show(Request $request, Turnover $turnover): JsonResponse
    {
        abort_unless($this->isAdmin($request->user()) || $turnover->user_id === $request->user()->id, 403);

        return response()->json([
            'turnover' => $turnover->load(['user:id,name,email,office', 'line.item', 'line.request:id,request_no,issued_at', 'decider:id,name', 'inspection:id,inspection_no,status,outcome,scheduled_for,inspected_at,created_at', 'iirup:id,iirup_no,status,disposed_on']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_request_line_id' => ['required', 'integer'],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['required', Rule::enum(TurnoverReason::class)],
            'condition' => ['required', Rule::enum(ItemCondition::class)],
            'remarks' => ['nullable', 'string', 'max:255'],
            'inspection_id' => ['nullable', 'integer'],
        ]);

        // Office flow: unserviceable equipment is pre-inspected before turnover, and a linked report decides the condition.
        $unserviceable = $data['condition'] === ItemCondition::Unserviceable->value;
        if ($unserviceable && ! isset($data['inspection_id'])) {
            throw ValidationException::withMessages(['condition' => 'Unserviceable equipment needs a pre-inspection first. Request one from Property in your care.']);
        }
        if (! $unserviceable && isset($data['inspection_id'])) {
            throw ValidationException::withMessages(['condition' => 'The pre-inspection found this item unserviceable.']);
        }

        $turnover = DB::transaction(function () use ($request, $data) {
            $line = ItemRequestLine::with(['item', 'request'])->lockForUpdate()->find($data['item_request_line_id']);

            if (! $line
                || $line->request->user_id !== $request->user()->id
                || $line->request->status !== RequestStatus::Issued
                || $line->item->type !== ItemType::Property) {
                throw ValidationException::withMessages(['item_request_line_id' => 'Choose a property item that was issued to you.']);
            }

            if ($data['quantity'] > $line->turnableQuantity()) {
                throw ValidationException::withMessages(['quantity' => "You can turn over at most {$line->turnableQuantity()} {$line->item->unit}."]);
            }

            if (isset($data['inspection_id'])) {
                $this->requireUnserviceableReport($data['inspection_id'], $line, $request->user());
            }

            return Turnover::create($data + ['user_id' => $request->user()->id]);
        });

        $turnover->refresh();
        Notify::admins('New turnover request', "{$request->user()->name} submitted {$turnover->turnover_no}.", "/turnovers/{$turnover->id}");

        return response()->json(['turnover' => $turnover->load('line.item')], 201);
    }

    /** The Supply Office has the item back. Serviceable items return to stock. */
    public function receive(Request $request, Turnover $turnover): JsonResponse
    {
        $this->requirePending($turnover);

        $data = $request->validate([
            // The office may find the item in a different condition than the person reported.
            'condition' => ['nullable', Rule::enum(ItemCondition::class)],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        // A pre-inspection already condemned this item; it must not go back to stock.
        if ($turnover->inspection_id && ($data['condition'] ?? null) === ItemCondition::Serviceable->value) {
            throw ValidationException::withMessages(['condition' => 'The pre-inspection found this item unserviceable, so it cannot be received as serviceable.']);
        }

        DB::transaction(function () use ($request, $turnover, $data) {
            $line = ItemRequestLine::with('item')->lockForUpdate()->findOrFail($turnover->item_request_line_id);
            $condition = isset($data['condition']) ? ItemCondition::from($data['condition']) : $turnover->condition;

            $line->forceFill(['quantity_returned' => $line->quantity_returned + $turnover->quantity])->save();

            if ($condition === ItemCondition::Serviceable) {
                $this->ledger->move($line->item, $turnover->quantity, MovementType::Turnover, $request->user(), $turnover, $turnover->turnover_no);
            }

            $turnover->forceFill([
                'status' => TurnoverStatus::Received,
                'condition' => $condition,
                'remarks' => $data['remarks'] ?? $turnover->remarks,
                'decided_by' => $request->user()->id,
                'decided_at' => now(),
            ])->save();
        });

        Notify::user($turnover->user, 'Turnover accepted: you are cleared', "The Supply Office received and accepted {$turnover->turnover_no}. The item is no longer under your name.", "/turnovers/{$turnover->id}");

        return response()->json(['turnover' => $turnover->fresh('line.item')]);
    }

    public function reject(Request $request, Turnover $turnover): JsonResponse
    {
        $this->requirePending($turnover);

        $data = $request->validate(['remarks' => ['required', 'string', 'max:255']]);

        $turnover->forceFill([
            'status' => TurnoverStatus::Rejected,
            'remarks' => $data['remarks'],
            'decided_by' => $request->user()->id,
            'decided_at' => now(),
        ])->save();

        Notify::user($turnover->user, 'Turnover not accepted', "{$turnover->turnover_no} was not accepted: {$data['remarks']} The item is still under your name.", "/turnovers/{$turnover->id}");

        return response()->json(['turnover' => $turnover]);
    }

    /** Unserviceable stockroom register: record the ARE number a received unserviceable item is indexed to. */
    public function indexToAre(Request $request, Turnover $turnover): JsonResponse
    {
        if ($turnover->status !== TurnoverStatus::Received || $turnover->condition !== ItemCondition::Unserviceable) {
            throw ValidationException::withMessages(['are_no' => 'Only received unserviceable items go in the unserviceable register.']);
        }
        if ($turnover->iirup_id !== null) {
            throw ValidationException::withMessages(['are_no' => 'This item is already in an IIRUP; its ARE no. can no longer change.']);
        }

        $data = $request->validate(['are_no' => ['required', 'string', 'max:50']]);
        $turnover->forceFill(['are_no' => $data['are_no']])->save();

        return response()->json(['turnover' => $turnover]);
    }

    /** A linked report must be the person's own, for the same item, and have found it unserviceable. */
    private function requireUnserviceableReport(int $inspectionId, ItemRequestLine $line, User $user): void
    {
        $inspection = Inspection::find($inspectionId);

        if (! $inspection
            || $inspection->user_id !== $user->id
            || $inspection->item_request_line_id !== $line->id
            || $inspection->status !== InspectionStatus::Inspected
            || $inspection->outcome !== InspectionOutcome::Unserviceable) {
            throw ValidationException::withMessages(['inspection_id' => 'Link only your pre-inspection report that found this item unserviceable.']);
        }
    }

    private function requirePending(Turnover $turnover): void
    {
        if ($turnover->status !== TurnoverStatus::Pending) {
            throw ValidationException::withMessages(['status' => "This turnover is already {$turnover->status->value}."]);
        }
    }

    private function isAdmin(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
