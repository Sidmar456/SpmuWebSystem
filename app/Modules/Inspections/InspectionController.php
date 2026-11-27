<?php

namespace App\Modules\Inspections;

use App\Models\User;
use App\Modules\Notifications\Notify;
use App\Modules\Requests\ItemRequestLine;
use App\Modules\Requests\RequestStatus;
use App\Modules\Stocks\ItemType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Pre-inspection of issued equipment. The Supply Office acts as the inspectorate team. */
class InspectionController
{
    public function index(Request $request): JsonResponse
    {
        // `open` = requested or scheduled: still needs a date or the report.
        $request->validate(['status' => ['nullable', Rule::in(['open', ...array_column(InspectionStatus::cases(), 'value')])]]);

        $inspections = Inspection::query()
            ->with(['user:id,name,office', 'line.item:id,stock_no,name,unit', 'line.request:id,request_no'])
            ->when(! $this->isAdmin($request->user()), fn ($q) => $q->where('user_id', $request->user()->id))
            ->when($request->status === 'open', fn ($q) => $q->whereIn('status', [InspectionStatus::Requested, InspectionStatus::Scheduled]))
            ->when($request->status && $request->status !== 'open', fn ($q) => $q->where('status', $request->status))
            ->latest('id')
            ->paginate(25);

        return response()->json($inspections);
    }

    public function show(Request $request, Inspection $inspection): JsonResponse
    {
        $this->authorizeView($request->user(), $inspection);

        return response()->json([
            'inspection' => $inspection->load(['user:id,name,email,office', 'line.item', 'line.request:id,request_no,issued_at', 'inspector:id,name', 'turnovers:id,inspection_id,iirup_id,turnover_no,status,condition,quantity,are_no,decided_at,created_at', 'turnovers.iirup:id,iirup_no,status,disposed_on', 'purchaseRequests:id,inspection_id,pr_no,created_at']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'item_request_line_id' => ['required', 'integer'],
            'problem' => ['required', 'string', 'max:500'],
        ]);

        $inspection = DB::transaction(function () use ($request, $data) {
            $line = ItemRequestLine::with(['item', 'request'])->lockForUpdate()->find($data['item_request_line_id']);

            if (! $line
                || $line->request->user_id !== $request->user()->id
                || $line->request->status !== RequestStatus::Issued
                || $line->item->type !== ItemType::Property
                || $line->quantity_returned >= $line->quantity_issued) {
                throw ValidationException::withMessages(['item_request_line_id' => 'Choose a property item that is in your care.']);
            }

            $open = Inspection::where('item_request_line_id', $line->id)
                ->whereIn('status', [InspectionStatus::Requested, InspectionStatus::Scheduled])
                ->value('inspection_no');
            if ($open) {
                throw ValidationException::withMessages(['item_request_line_id' => "This item already has an open pre-inspection request ({$open})."]);
            }

            return Inspection::create($data + ['user_id' => $request->user()->id]);
        });

        $inspection->refresh();
        Notify::admins('New pre-inspection request', "{$request->user()->name} asked for an inspection: {$inspection->inspection_no}.", "/inspections/{$inspection->id}");

        return response()->json(['inspection' => $inspection->load('line.item')], 201);
    }

    /** The owner withdraws a request that has not been inspected yet. */
    public function cancel(Request $request, Inspection $inspection): JsonResponse
    {
        abort_unless($inspection->user_id === $request->user()->id, 403);
        $this->requireOpen($inspection);

        $inspection->forceFill(['status' => InspectionStatus::Cancelled])->save();
        Notify::admins('Pre-inspection cancelled', "{$request->user()->name} cancelled {$inspection->inspection_no}.", "/inspections/{$inspection->id}");

        return response()->json(['inspection' => $inspection]);
    }

    public function schedule(Request $request, Inspection $inspection): JsonResponse
    {
        $this->requireOpen($inspection);

        $data = $request->validate(['scheduled_for' => ['required', 'date', 'after_or_equal:today']]);

        $inspection->forceFill(['status' => InspectionStatus::Scheduled, 'scheduled_for' => $data['scheduled_for']])->save();

        $when = $inspection->scheduled_for->format('F j, Y');
        Notify::user($inspection->user, 'Inspection scheduled', "{$inspection->inspection_no} is scheduled for {$when}. Keep the item ready for the inspectorate team.", "/inspections/{$inspection->id}");

        return response()->json(['inspection' => $inspection]);
    }

    /** Pre-inspection report: the condition found and the findings. */
    public function report(Request $request, Inspection $inspection): JsonResponse
    {
        $this->requireOpen($inspection);

        $data = $request->validate([
            'outcome' => ['required', Rule::enum(InspectionOutcome::class)],
            'findings' => ['required', 'string', 'max:2000'],
        ]);

        $inspection->forceFill([
            'status' => InspectionStatus::Inspected,
            'outcome' => $data['outcome'],
            'findings' => $data['findings'],
            'inspected_by' => $request->user()->id,
            'inspected_at' => now(),
        ])->save();

        Notify::user($inspection->user, 'Pre-inspection report ready', "{$inspection->inspection_no}: {$inspection->outcome->value}. {$inspection->outcome->nextStep()}", "/inspections/{$inspection->id}");

        return response()->json(['inspection' => $inspection->fresh(['line.item', 'inspector:id,name'])]);
    }

    private function requireOpen(Inspection $inspection): void
    {
        if (! $inspection->status->isOpen()) {
            throw ValidationException::withMessages(['status' => "This pre-inspection is already {$inspection->status->value}."]);
        }
    }

    private function authorizeView(User $user, Inspection $inspection): void
    {
        abort_unless($this->isAdmin($user) || $inspection->user_id === $user->id, 403);
    }

    private function isAdmin(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
