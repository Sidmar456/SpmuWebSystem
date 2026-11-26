<?php

namespace App\Modules\Stocks;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ItemController
{
    public function __construct(private StockLedger $ledger) {}

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', Rule::enum(ItemType::class)],
            'status' => ['nullable', Rule::in(['in_stock', 'low_stock', 'out_of_stock'])],
            'supplier_id' => ['nullable', 'integer'],
        ]);

        $items = Item::query()
            ->with('supplier:id,name')
            ->when($request->search, fn ($q, $s) => $q->where(fn ($q) => $q
                ->where('name', 'like', "%{$s}%")
                ->orWhere('stock_no', 'like', "%{$s}%")
                ->orWhere('category', 'like', "%{$s}%")))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->supplier_id, fn ($q, $id) => $q->where('supplier_id', $id))
            ->when($request->status === 'out_of_stock', fn ($q) => $q->where('quantity', 0))
            ->when($request->status === 'low_stock', fn ($q) => $q->lowStock()->where('quantity', '>', 0))
            ->when($request->status === 'in_stock', fn ($q) => $q->whereColumn('quantity', '>', 'reorder_level'))
            ->orderBy('name')
            ->paginate(50);

        return response()->json($items);
    }

    public function show(Item $item): JsonResponse
    {
        return response()->json(['item' => $item->load('supplier')]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request, [
            'stock_no' => ['required', 'string', 'max:50', 'unique:items,stock_no'],
            'initial_quantity' => ['nullable', 'integer', 'min:0'],
        ]);

        $item = DB::transaction(function () use ($request, $data) {
            $item = Item::create(Arr::except($data, ['image', 'initial_quantity']) + ['image_path' => $this->storeImage($request)]);

            if (! empty($data['initial_quantity'])) {
                $this->ledger->move($item, $data['initial_quantity'], MovementType::StockIn, $request->user(), remarks: 'Initial stock');
            }

            return $item;
        });

        return response()->json(['item' => $item->fresh('supplier')], 201);
    }

    public function update(Request $request, Item $item): JsonResponse
    {
        $data = $this->validated($request, [
            'stock_no' => ['required', 'string', 'max:50', Rule::unique('items', 'stock_no')->ignore($item)],
        ]);

        if ($path = $this->storeImage($request)) {
            if ($item->image_path) {
                Storage::disk('public')->delete($item->image_path);
            }
            $data['image_path'] = $path;
        }

        $item->update(Arr::except($data, ['image']));

        return response()->json(['item' => $item->fresh('supplier')]);
    }

    /** Delivery received: add stock. */
    public function stockIn(Request $request, Item $item): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'min:1'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $this->ledger->move($item, $data['quantity'], MovementType::StockIn, $request->user(), remarks: $data['remarks'] ?? null);

        return response()->json(['item' => $item->fresh()]);
    }

    /** Physical count correction, damage, loss. Can be negative. A reason is required. */
    public function adjust(Request $request, Item $item): JsonResponse
    {
        $data = $request->validate([
            'quantity' => ['required', 'integer', 'not_in:0'],
            'remarks' => ['required', 'string', 'max:255'],
        ]);

        $this->ledger->move($item, $data['quantity'], MovementType::Adjustment, $request->user(), remarks: $data['remarks']);

        return response()->json(['item' => $item->fresh()]);
    }

    /** One validate() call, so the form gets every field error at once. */
    private function validated(Request $request, array $extra): array
    {
        return $request->validate(rules: $extra + [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'unit' => ['required', 'string', 'max:30'],
            'category' => ['nullable', 'string', 'max:100'],
            'type' => ['required', Rule::enum(ItemType::class)],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ], attributes: [
            // Match the form labels in error messages.
            'stock_no' => 'stock / property no.',
            'name' => 'item name',
            'description' => 'specifications',
            'supplier_id' => 'supplier',
            'initial_quantity' => 'opening quantity',
            'image' => 'photo',
        ]);
    }

    private function storeImage(Request $request): ?string
    {
        return $request->file('image')?->store('items', 'public');
    }
}
