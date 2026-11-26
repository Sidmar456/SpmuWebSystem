<?php

namespace App\Modules\History;

use App\Modules\Requests\ItemRequest;
use App\Modules\Turnovers\Turnover;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * One timeline of item requests (RIS) and turnovers (PRS).
 * Personnel see their own; admins see everyone's and can filter by person.
 */
class HistoryController
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'user_id' => ['nullable', 'integer'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $userId = Gate::allows('admin') ? $request->user_id : $request->user()->id;

        $scope = fn ($q) => $q
            ->when($userId, fn ($q, $id) => $q->where('user_id', $id))
            ->when($request->from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d));

        // shortcut: capped at the latest 200 of each kind; add paging when one person's history gets longer.
        $requests = ItemRequest::query()->tap($scope)
            ->with(['user:id,name,office', 'lines.item:id,name,unit'])
            ->latest('id')->limit(200)->get()
            ->map(fn (ItemRequest $r) => [
                'kind' => 'request',
                'id' => $r->id,
                'number' => $r->request_no,
                'status' => $r->status,
                'user' => $r->user,
                'summary' => $r->purpose,
                'items' => $r->lines->map(fn ($l) => [
                    'name' => $l->item->name,
                    'unit' => $l->item->unit,
                    'quantity' => $l->quantity_issued ?: ($l->quantity_approved ?: $l->quantity_requested),
                ]),
                'created_at' => $r->created_at,
                'decided_at' => $r->decided_at,
                'issued_at' => $r->issued_at,
            ]);

        $turnovers = Turnover::query()->tap($scope)
            ->with(['user:id,name,office', 'line.item:id,name,unit'])
            ->latest('id')->limit(200)->get()
            ->map(fn (Turnover $t) => [
                'kind' => 'turnover',
                'id' => $t->id,
                'number' => $t->turnover_no,
                'status' => $t->status,
                'user' => $t->user,
                'summary' => $t->reason,
                'items' => [[
                    'name' => $t->line->item->name,
                    'unit' => $t->line->item->unit,
                    'quantity' => $t->quantity,
                ]],
                'created_at' => $t->created_at,
                'decided_at' => $t->decided_at,
                'issued_at' => null,
            ]);

        return response()->json([
            'data' => $requests->concat($turnovers)->sortByDesc('created_at')->values(),
        ]);
    }
}
