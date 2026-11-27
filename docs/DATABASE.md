# Database

MariaDB 10.4+ or MySQL 8, database `spmu_ims`, `utf8mb4`. The schema is defined by Laravel migrations in `database/migrations/`. Tests run on SQLite in memory.

## ERD

```
users 1───* item_requests 1───* item_request_lines *───1 items *───0..1 suppliers
  │                                    │                   │
  │                                    ├──1───* turnovers  └──1───* stock_movements
  │                                    │          │ *───0..1 iirups
  │                                    │          │ *───0..1 inspections
  │                                    └──1───* inspections
  │
  ├──1───* inquiries 1───* inquiry_lines 1───0..1 purchase_request_lines
  │                                                   │ *───0..1 items (after issue)
  └──1───* purchase_requests 1───* purchase_request_lines
                 │  1───* purchase_request_steps
                 │  *───0..1 inquiries, inspections
                 └  *───0..1 item_requests (the RIS it was issued on)

notifications ──► users (notifiable)
```

## Tables

### users — Accounts

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string | |
| email | string unique | |
| password | string | bcrypt hash |
| office | string null | college or office |
| role | string(20) | `admin`, `user`, `validator` |
| status | string(20) | `pending`, `approved`, `rejected`, `disabled` |
| remember_token, email_verified_at, timestamps | | Laravel defaults |

### suppliers — Suppliers

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | string | |
| contact_person, email, phone, address | string null | |
| notes | text null | |
| timestamps | | |

### items — Stocks

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| stock_no | string(50) unique | office stock or property number |
| name | string | |
| description | text null | |
| unit | string(30) | ream, box, unit, piece |
| category | string(100) null | |
| type | string(20) | `consumable`, `property` |
| quantity | unsigned int | changed only by `StockLedger` |
| reorder_level | unsigned int | low stock when quantity ≤ this |
| supplier_id | FK null | `suppliers`, set null on delete |
| image_path | string null | on the `public` disk, `items/` |
| timestamps | | |

### stock_movements — Stocks

The stock card. One row per change to `items.quantity`.

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| item_id | FK | `items` |
| user_id | FK null | who made the change |
| type | string(20) | `stock_in`, `issue`, `turnover`, `adjustment` |
| quantity | int | positive in, negative out |
| balance_after | unsigned int | |
| reference_type, reference_id | morph null | the `ItemRequest` or `Turnover` that caused it |
| remarks | string null | RIS/PRS number or reason |
| created_at | timestamp | indexed |

### item_requests — Requests

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| request_no | string(30) unique | `RIS-YYYY-NNNN`, set after insert |
| user_id | FK | requester |
| office | string null | copied from the user at submit time |
| purpose | string | |
| status | string(20) | `pending`, `approved`, `rejected`, `cancelled`, `issued` |
| remarks | string null | reason for a decision |
| decided_by, decided_at | FK null, timestamp | approve or reject |
| issued_by, issued_at | FK null, timestamp | release |
| received_by | string null | name of the person who took the items |
| timestamps | | |

### item_request_lines — Requests

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| item_request_id | FK | cascade delete |
| item_id | FK | restrict delete |
| quantity_requested | unsigned int | |
| quantity_approved | unsigned int | 0 = not approved |
| quantity_issued | unsigned int | set at issue |
| quantity_returned | unsigned int | property only, raised by received turnovers |
| timestamps | | |

### turnovers — Turnovers

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| turnover_no | string(30) unique | `PRS-YYYY-NNNN`, set after insert |
| user_id | FK | person turning over |
| item_request_line_id | FK | the specific issued line |
| quantity | unsigned int | |
| reason | string(30) | `no_longer_needed`, `transfer`, `retirement`, `unserviceable`, `other` |
| condition | string(20) | `serviceable`, `unserviceable` |
| status | string(20) | `pending`, `received`, `rejected` |
| remarks | string null | |
| decided_by, decided_at | FK null, timestamp | |
| inspection_id | FK null | `inspections`: the unserviceable report it follows. Required when a person turns over as `unserviceable` |
| are_no | string(50) null | ARE the received unserviceable item is indexed to |
| iirup_id | FK null | `iirups`: set when consolidated |
| timestamps | | |

### inspections — Inspections

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| inspection_no | string(30) unique | `PIR-YYYY-NNNN` |
| user_id | FK | the end user |
| item_request_line_id | FK | the issued property line |
| problem | string(500) | reported by the end user |
| status | string(20) | `requested`, `scheduled`, `inspected`, `cancelled` |
| scheduled_for | date null | |
| outcome | string(20) null | `unserviceable`, `replacement`, `repair`, `recoverable` |
| findings | text null | |
| inspected_by, inspected_at | FK null, timestamp | |
| timestamps | | |

