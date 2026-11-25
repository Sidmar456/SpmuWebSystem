<?php

namespace App\Modules\Stocks;

enum ItemType: string
{
    // Used up when issued (bond paper, ink). Never turned over.
    case Consumable = 'consumable';
    // Stays under the requester's accountability and can be turned over (projector, chair).
    case Property = 'property';
}
