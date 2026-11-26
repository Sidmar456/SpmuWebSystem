<?php

namespace App\Modules\Turnovers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Supply Office records the OPIA and disposal committee steps for unserviceable property. */
class IirupController
{
    public function index(): JsonResponse
    {
        return response()->json(Iirup::query()->withCount('turnovers')->latest('id')->paginate(25));
    }

    public function show(Iirup $iirup): JsonResponse
    {
        return response()->json([
            'iirup' => $iirup->load(['creator:id,name', 'turnovers.user:id,name,office', 'turnovers.line.item:id,stock_no,name,unit', 'turnovers.line.request:id,request_no']),
        ]);
    }

    /** Consolidate register items (received, unserviceable, indexed to an ARE) into one IIRUP, submitted to the disposal committee. */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'turnover_ids' => ['required', 'array', 'min:1'],
            'turnover_ids.*' => ['integer', 'distinct'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $iirup = DB::transaction(function () use ($request, $data) {
            $turnovers = Turnover::whereKey($data['turnover_ids'])->lockForUpdate()->get();
            $eligible = $turnovers->filter(fn (Turnover $t) => $t->status === TurnoverStatus::Received
                && $t->condition === ItemCondition::Unserviceable
                && $t->are_no !== null
                && $t->iirup_id === null);

            if ($turnovers->count() !== count($data['turnover_ids']) || $eligible->count() !== $turnovers->count()) {
                throw ValidationException::withMessages(['turnover_ids' => 'Choose received unserviceable items that have an ARE no. and are not in an IIRUP yet.']);
            }

            $iirup = new Iirup(['remarks' => $data['remarks'] ?? null]);
            $iirup->forceFill(['status' => IirupStatus::Submitted, 'created_by' => $request->user()->id]);
            $iirup->save();
            Turnover::whereKey($data['turnover_ids'])->update(['iirup_id' => $iirup->id]);

            return $iirup;
        });

        return response()->json(['iirup' => $iirup->loadCount('turnovers')], 201);
    }

    public function schedule(Request $request, Iirup $iirup): JsonResponse
    {
        $this->requireNotDisposed($iirup);
        $data = $request->validate(['disposal_date' => ['required', 'date', 'after_or_equal:today']]);

        $iirup->forceFill(['status' => IirupStatus::Scheduled, 'disposal_date' => $data['disposal_date']])->save();

        return response()->json(['iirup' => $iirup]);
    }

    public function dispose(Request $request, Iirup $iirup): JsonResponse
    {
        if ($iirup->status !== IirupStatus::Scheduled) {
            throw ValidationException::withMessages(['status' => 'Set a disposal date before recording the disposal.']);
        }

        $data = $request->validate([
            'disposal_method' => ['required', Rule::in(Iirup::METHODS)],
            'disposed_on' => ['required', 'date', 'before_or_equal:today'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $iirup->forceFill(['status' => IirupStatus::Disposed, 'remarks' => $data['remarks'] ?? $iirup->remarks] + $data)->save();

        return response()->json(['iirup' => $iirup]);
    }

    private function requireNotDisposed(Iirup $iirup): void
    {
        if ($iirup->status === IirupStatus::Disposed) {
            throw ValidationException::withMessages(['status' => "{$iirup->iirup_no} is already disposed."]);
        }
    }
}
