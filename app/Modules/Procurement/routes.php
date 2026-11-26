<?php

use App\Modules\Procurement\InquiryController;
use App\Modules\Procurement\PurchaseRequestController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('inquiries', [InquiryController::class, 'index']);
    Route::post('inquiries', [InquiryController::class, 'store']);
    Route::get('inquiries/{inquiry}', [InquiryController::class, 'show']);
    Route::get('purchase-requests', [PurchaseRequestController::class, 'index']);
    Route::post('purchase-requests', [PurchaseRequestController::class, 'store']);
    Route::get('purchase-requests/{purchaseRequest}', [PurchaseRequestController::class, 'show']);
    Route::put('purchase-requests/{purchaseRequest}', [PurchaseRequestController::class, 'update']);
    // Role per step is checked in the controller (Supply Office or BAC validator).
    Route::post('purchase-requests/{purchaseRequest}/steps', [PurchaseRequestController::class, 'recordStep']);
    Route::post('purchase-requests/{purchaseRequest}/return', [PurchaseRequestController::class, 'returnForCorrections']);

    Route::middleware('can:admin')->group(function () {
        Route::post('inquiries/{inquiry}/answer', [InquiryController::class, 'answer']);
        Route::post('purchase-requests/{purchaseRequest}/delivery', [PurchaseRequestController::class, 'recordDelivery']);
        Route::post('purchase-requests/{purchaseRequest}/iar', [PurchaseRequestController::class, 'recordIar']);
        Route::post('purchase-requests/{purchaseRequest}/issue', [PurchaseRequestController::class, 'issue']);
    });
});
