<?php

namespace Database\Seeders;

use App\Models\User;
use App\Modules\Stocks\Item;
use App\Modules\Stocks\ItemType;
use App\Modules\Stocks\MovementType;
use App\Modules\Stocks\StockLedger;
use App\Modules\Suppliers\Supplier;
use Illuminate\Database\Seeder;

/** Local demo data only. Do not run on the production server; use `php artisan spmu:admin` there. */
class DatabaseSeeder extends Seeder
{
    public function run(StockLedger $ledger): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Supply Officer', 'email' => 'admin@example.com']);
        User::factory()->create(['name' => 'Ana Cruz', 'email' => 'user@example.com']);

        $supplier = Supplier::create([
            'name' => 'Zamboanga Office Supplies',
            'contact_person' => 'Juan Dela Cruz',
            'email' => 'sales@example.com',
            'phone' => '0917 000 0000',
        ]);

        // Last column: specifications shown on the item card, one per line.
        $items = [
            ['OS-0001', 'Bond paper A4', 'ream', 'Office supplies', ItemType::Consumable, 20, 100, 'Size: A4 (210 x 297 mm)
Weight: 80 gsm
500 sheets per ream'],
            ['OS-0002', 'Ballpen, black', 'box', 'Office supplies', ItemType::Consumable, 5, 30, 'Ink: black, 0.5 mm tip
12 pens per box'],
            ['OS-0003', 'Printer ink, black', 'bottle', 'Office supplies', ItemType::Consumable, 5, 3, 'For Epson L-series printers
70 ml per bottle'],
            ['EQ-0001', 'LCD projector', 'unit', 'Equipment', ItemType::Property, 1, 4, 'Brightness: 3,600 lumens
Inputs: HDMI, VGA
With remote and power cable'],
            ['EQ-0002', 'Extension cord', 'piece', 'Equipment', ItemType::Property, 2, 10, '4 outlets, 5 m cord
With surge protection'],
        ];

        foreach ($items as [$no, $name, $unit, $category, $type, $reorder, $qty, $specs]) {
            $item = Item::create([
                'stock_no' => $no, 'name' => $name, 'unit' => $unit, 'category' => $category, 'description' => $specs,
                'type' => $type, 'reorder_level' => $reorder, 'supplier_id' => $supplier->id,
            ]);
            $ledger->move($item, $qty, MovementType::StockIn, $admin, remarks: 'Opening balance');
        }
    }
}
