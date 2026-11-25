<?php

use App\Modules\History\HistoryController;
use App\Modules\History\StockReportController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->get('history', [HistoryController::class, 'index']);
Route::middleware(['auth', 'can:admin'])->get('reports/stock', StockReportController::class);
