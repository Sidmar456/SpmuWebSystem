<?php

namespace App\Modules\Procurement;

use App\Models\User;
use App\Modules\Notifications\Notify;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** Supplies availability inquiry: the end user asks, the Supply Office tags each line available or not available. */
class InquiryController
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['status' => ['nullable', Rule::enum(InquiryStatus::class)]]);

        $inquiries = Inquiry::query()
            ->with('user:id,name,office')
            ->withCount('lines')
            ->when(! $this->isAdmin($request->user()), fn ($q) => $q->where('user_id', $request->user()->id))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest('id')
            ->paginate(25);

        return response()->json($inquiries);
    }

    public function show(Request $request, Inquiry $inquiry): JsonResponse
    {
        abort_unless($this->isAdmin($request->user()) || $inquiry->user_id === $request->user()->id, 403);

        return response()->json(['inquiry' => $inquiry->load(['user:id,name,email,office', 'lines.purchaseRequestLine.purchaseRequest:id,pr_no', 'answerer:id,name'])]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'purpose' => ['required', 'string', 'max:255'],
            'lines' => ['required', 'array', 'min:1', 'max:30'],
            'lines.*.description' => ['required', 'string', 'max:255'],
            'lines.*.unit' => ['required', 'string', 'max:30'],
            'lines.*.quantity' => ['required', 'integer', 'min:1'],
        ]);

        $inquiry = DB::transaction(function () use ($request, $data) {
            $inquiry = Inquiry::create(['user_id' => $request->user()->id, 'office' => $request->user()->office, 'purpose' => $data['purpose']]);
            $inquiry->lines()->createMany($data['lines']);

            return $inquiry;
        });

        $inquiry->refresh();
        Notify::admins('New availability inquiry', "{$request->user()->name} asked about {$inquiry->lines()->count()} items: {$inquiry->inquiry_no}.", "/inquiries/{$inquiry->id}");

        return response()->json(['inquiry' => $inquiry->load('lines')], 201);
    }

    /** Answer every line at once: available, or "none / not available". */
    public function answer(Request $request, Inquiry $inquiry): JsonResponse
    {
        if ($inquiry->status !== InquiryStatus::Pending) {
            throw ValidationException::withMessages(['status' => "{$inquiry->inquiry_no} is already answered."]);
        }

        $data = $request->validate([
            'lines' => ['required', 'array'],
            'lines.*.id' => ['required', 'integer', 'distinct'],
            'lines.*.availability' => ['required', Rule::enum(Availability::class)],
            'lines.*.remarks' => ['nullable', 'string', 'max:255'],
        ]);

        $ids = $inquiry->lines()->pluck('id')->sort()->values()->all();
        if (collect($data['lines'])->pluck('id')->sort()->values()->all() !== $ids) {
            throw ValidationException::withMessages(['lines' => 'Answer every item in this inquiry.']);
        }

        DB::transaction(function () use ($request, $inquiry, $data) {
            foreach ($data['lines'] as $line) {
                InquiryLine::whereKey($line['id'])->update(['availability' => $line['availability'], 'remarks' => $line['remarks'] ?? null]);
            }
            $inquiry->forceFill(['status' => InquiryStatus::Answered, 'answered_by' => $request->user()->id, 'answered_at' => now()])->save();
        });

        $missing = collect($data['lines'])->where('availability', Availability::NotAvailable->value)->count();
        Notify::user($inquiry->user, 'Availability inquiry answered', $missing
            ? "{$inquiry->inquiry_no}: {$missing} items are not available. You may prepare a purchase request for them."
            : "{$inquiry->inquiry_no}: all items are available. Request them from Stocks.", "/inquiries/{$inquiry->id}");

        return response()->json(['inquiry' => $inquiry->fresh(['lines', 'answerer:id,name'])]);
    }

    private function isAdmin(User $user): bool
    {
        return Gate::forUser($user)->allows('admin');
    }
}
