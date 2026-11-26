# Modules

The backend is a Laravel 12 app split into modules under `app/Modules/`. Each module keeps its models, enums, controllers and routes in one flat folder. `routes/web.php` loads every `app/Modules/*/routes.php` under the `/api` prefix.

The five core modules match the Supply Office process: **Requests**, **Stocks**, **Suppliers**, **History** and **Turnovers**. **Accounts**, **Notifications** and **Dashboard** support them.

## Rules

1. **Every route has `auth`, and admin routes add `can:admin`.** Ownership checks (a user may only see their own requests or turnovers) happen in the controller.
2. **Only `StockLedger` changes `items.quantity`.** It locks the row, refuses negative stock, and writes a `stock_movements` row. `quantity` is not fillable on `Item`.
3. **Status changes go through one controller action each** (approve, reject, issue, receive). Each checks the current status first.
4. **Notify through `Notify::user()` or `Notify::admins()`.** Notifications are saved in the database and emailed through the queue.
5. **Every module has a feature test** in `tests/Feature/`.

## Summary

| Module | Folder | Owns tables | Uses |
|---|---|---|---|
| Accounts | `app/Modules/Accounts` | `users` | Notifications |
| Stocks | `app/Modules/Stocks` | `items`, `stock_movements` | Suppliers |
| Suppliers | `app/Modules/Suppliers` | `suppliers` | — |
| Requests | `app/Modules/Requests` | `item_requests`, `item_request_lines` | Stocks, Notifications |
| Turnovers | `app/Modules/Turnovers` | `turnovers` | Requests, Stocks, Notifications |
| History | `app/Modules/History` | — (read only) | Requests, Turnovers |
| Notifications | `app/Modules/Notifications` | `notifications` | Accounts |
| Dashboard | `app/Modules/Dashboard` | — (read only) | all |

## Accounts

Sign up, admin approval, login, profile. Roles: `admin` (Supply Office), `user` (personnel). Statuses: `pending`, `approved`, `rejected`, `disabled`.

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
| POST | `/api/accounts/{user}/role` | admin | `role`: `admin` or `user`. Not your own; the last active admin cannot be demoted |

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

A person turns over a specific property item that was issued to them. Statuses: `pending` → `received` or `rejected`. Number format `PRS-2026-0001`. Reasons: `no_longer_needed`, `transfer`, `retirement`, `unserviceable`, `other`. Conditions: `serviceable` (back to stock) and `unserviceable` (recorded, not added to stock).

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/turnovers/holdings` | login | My issued property items with `turnable_quantity` |
| GET | `/api/turnovers?status=` | login | Admin: all. User: own |
| POST | `/api/turnovers` | login | `item_request_line_id`, `quantity`, `reason`, `condition`, `remarks` |
| GET | `/api/turnovers/{id}` | owner or admin | Details |
| POST | `/api/turnovers/{id}/receive` | admin | Item is back. Admin may correct `condition` |
| POST | `/api/turnovers/{id}/reject` | admin | `remarks` required |
| GET | `/api/clearance/{user}` | that person or admin | Property still under the person's name. Empty `holdings` = cleared |

On screen the admin **Inspects** a pending turnover and either **accepts** it (`receive`: the person is cleared of it) or **does not accept** it (`reject`: it stays under their name). The person sees "For inspection", "Received · cleared" or "Not accepted" with the reason. Print `/clearance/{user}` for retirement, transfer or resignation.

A person cannot turn over more than they hold, counting turnovers that are still pending.

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

Sent on: new account (to admins), account decided, new request (to admins), request approved, rejected or issued, new turnover (to admins), turnover received or rejected.

## Dashboard

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/dashboard` | admin | Counts, low-stock items, recent movements |
