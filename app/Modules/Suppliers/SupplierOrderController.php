<?php

namespace App\Modules\Suppliers;

use App\Modules\Stocks\MovementType;
use App\Modules\Stocks\StockLedger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** S3.3: email a stock request to a supplier; record the delivery as stock in. */
class SupplierOrderController
{
    public function __construct(private StockLedger $ledger) {}

    public function index(Supplier $supplier): JsonResponse
    {
        return response()->json([
            'data' => $supplier->orders()->with(['lines.item:id,stock_no,name,unit', 'user:id,name'])->latest('id')->limit(50)->get(),
        ]);
    }

    public function store(Request $request, Supplier $supplier): JsonResponse
    {
        if (! $supplier->email) {
            throw ValidationException::withMessages(['supplier' => 'Add an email address to this supplier first.']);
        }

        $data = $request->validate([
            'notes' => ['nullable', 'string', 'max:1000'],
            'lines' => ['required', 'array', 'min:1', 'max:50'],
            // Only items this supplier provides.
            'lines.*.item_id' => ['required', 'distinct', Rule::exists('items', 'id')->where('supplier_id', $supplier->id)],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $order = DB::transaction(function () use ($request, $supplier, $data) {
            $order = $supplier->orders()->create(['user_id' => $request->user()->id, 'notes' => $data['notes'] ?? null]);
            $order->lines()->createMany($data['lines']);

            return $order;
        });

        Notification::route('mail', [$supplier->email => $supplier->name])->notify(new SupplierOrderMail($order));

        return response()->json(['order' => $order->load('lines.item')], 201);
    }

    /** Delivery arrived: add the received quantities to stock. Quantities default to what was ordered. */
    public function deliver(Request $request, SupplierOrder $order): JsonResponse
    {
        if ($order->status !== 'sent') {
            throw ValidationException::withMessages(['status' => 'This stock request is already marked delivered.']);
        }

        $data = $request->validate([
            'lines' => ['nullable', 'array'],
            'lines.*.id' => ['required', Rule::exists('supplier_order_lines', 'id')->where('supplier_order_id', $order->id)],
            'lines.*.quantity_received' => ['required', 'integer', 'min:0'],
        ]);

        $received = collect($data['lines'] ?? [])->pluck('quantity_received', 'id');

        DB::transaction(function () use ($request, $order, $received) {
            foreach ($order->lines()->with('item')->get() as $line) {
                $quantity = (int) ($received[$line->id] ?? $line->quantity);
                $line->forceFill(['quantity_received' => $quantity])->save();

                if ($quantity > 0) {
                    $this->ledger->move($line->item, $quantity, MovementType::StockIn, $request->user(), $order, "Delivery {$order->order_no}");
                }
            }

            $order->forceFill(['status' => 'delivered', 'delivered_at' => now()])->save();
        });

        return response()->json(['order' => $order->fresh('lines.item')]);
    }
}
