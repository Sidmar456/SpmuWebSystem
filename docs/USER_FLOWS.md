# User Flows

Day-in-the-life flows. Each one names its module and stories ([BACKLOG.md](BACKLOG.md)) and the API calls behind it ([MODULES.md](MODULES.md)).

## F1. A new employee gets access — Accounts

1. Ana, a new instructor, signs up with her name, email, office (College of Engineering) and a password. `POST /api/register`
2. The account is `pending`. The Supply Office admins get a notification.
3. The Supply Officer opens the account requests, checks that Ana is ZPPSU personnel, and approves her. `POST /api/accounts/{id}/approve`
4. Ana gets an email and can log in.

Stories: S1.1, S1.2, S1.3.

## F2. Deliveries arrive — Stocks, Suppliers

1. Zamboanga Office Supplies delivers 50 reams of bond paper and 2 LCD projectors.
2. The officer finds bond paper (`OS-0001`, consumable) and records **Stock in** for 50. `POST /api/items/{id}/stock-in`
3. The projector is new, so the officer adds it as an item: `EQ-0001`, type `property`, unit `unit`, supplier Zamboanga Office Supplies, initial quantity 2, with a photo. `POST /api/items`
4. Both changes appear on each item's stock card. `GET /api/stock-movements?item_id=`

Stories: S2.1, S2.2, S2.3, S3.2.

## F3. Ana requests items — Request item

1. Ana browses stock, searching "paper". `GET /api/items?search=paper`
2. She adds 5 reams of bond paper and 1 LCD projector, writes the purpose "Seminar on 3 Dec", and submits. `POST /api/requests`
3. The server checks that enough stock exists. The request becomes **RIS-2026-0012**, `pending`. Admins are notified.

Stories: S4.1.

## F4. The officer decides — Request item

1. The officer opens RIS-2026-0012. Only 3 reams can be spared this week.
2. They approve 3 reams and 1 projector. `POST /api/requests/{id}/approve` with `lines[{id, quantity_approved: 3}]`
3. Ana is notified: "RIS-2026-0012 is approved. Claim your items at the Supply Office."
4. Had the request been wrong, the officer would reject it with a reason, and Ana would see that reason. `POST /api/requests/{id}/reject`

Stories: S4.2, S4.3.

## F5. Ana claims the items — Request item

1. Ana comes to the counter. The officer opens the approved request and clicks **Issue**, entering "Ana Cruz" as the receiver. `POST /api/requests/{id}/issue`
2. Bond paper goes down by 3 and the projector by 1, each with an `issue` movement pointing to RIS-2026-0012.
3. If another request had taken the last projector in the meantime, nothing would be deducted, and the officer would see "Not enough stock for LCD projector".
4. The officer prints the RIS slip, and Ana signs it (S4.6).

Stories: S4.5, S4.6.

## F6. Ana turns over the projector — Turnover

1. After the seminar, Ana opens **My property**. She sees the LCD projector from RIS-2026-0012, 1 unit she can turn over. `GET /api/turnovers/holdings`
2. She picks it, sets reason "No longer needed" and condition "Serviceable", and submits. `POST /api/turnovers`
3. The turnover becomes **PRS-2026-0004**, `pending`. Admins are notified.
4. Ana brings the projector to the office. The officer checks it, confirms it is serviceable, and clicks **Receive**. `POST /api/turnovers/{id}/receive`
5. The projector is back in stock with a `turnover` movement. Ana no longer holds it.

Stories: S5.1, S5.2, S5.3.

## F7. A broken chair is turned over — Turnover

1. Ben turns over 1 office chair and marks it serviceable.
2. At the office the officer finds a broken leg. They receive it with the condition changed to `unserviceable`.
3. The chair is recorded as returned by Ben, but it is not added back to stock. It waits for disposal.

Stories: S5.3.

## F8. Ana checks her history — Request history

1. Ana opens **History**. She sees one timeline: RIS-2026-0012 (issued, 3 reams and 1 projector) and PRS-2026-0004 (received, 1 projector), newest first. `GET /api/history`

Stories: S6.1.

## F9. Morning check — Dashboard, Stocks

1. The officer opens the dashboard: 2 requests pending, 1 approved and waiting to be issued, 1 turnover pending, and printer ink low (3 left, reorder level 5). `GET /api/dashboard`
2. They filter the item list by low stock and check which supplier carries printer ink. `GET /api/items?status=low_stock`, `GET /api/suppliers/{id}`

Stories: S6.2, S2.4, S3.2.

## F10. Audit question — Stocks, History

1. An auditor asks who released bond paper on 3 March and to whom.
2. The officer opens the bond paper stock card, filtered by date. Each `issue` row shows the RIS number, the admin who issued it, and the balance after. The RIS shows who received the items.

Stories: S2.3, S6.1.
