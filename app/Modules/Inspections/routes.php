<?php

use App\Modules\Inspections\InspectionController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('inspections', [InspectionController::class, 'index']);
    Route::post('inspections', [InspectionController::class, 'store']);
    Route::get('inspections/{inspection}', [InspectionController::class, 'show']);
    Route::post('inspections/{inspection}/cancel', [InspectionController::class, 'cancel']);

    Route::middleware('can:admin')->group(function () {
        Route::post('inspections/{inspection}/schedule', [InspectionController::class, 'schedule']);
        Route::post('inspections/{inspection}/report', [InspectionController::class, 'report']);
    });
});
