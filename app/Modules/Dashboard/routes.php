<?php

use App\Modules\Dashboard\DashboardController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'can:admin'])->get('dashboard', [DashboardController::class, 'index']);
