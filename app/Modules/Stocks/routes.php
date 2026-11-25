<?php

use App\Modules\Stocks\ItemController;
use App\Modules\Stocks\StockMovementController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('items', [ItemController::class, 'index']);
    Route::get('items/{item}', [ItemController::class, 'show']);

    Route::middleware('can:admin')->group(function () {
        Route::post('items', [ItemController::class, 'store']);
        // POST, not PUT: PHP does not parse multipart bodies (image uploads) on PUT.
        Route::post('items/{item}', [ItemController::class, 'update']);
        Route::post('items/{item}/stock-in', [ItemController::class, 'stockIn']);
        Route::post('items/{item}/adjust', [ItemController::class, 'adjust']);
        Route::get('stock-movements', [StockMovementController::class, 'index']);
    });
});
