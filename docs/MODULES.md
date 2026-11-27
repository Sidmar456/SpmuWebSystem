# Modules

The backend is a Laravel 12 app split into modules under `app/Modules/`. Each module keeps its models, enums, controllers and routes in one flat folder. `routes/web.php` loads every `app/Modules/*/routes.php` under the `/api` prefix.

The core modules match the Supply Office process: **Requests**, **Stocks**, **Suppliers**, **History**, **Turnovers**, **Inspections** and **Procurement**. **Accounts**, **Notifications** and **Dashboard** support them.

## Rules

1. **Every route has `auth`, and admin routes add `can:admin`.** Ownership checks (a user may only see their own records) happen in the controller. Purchase request steps check the step's role (`admin` or `validator`) in the controller, because one route serves both.
2. **Only `StockLedger` changes `items.quantity`.** It locks the row, refuses negative stock, and writes a `stock_movements` row. `quantity` is not fillable on `Item`.
3. **Status changes go through one controller action each** (approve, reject, issue, receive). Each checks the current status first.
4. **Notify through `Notify::user()`, `Notify::admins()` or `Notify::role()`.** Notifications are saved in the database and emailed through the queue.
5. **Every module has a feature test** in `tests/Feature/`.

## Summary

| Module | Folder | Owns tables | Uses |
|---|---|---|---|
| Accounts | `app/Modules/Accounts` | `users` | Notifications |
| Stocks | `app/Modules/Stocks` | `items`, `stock_movements` | Suppliers |
| Suppliers | `app/Modules/Suppliers` | `suppliers` | — |
| Requests | `app/Modules/Requests` | `item_requests`, `item_request_lines` | Stocks, Notifications |
| Turnovers | `app/Modules/Turnovers` | `turnovers`, `iirups` | Requests, Stocks, Inspections, Notifications |
| Inspections | `app/Modules/Inspections` | `inspections` | Requests, Procurement, Notifications |
| Procurement | `app/Modules/Procurement` | `inquiries`, `inquiry_lines`, `purchase_requests`, `purchase_request_lines`, `purchase_request_steps` | Stocks, Requests, Inspections, Notifications |
| History | `app/Modules/History` | — (read only) | Requests, Turnovers |
| Notifications | `app/Modules/Notifications` | `notifications` | Accounts |
| Dashboard | `app/Modules/Dashboard` | — (read only) | all |

## Accounts

Sign up, admin approval, login, profile. Roles: `admin` (Supply Office), `user` (personnel), `validator` (BAC: personnel who also validate purchase requests and record the bid award). Statuses: `pending`, `approved`, `rejected`, `disabled`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/api/register` | public, 10/min | Create a `pending` account |
| POST | `/api/login` | public, 5/min per email | Log in (approved only) |
| POST | `/api/logout` | login | Log out |
| GET | `/api/me` | login | Current user |
| PUT | `/api/me` | login | Edit name, office, password |
| GET | `/api/accounts?status=` | admin | List accounts |
| POST | `/api/accounts/{user}/approve` | admin | `pending` → `approved` |
| POST | `/api/accounts/{user}/reject` | admin | `pending` → `rejected` |
| POST | `/api/accounts/{user}/disable` | admin | `approved` → `disabled`; ends their open sessions. Refused while they hold property, for your own account, and for the last active admin |
| POST | `/api/accounts/{user}/enable` | admin | `disabled` → `approved` |
| POST | `/api/accounts/{user}/role` | admin | `role`: `admin`, `user` or `validator`. Not your own; the last active admin cannot be demoted |

A disabled account cannot log in, and any session it still has is ended on its next request (`EnsureAccountActive` middleware).

First admin on a new server: `php artisan spmu:admin <email> "<name>"`.

## Stocks

Items and their balances. Types: `consumable` (used up) and `property` (stays under the requester's accountability and can be turned over). Each item shows `stock_status`: `in_stock`, `low_stock` (at or below `reorder_level`) or `out_of_stock`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/items?search=&type=&status=&supplier_id=` | login | List and filter |
| GET | `/api/items/{item}` | login | One item |
| POST | `/api/items` | admin | New item, optional photo and `initial_quantity` |
| POST | `/api/items/{item}` | admin | Edit details (never quantity) |
| POST | `/api/items/{item}/stock-in` | admin | Delivery received |
| POST | `/api/items/{item}/adjust` | admin | Count correction, damage, loss. Reason required |
| GET | `/api/stock-movements?item_id=&type=&from=&to=` | admin | Stock card and activity log |

Movement types: `stock_in`, `issue`, `turnover`, `adjustment`.

