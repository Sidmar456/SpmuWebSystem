<?php

namespace App\Modules\Dashboard;

use App\Models\User;
use App\Modules\Accounts\AccountStatus;
use App\Modules\Requests\ItemRequest;
use App\Modules\Requests\RequestStatus;
use App\Modules\Stocks\Item;
use App\Modules\Stocks\StockMovement;
use App\Modules\Turnovers\Turnover;
use App\Modules\Turnovers\TurnoverStatus;
use Illuminate\Http\JsonResponse;

class DashboardController
{
    public function index(): JsonResponse
    {
        return response()->json([
            'counts' => [
                'items' => Item::count(),
                'low_stock' => Item::lowStock()->where('quantity', '>', 0)->count(),
                'out_of_stock' => Item::where('quantity', 0)->count(),
                'pending_requests' => ItemRequest::where('status', RequestStatus::Pending)->count(),
                'to_issue' => ItemRequest::where('status', RequestStatus::Approved)->count(),
                'pending_turnovers' => Turnover::where('status', TurnoverStatus::Pending)->count(),
                'pending_accounts' => User::where('status', AccountStatus::Pending)->count(),
            ],
            // When the oldest item in each queue started waiting, so the dashboard can show its age.
            'oldest' => [
                'pending_requests' => ItemRequest::where('status', RequestStatus::Pending)->min('created_at'),
                'to_issue' => ItemRequest::where('status', RequestStatus::Approved)->min('decided_at'),
                'pending_turnovers' => Turnover::where('status', TurnoverStatus::Pending)->min('created_at'),
                'pending_accounts' => User::where('status', AccountStatus::Pending)->min('created_at'),
            ],
            'low_stock_items' => Item::lowStock()->orderBy('quantity')->limit(10)
                ->get(['id', 'stock_no', 'name', 'unit', 'quantity', 'reorder_level']),
            'recent_movements' => StockMovement::with(['item:id,name,unit', 'user:id,name'])->latest('id')->limit(10)->get(),
        ]);
    }
}
