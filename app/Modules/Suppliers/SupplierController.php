<?php

namespace App\Modules\Suppliers;

use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SupplierController
{
    public function index(Request $request): JsonResponse
    {
        $suppliers = Supplier::query()
            ->withCount('items')
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->orderBy('name')
            ->paginate(50);

        return response()->json($suppliers);
    }

    public function show(Supplier $supplier): JsonResponse
    {
        return response()->json(['supplier' => $supplier->load('items:id,supplier_id,stock_no,name,unit,quantity,reorder_level')]);
    }

    public function store(Request $request): JsonResponse
    {
        $supplier = Supplier::create($this->validated($request));
        Audit::log('supplier.created', $supplier, ['name' => $supplier->name]);

        return response()->json(['supplier' => $supplier], 201);
    }

    public function update(Request $request, Supplier $supplier): JsonResponse
    {
        $supplier->update($this->validated($request));
        Audit::log('supplier.updated', $supplier, ['changed' => array_keys($supplier->getChanges())]);

        return response()->json(['supplier' => $supplier]);
    }

    public function destroy(Supplier $supplier): JsonResponse
    {
        if ($supplier->items()->exists()) {
            throw ValidationException::withMessages(['supplier' => 'This supplier still has items. Move them to another supplier first.']);
        }

        if ($supplier->orders()->exists()) {
            throw ValidationException::withMessages(['supplier' => 'This supplier has stock requests on record, so it is kept for the history.']);
        }

        Audit::log('supplier.deleted', $supplier, ['name' => $supplier->name]);
        $supplier->delete();

        return response()->json(['message' => 'Supplier removed.']);
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'contact_person' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ], attributes: ['name' => 'supplier name', 'contact_person' => 'contact person']);
    }
}
