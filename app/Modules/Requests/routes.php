<?php

use App\Modules\Requests\ItemRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('requests', [ItemRequestController::class, 'index']);
    Route::post('requests', [ItemRequestController::class, 'store']);
    Route::get('requests/{itemRequest}', [ItemRequestController::class, 'show']);
    Route::post('requests/{itemRequest}/cancel', [ItemRequestController::class, 'cancel']);

    Route::middleware('can:admin')->group(function () {
        Route::post('requests/{itemRequest}/approve', [ItemRequestController::class, 'approve']);
        Route::post('requests/{itemRequest}/reject', [ItemRequestController::class, 'reject']);
        Route::post('requests/{itemRequest}/issue', [ItemRequestController::class, 'issue']);
    });
});
