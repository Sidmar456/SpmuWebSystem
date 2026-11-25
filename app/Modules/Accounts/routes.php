<?php

use App\Modules\Accounts\AccountController;
use App\Modules\Accounts\AuthController;
use Illuminate\Support\Facades\Route;

Route::post('register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
Route::post('forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,1');
Route::post('reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:10,1');

Route::middleware('auth')->group(function () {
    Route::post('logout', [AuthController::class, 'logout']);
    Route::get('me', [AuthController::class, 'me']);
    Route::put('me', [AuthController::class, 'updateProfile']);

    Route::middleware('can:admin')->group(function () {
        Route::get('accounts', [AccountController::class, 'index']);
        Route::post('accounts/{user}/approve', [AccountController::class, 'approve']);
        Route::post('accounts/{user}/reject', [AccountController::class, 'reject']);
        Route::post('accounts/{user}/disable', [AccountController::class, 'disable']);
        Route::post('accounts/{user}/enable', [AccountController::class, 'enable']);
        Route::post('accounts/{user}/role', [AccountController::class, 'changeRole']);
    });
});