## Suppliers

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/suppliers?search=` | admin | List with item counts |
| GET | `/api/suppliers/{supplier}` | admin | Details and the items they supply |
| POST | `/api/suppliers` | admin | Add |
| PUT | `/api/suppliers/{supplier}` | admin | Edit |
| DELETE | `/api/suppliers/{supplier}` | admin | Remove (refused while items still point to it) |

## Requests (Requisition and Issue Slip, RIS)

Statuses: `pending` → `approved` → `issued`, or `pending` → `rejected` / `cancelled`. Number format `RIS-2026-0001`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/requests?status=&search=` | login | Admin: all. User: own |
| POST | `/api/requests` | login | Submit `purpose` and `lines[{item_id, quantity}]` |
| GET | `/api/requests/{id}` | owner or admin | Details |
| POST | `/api/requests/{id}/cancel` | owner | While `pending` |
| POST | `/api/requests/{id}/approve` | admin | Approve all, or `lines[{id, quantity_approved}]` to approve less |
| POST | `/api/requests/{id}/reject` | admin | `remarks` required |
| POST | `/api/requests/{id}/issue` | admin | Release at the counter, `received_by` required. Deducts stock |

Stock is deducted only at issue. If any line has run out, the whole issue is rolled back.

## Turnovers (Property Return Slip, PRS)

A person turns over a specific property item that was issued to them. Statuses: `pending` → `received` or `rejected`. Number format `PRS-2026-0001`. Reasons: `no_longer_needed`, `transfer`, `retirement`, `unserviceable`, `other`. Conditions: `serviceable` (back to stock) and `unserviceable` (recorded, not added to stock; goes to the unserviceable register).

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/turnovers/holdings` | login | My issued property items with `turnable_quantity` |
| GET | `/api/turnovers?status=&condition=&unconsolidated=` | login | Admin: all. User: own. `status=received&condition=unserviceable&unconsolidated=1` is the unserviceable register |
| POST | `/api/turnovers` | login | `item_request_line_id`, `quantity`, `reason`, `condition`, `remarks`, `inspection_id`. `unserviceable` requires `inspection_id` (an unserviceable report for the same item and person); a linked turnover must be `unserviceable` |
| GET | `/api/turnovers/{id}` | owner or admin | Details |
| POST | `/api/turnovers/{id}/receive` | admin | Item is back. Admin may correct `condition` |
| POST | `/api/turnovers/{id}/reject` | admin | `remarks` required |
| POST | `/api/turnovers/{id}/are` | admin | `are_no`: the ARE a received unserviceable item is indexed to. Locked once the item is in an IIRUP |
| GET | `/api/clearance/{user}` | that person or admin | Property still under the person's name. Empty `holdings` = cleared |
| GET | `/api/iirups` | admin | IIRUP list with item counts |
| POST | `/api/iirups` | admin | `turnover_ids[]`: received unserviceable items with an ARE no., not in another IIRUP. Creates `IIRUP-YYYY-NNNN`, status `submitted` |
| GET | `/api/iirups/{id}` | admin | Details with items |
| POST | `/api/iirups/{id}/schedule` | admin | `disposal_date` (today or later); `submitted`/`scheduled` → `scheduled` |
| POST | `/api/iirups/{id}/dispose` | admin | `disposal_method` (`sale`, `transfer`, `destruction`, `donation`, `other`), `disposed_on`, `remarks`; `scheduled` → `disposed` |

On screen the admin **Receives** a pending turnover and either **accepts** it (`receive`: the person is cleared of it) or **does not accept** it (`reject`: it stays under their name). The person sees "For receiving", "Received · cleared" or "Not accepted" with the reason. The counter may still find an item unserviceable on receipt. Print `/clearance/{user}` for retirement, transfer or resignation.

A person cannot turn over more than they hold, counting turnovers that are still pending.

## Inspections (pre-inspection, PIR)

A person asks the Supply Office (acting as the inspectorate) to check a property item in their care. Statuses: `requested` → `scheduled` → `inspected`, or `cancelled`. Number format `PIR-2026-0001`. Outcomes: `unserviceable` (turn it over), `replacement`, `repair`, `recoverable` (prepare a purchase request for parts).

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/inspections?status=` | login | Admin: all. User: own |
| POST | `/api/inspections` | login | `item_request_line_id`, `problem`. Only property in the person's care; one open request per item |
| GET | `/api/inspections/{id}` | owner or admin | Details with linked turnovers and purchase requests |
| POST | `/api/inspections/{id}/cancel` | owner | While `requested` or `scheduled` |
| POST | `/api/inspections/{id}/schedule` | admin | `scheduled_for` (today or later) |
| POST | `/api/inspections/{id}/report` | admin | `outcome`, `findings` |

