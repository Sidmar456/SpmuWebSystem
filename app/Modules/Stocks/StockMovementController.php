<?php

namespace App\Modules\Stocks;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockMovementController
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'item_id' => ['nullable', 'integer'],
            'type' => ['nullable', Rule::enum(MovementType::class)],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
        ]);

        $movements = StockMovement::query()
            ->with(['item:id,stock_no,name,unit', 'user:id,name'])
            ->when($request->item_id, fn ($q, $id) => $q->where('item_id', $id))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->latest('id')
            ->paginate(50);

        return response()->json($movements);
    }
}
