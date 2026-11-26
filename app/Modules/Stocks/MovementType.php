<?php

namespace App\Modules\Stocks;

enum MovementType: string
{
    case StockIn = 'stock_in';
    case Issue = 'issue';
    case Turnover = 'turnover';
    case Adjustment = 'adjustment';
}