## Procurement (availability inquiry SAI, purchase request PR)

**Availability inquiries.** Statuses: `pending` → `answered`. Number format `SAI-2026-0001`. Each line is answered `available` or `not_available`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/inquiries?status=` | login | Admin: all. User: own |
| POST | `/api/inquiries` | login | `purpose`, `lines[{description, unit, quantity}]` (free text, up to 30) |
| GET | `/api/inquiries/{id}` | owner or admin | Details; each line shows the PR it went into |
| POST | `/api/inquiries/{id}/answer` | admin | `lines[{id, availability, remarks}]` for every line, once |

**Purchase requests.** Number format `PR-2026-0001`. Statuses: `submitted` (going through the steps) → `ordered` (PO signed) → `delivered` → `inspected` (IAR) → `issued`; `returned` for corrections. Source: `inquiry_id` (only its `not_available` lines, each in one PR only) or `inspection_id` (an `inspected` report that is not `unserviceable`; free-text parts lines).

Office steps (`PrStep`), recorded in order, each with `done_on` and optional `remarks`:

| # | Step | Role | Extra fields | Can return |
|---|---|---|---|---|
| 1 | `twg_verified` | admin | — | yes |
| 2 | `series_assigned` | admin | `series_no` | |
| 3 | `bac_validated` | validator | — | yes |
| 4 | `bid_awarded` | validator | `awarded_to`, `award_amount` | |
| 5 | `burs_certified` | admin | — | |
| 6 | `funds_certified` | admin | — | |
| 7 | `contract_approved` | admin | — | |
| 8 | `po_signed` | admin | `po_no` | |

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/purchase-requests?status=` | login | Admin and validator: all. User: own. With line count and estimated total |
| POST | `/api/purchase-requests` | login | `purpose`, `inquiry_id` or `inspection_id`, `lines[{inquiry_line_id, description, unit, quantity, unit_cost}]` |
| GET | `/api/purchase-requests/{id}` | owner, admin or validator | Details, steps, `next_step`, `par_threshold` |
| PUT | `/api/purchase-requests/{id}` | owner | Correct a `returned` PR: `purpose`, `lines[{id, description, quantity, unit_cost}]`. Clears the steps |
| POST | `/api/purchase-requests/{id}/steps` | the step's role | `step` (must be `next_step`), `done_on`, `remarks`, extra fields. Step 8 sets `ordered` |
| POST | `/api/purchase-requests/{id}/return` | the step's role | `step` (`twg_verified` or `bac_validated`), `remarks` |
| POST | `/api/purchase-requests/{id}/delivery` | admin | `delivered_on`, `delivery_ref`; `ordered` → `delivered` |
| POST | `/api/purchase-requests/{id}/iar` | admin | `inspected_on`, `lines[{id, quantity_accepted}]`, `inspection_remarks` (required if any line is short). Creates `IAR-YYYY-NNNN` |
| POST | `/api/purchase-requests/{id}/issue` | admin | `received_by`, `lines[{id, item_id}` or `new_item{stock_no, name, type}]` for every accepted line. Stocks in, issues on a new RIS, sets `ICS-`/`PAR-` numbers |

Property lines with a PR unit cost below `config('spmu.par_threshold')` (`SPMU_PAR_THRESHOLD`, default 50,000) go on the ICS; at or above it, on the PAR.

## History

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/history?user_id=&from=&to=` | login | One timeline of requests and turnovers. User: own. Admin: all, or one person with `user_id` |

## Notifications

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/notifications` | login | Latest 50 and the unread count |
| POST | `/api/notifications/{id}/read` | login | Mark one read |
| POST | `/api/notifications/read-all` | login | Mark all read |

Sent on: new account (to admins), account decided, new request (to admins), request approved, rejected or issued, new turnover (to admins), turnover received or rejected, pre-inspection requested or cancelled (to admins), scheduled or reported, inquiry sent (to admins) or answered, PR submitted or resubmitted (to admins), PR waiting for the other role's step (to admins or validators), PR returned, PO signed, delivery inspected, purchased items issued. Daily at 7:00 AM: low stock and anything waiting more than 3 days (to admins).

## Dashboard

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/dashboard` | admin | Counts and the oldest waiting time per queue (pending requests, to issue, turnovers to receive, pending accounts, open pre-inspections, inquiries to answer, PRs waiting for the Supply Office), low-stock items, recent movements |