### iirups — Turnovers (unserviceable property)

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| iirup_no | string(30) unique | `IIRUP-YYYY-NNNN` |
| status | string(20) | `submitted`, `scheduled`, `disposed` |
| disposal_date | date null | set by the disposal committee |
| disposal_method | string(30) null | `sale`, `transfer`, `destruction`, `donation`, `other` |
| disposed_on | date null | |
| remarks | string null | |
| created_by | FK null | admin who consolidated it |
| timestamps | | |

### inquiries, inquiry_lines — Procurement (SAI)

| Column | Type | Notes |
|---|---|---|
| inquiry_no | string(30) unique | `SAI-YYYY-NNNN` |
| user_id, office, purpose | FK, string null, string | |
| status | string(20) | `pending`, `answered` |
| answered_by, answered_at | FK null, timestamp | |
| lines: description, unit, quantity | string, string(30), unsigned int | free text |
| lines: availability, remarks | string(20) null, string null | `available`, `not_available` |

### purchase_requests — Procurement (PR)

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| pr_no | string(30) unique | `PR-YYYY-NNNN` (the system number; Procurement's series no. is a step) |
| user_id, office, purpose | FK, string null, string | |
| inquiry_id | FK null | source SAI |
| inspection_id | FK null | source pre-inspection (parts) |
| status | string(20) | `submitted`, `returned`, `ordered`, `delivered`, `inspected`, `issued` |
| returned_remarks, returned_at_step | string null, string(30) null | why and where it was returned |
| delivered_on, delivery_ref | date null, string(50) null | full delivery, DR or invoice no. |
| iar_no | string(30) unique null | `IAR-YYYY-NNNN` |
| inspected_on, inspection_remarks, inspected_by | date null, string null, FK null | |
| item_request_id | FK null | the RIS the accepted items were issued on |
| ics_no, par_no | string(30) unique null | `ICS-YYYY-NNNN`, `PAR-YYYY-NNNN` |
| timestamps | | `updated_at` is touched on every step, for "oldest waiting" |

### purchase_request_lines — Procurement

| Column | Type | Notes |
|---|---|---|
| purchase_request_id | FK | cascade delete |
| inquiry_line_id | FK unique null | an SAI line goes into one PR only |
| description | string(500) | specifications |
| unit, quantity | string(30), unsigned int | |
| unit_cost | decimal(12,2) | estimated; decides ICS or PAR |
| quantity_accepted | unsigned int null | set by the IAR |
| item_id | FK null | the stock item it became at issue |
| slip | string(3) null | `ics` or `par`, fixed at issue; null for consumables |

### purchase_request_steps — Procurement

One row per office step done. Unique (`purchase_request_id`, `step`). Columns: `step` (see `PrStep` in [MODULES.md](MODULES.md#procurement-availability-inquiry-sai-purchase-request-pr)), `done_on` date, `details` JSON (`series_no`, `awarded_to` and `award_amount`, `po_no`), `remarks`, `recorded_by`. Deleted when a returned PR is resubmitted.

### notifications — Notifications

Laravel's standard database notifications table. `data` holds `title`, `message`, `link`.

### supplier_orders, supplier_order_lines — Stock requests to suppliers (S3.3)

| Column | Type | Notes |
|---|---|---|
| order_no | string(30) unique | `SR-YYYY-NNNN` |
| supplier_id | FK | a supplier with stock requests cannot be removed |
| user_id | FK | admin who sent it |
| status | string(20) | `sent`, `delivered` |
| notes, delivered_at | text null, timestamp null | |
| lines: item_id, quantity, quantity_received | FK, unsigned int, unsigned int null | delivery adds `quantity_received` through `StockLedger` |

### sequences — Per-year document numbers (S4.7)

Primary key (`name`, `year`), `value` = last number used. `App\Support\Sequence::number('RIS')` locks the row, so two requests saved together never share a number. Names: `RIS`, `PRS`, `SR`, `PIR`, `IIRUP`, `SAI`, `PR`, `IAR`, `ICS`, `PAR`.

### audit_logs — Account and supplier changes (S6.4)

`user_id` (who), `action` (`account.approved`, `account.rejected`, `account.disabled`, `account.enabled`, `account.role_changed`, `supplier.created`, `supplier.updated`, `supplier.deleted`), `subject_type`, `subject_id`, `details` JSON, `created_at`. Insert only. Stock changes are in `stock_movements`.

`users.privacy_accepted_at` records when the person accepted the privacy notice at sign up (S1.5).

### Laravel tables

`sessions`, `cache`, `cache_locks`, `jobs`, `job_batches`, `failed_jobs`, `password_reset_tokens`.

## Changing the schema

1. `php artisan make:migration add_x_to_items_table`.
2. Write `up()` and `down()`. Never edit a migration that already ran on the server.
3. `php artisan test`, then `php artisan migrate` locally.
4. Update this file in the same commit.
5. On the server: back up, then `php artisan migrate --force`.

## Moving data from the old system

The old PHP app (`legacy/`) used a different schema (`stocks`, `stock_requests`, `equipment_borrowings`). No import script exists yet. At go-live, enter the physical count as opening balances with **Stock in** (story S8.3).
