<?php

namespace App\Modules\Requests;

use App\Models\User;
use App\Modules\Notifications\Notify;
use App\Modules\Stocks\Item;
use App\Modules\Stocks\MovementType;
use App\Modules\Stocks\StockLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ItemRequestController
{
    public function __construct(private StockLedger $ledger) {}

    /** Admins see every request; personnel see only their own. */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'status' => ['nullable', Rule::enum(RequestStatus::class)],
            'search' => ['nullable', 'string', 'max:100'],
        ]);

        $requests = ItemRequest::query()
            ->with(['user:id,name,office', 'lines.item:id,stock_no,name,unit,type'])
            ->when(! $this->isAdmin($request->user()), fn ($q) => $q->where('user_id', $request->user()->id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('request_no', 'like', "%{$s}%")
                ->orWhere('purpose', 'like', "%{$s}%")
                ->orWhereHas('user', fn ($q) => $q->where('name', 'like', "%{$s}%"))))
            ->latest('id')
            ->paginate(25);

        return response()->json($requests);
    }

    public function show(Request $request, ItemRequest $itemRequest): JsonResponse
    {
        $this->authorizeView($request->user(), $itemRequest);

        return response()->json([
            'request' => $itemRequest->load(['user:id,name,email,office', 'lines.item', 'decider:id,name', 'issuer:id,name']),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'purpose' => ['required', 'string', 'max:255'],
            'lines' => ['required', 'array', 'min:1', 'max:30'],
            'lines.*.item_id' => ['required', 'distinct', 'exists:items,id'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        // Early check so people do not request more than exists. The binding check happens at issue time.
        $items = Item::whereIn('id', array_column($data['lines'], 'item_id'))->get()->keyBy('id');
        foreach ($data['lines'] as $i => $line) {
            $item = $items[$line['item_id']];
            if ($line['quantity'] > $item->quantity) {
                throw ValidationException::withMessages([
                    "lines.$i.quantity" => "Only {$item->quantity} {$item->unit} of {$item->name} available.",
                ]);
            }
        }

        $itemRequest = DB::transaction(function () use ($request, $data) {
            $itemRequest = ItemRequest::create([
                'user_id' => $request->user()->id,
                'office' => $request->user()->office,
                'purpose' => $data['purpose'],
                'status' => RequestStatus::Pending,
            ]);

            foreach ($data['lines'] as $line) {
                $itemRequest->lines()->create([
                    'item_id' => $line['item_id'],
                    'quantity_requested' => $line['quantity'],
                ]);
            }

            return $itemRequest;
        });

        Notify::admins('New item request', "{$request->user()->name} submitted {$itemRequest->fresh()->request_no}.", "/requests/{$itemRequest->id}");

        return response()->json(['request' => $itemRequest->fresh('lines.item')], 201);
    }

    public function cancel(Request $request, ItemRequest $itemRequest): JsonResponse
    {
        abort_unless($itemRequest->user_id === $request->user()->id, 403);
        $this->requireStatus($itemRequest, RequestStatus::Pending);

        $itemRequest->update(['status' => RequestStatus::Cancelled]);

        return response()->json(['request' => $itemRequest]);
    }

    /** Approve all lines as requested, or pass lines[] to approve less per line (0 = not approved). */
    public function approve(Request $request, ItemRequest $itemRequest): JsonResponse
    {
        $this->requireStatus($itemRequest, RequestStatus::Pending);

        $data = $request->validate([
            'lines' => ['nullable', 'array'],
            'lines.*.id' => ['required', Rule::exists('item_request_lines', 'id')->where('item_request_id', $itemRequest->id)],
            'lines.*.quantity_approved' => ['required', 'integer', 'min:0'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $approved = collect($data['lines'] ?? [])->pluck('quantity_approved', 'id');

        DB::transaction(function () use ($request, $itemRequest, $approved, $data) {
            foreach ($itemRequest->lines as $line) {
                $quantity = $approved[$line->id] ?? $line->quantity_requested;

                if ($quantity > $line->quantity_requested) {
                    throw ValidationException::withMessages(['lines' => 'Approved quantity cannot be more than requested.']);
                }

                $line->update(['quantity_approved' => $quantity]);
            }

            if ((int) $itemRequest->lines()->sum('quantity_approved') === 0) {
                throw ValidationException::withMessages(['lines' => 'Approve at least one item, or reject the request instead.']);
            }

            $this->decide($itemRequest, RequestStatus::Approved, $request->user(), $data['remarks'] ?? null);
        });

        Notify::user($itemRequest->user, 'Request approved', "{$itemRequest->request_no} is approved. Claim your items at the Supply Office.", "/requests/{$itemRequest->id}");

        return response()->json(['request' => $itemRequest->fresh('lines.item')]);
    }

    public function reject(Request $request, ItemRequest $itemRequest): JsonResponse
    {
        $this->requireStatus($itemRequest, RequestStatus::Pending);

        $data = $request->validate(['remarks' => ['required', 'string', 'max:255']]);

        $this->decide($itemRequest, RequestStatus::Rejected, $request->user(), $data['remarks']);

        Notify::user($itemRequest->user, 'Request rejected', "{$itemRequest->request_no} was rejected: {$data['remarks']}", "/requests/{$itemRequest->id}");

        return response()->json(['request' => $itemRequest]);
    }

    /** The requester is at the counter: release the approved quantities and deduct stock. */
    public function issue(Request $request, ItemRequest $itemRequest): JsonResponse
    {
        $this->requireStatus($itemRequest, RequestStatus::Approved);

        $data = $request->validate(['received_by' => ['required', 'string', 'max:255']]);

        DB::transaction(function () use ($request, $itemRequest, $data) {
            foreach ($itemRequest->lines()->with('item')->where('quantity_approved', '>', 0)->get() as $line) {
                $this->ledger->move($line->item, -$line->quantity_approved, MovementType::Issue, $request->user(), $itemRequest, $itemRequest->request_no);
                $line->forceFill(['quantity_issued' => $line->quantity_approved])->save();
            }

            $itemRequest->forceFill([
                'status' => RequestStatus::Issued,
                'issued_by' => $request->user()->id,
                'issued_at' => now(),
                'received_by' => $data['received_by'],
            ])->save();
        });

        Notify::user($itemRequest->user, 'Items issued', "Items for {$itemRequest->request_no} were released to {$data['received_by']}.", "/requests/{$itemRequest->id}");

        return response()->json(['request' => $itemRequest->fresh('lines.item')]);
    }

    private function decide(ItemRequest $itemRequest, RequestStatus $status, User $by, ?string $remarks): void
    {
        $itemRequest->forceFill([
            'status' => $status,
            'decided_by' => $by->id,
            'decided_at' => now(),
            'remarks' => $remarks,
        ])->save();
    }

    private function requireStatus(ItemRequest $itemRequest, RequestStatus $status): void
    {
        if ($itemRequest->status !== $status) {
            throw ValidationException::withMessages(['status' => "This request is {$itemRequest->status->value}, not {$status->value}."]);
        }
    }

    private function authorizeView(User $user, ItemRequest $itemRequest): void
    {
        abort_unless($this->isAdmin($user) || $itemRequest->user_id === $user->id, 403);
    }

    private function isAdmin(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
