<?php

use App\Modules\Suppliers\SupplierController;
use App\Modules\Suppliers\SupplierOrderController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'can:admin'])->group(function () {
    Route::apiResource('suppliers', SupplierController::class);
    Route::get('suppliers/{supplier}/orders', [SupplierOrderController::class, 'index']);
    Route::post('suppliers/{supplier}/orders', [SupplierOrderController::class, 'store']);
    Route::post('supplier-orders/{order}/deliver', [SupplierOrderController::class, 'deliver']);
});
