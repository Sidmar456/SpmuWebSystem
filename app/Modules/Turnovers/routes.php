<?php

use App\Modules\Turnovers\TurnoverController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('turnovers/holdings', [TurnoverController::class, 'holdings']);
    Route::get('clearance/{user}', [TurnoverController::class, 'clearance']);
    Route::get('turnovers', [TurnoverController::class, 'index']);
    Route::post('turnovers', [TurnoverController::class, 'store']);
    Route::get('turnovers/{turnover}', [TurnoverController::class, 'show']);

    Route::middleware('can:admin')->group(function () {
        Route::post('turnovers/{turnover}/receive', [TurnoverController::class, 'receive']);
        Route::post('turnovers/{turnover}/reject', [TurnoverController::class, 'reject']);
    });
});
