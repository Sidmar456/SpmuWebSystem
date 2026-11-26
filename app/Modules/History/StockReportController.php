<?php

namespace App\Modules\History;

use App\Modules\Stocks\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** S6.3: monthly stock report per item, computed from stock_movements (the only record of stock changes). */
class StockReportController
{
    public function __invoke(Request $request): StreamedResponse
    {
        $request->validate(['month' => ['required', 'date_format:Y-m']]);

        $start = Carbon::createFromFormat('Y-m-d', $request->month.'-01')->startOfDay();
        $end = $start->copy()->addMonth();

        $rows = DB::table('stock_movements')
            ->where('created_at', '<', $end)
            ->groupBy('item_id')
            ->select('item_id')
            ->selectRaw('SUM(CASE WHEN created_at < ? THEN quantity ELSE 0 END) AS opening', [$start])
            ->selectRaw("SUM(CASE WHEN created_at >= ? AND type = 'stock_in' THEN quantity ELSE 0 END) AS stock_in", [$start])
            ->selectRaw("SUM(CASE WHEN created_at >= ? AND type = 'issue' THEN -quantity ELSE 0 END) AS issued", [$start])
            ->selectRaw("SUM(CASE WHEN created_at >= ? AND type = 'turnover' THEN quantity ELSE 0 END) AS turned_over", [$start])
            ->selectRaw("SUM(CASE WHEN created_at >= ? AND type = 'adjustment' THEN quantity ELSE 0 END) AS adjustments", [$start])
            ->selectRaw('SUM(quantity) AS closing')
            ->get()
            ->keyBy('item_id');

        $items = Item::orderBy('name')->get(['id', 'stock_no', 'name', 'unit']);

        return response()->streamDownload(function () use ($items, $rows) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['Stock no.', 'Item', 'Unit', 'Opening', 'Stock in', 'Issued', 'Turned over', 'Adjustments', 'Closing']);
            foreach ($items as $item) {
                $r = $rows[$item->id] ?? null;
                fputcsv($out, [$item->stock_no, $item->name, $item->unit, ...array_map(
                    fn ($column) => (int) ($r->$column ?? 0),
                    ['opening', 'stock_in', 'issued', 'turned_over', 'adjustments', 'closing'],
                )]);
            }
            fclose($out);
        }, "stock-report-{$request->month}.csv", ['Content-Type' => 'text/csv']);
    }
}
