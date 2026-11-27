# Architecture

## Overview

```
Browser (React SPA, built by Vite into public/build)
   │  fetch, same origin, session cookie + X-XSRF-TOKEN header
   ▼
Laravel 12 (PHP 8.2+)
   routes/web.php ── prefix /api ── app/Modules/*/routes.php
   │                                  │
   │                                  ├── Controllers (validate, authorize, respond JSON)
   │                                  ├── Gates: admin, validator (BAC)
   │                                  ├── StockLedger (only writer of items.quantity)
   │                                  └── Notify ──► notifications table
   │                                              └► jobs table ──► queue worker ──► SMTP
   ▼
MariaDB / MySQL ── database spmu_ims (see DATABASE.md)
```

## Why these choices

- **Session auth on the same origin, no Sanctum or tokens.** The React app is served by Laravel, so the normal `web` guard and CSRF protection work. Nothing to store in `localStorage`.
- **Modules as flat folders.** Each module is small (2 to 6 files). Deeper folders (`Http/Controllers/...`) would add navigation without adding clarity.
- **One stock ledger.** Every quantity change goes through `StockLedger::move()`, which locks the item row (`SELECT … FOR UPDATE`), refuses negative balances, and writes `stock_movements`. This gives a full stock card for audits and prevents two admins from issuing the same last unit.
- **Stock leaves at issue, not at approval.** Approval only reserves intent. The balance changes when the item physically leaves the office.
- **Queued notifications.** Email never blocks a request. If SMTP is down, the job retries and the in-app notification still exists.
- **Offices without accounts are recorded, not modelled.** TWG, Procurement, Budget, Accounting, OP, OPIA and the disposal committee work on paper. The Supply Office records their steps with a date, so the system shows where each document is without giving every office a login. Only the BAC has its own role (`validator`).
- **PR steps are an ordered list, not free statuses.** `PrStep` lists the 8 office steps in order with the role that records each. Only the first step not yet done can be recorded, so no office can be skipped, and the number of recorded steps tells whose turn it is.

## Request flow (RIS)

```
user   POST /api/requests                  ──► item_requests: pending      ──► admins notified
admin  POST /api/requests/{id}/approve     ──► approved (per-line quantity) ──► user notified
admin  POST /api/requests/{id}/issue       ──► StockLedger: -qty per line   ──► issued, user notified
       (any line short → whole issue rolls back, request stays approved)
```

## Turnover flow (PRS)

```
user   GET  /api/turnovers/holdings        ──► issued property lines with turnable_quantity
user   POST /api/turnovers                 ──► turnovers: pending           ──► admins notified
admin  POST /api/turnovers/{id}/receive    ──► line.quantity_returned += qty
                                               serviceable → StockLedger: +qty
                                               ──► received, user notified
```

On screen the counter step is **Receive** and a pending turnover reads "For receiving". A turnover with condition `unserviceable` needs `inspection_id`: a pre-inspection of the same item, by the same person, that found it unserviceable.

## Unserviceable equipment flow (PIR → PRS → IIRUP)

```
user   POST /api/inspections               ──► inspections: requested (PIR) ──► admins notified
admin  POST /api/inspections/{id}/schedule ──► scheduled                    ──► user notified
admin  POST /api/inspections/{id}/report   ──► inspected, outcome           ──► user notified with next step
         outcome unserviceable ─► user POST /api/turnovers with inspection_id ─► receive (above)
         replacement / repair / recoverable ─► user POST /api/purchase-requests with inspection_id
admin  POST /api/turnovers/{id}/are        ──► turnovers.are_no (unserviceable register)
admin  POST /api/iirups {turnover_ids}     ──► iirups: submitted, turnovers.iirup_id set
admin  POST /api/iirups/{id}/schedule      ──► scheduled (disposal date)
admin  POST /api/iirups/{id}/dispose       ──► disposed (method, date)
```

## Procurement flow (SAI → PR → IAR → RIS, ICS, PAR)

```
user   POST /api/inquiries                 ──► inquiries: pending (SAI)     ──► admins notified
admin  POST /api/inquiries/{id}/answer     ──► each line available | not_available ──► user notified
user   POST /api/purchase-requests         ──► purchase_requests: submitted (PR), from not-available SAI lines
admin or validator
       POST /api/purchase-requests/{id}/steps   ──► next PrStep, in order (role per step)
       POST /api/purchase-requests/{id}/return  ──► returned (TWG or BAC step only) ──► user notified
user   PUT  /api/purchase-requests/{id}    ──► corrected, submitted again, steps cleared
       (after PO signed) ──► ordered      ──► user notified
admin  POST /api/purchase-requests/{id}/delivery ──► delivered
admin  POST /api/purchase-requests/{id}/iar      ──► inspected, quantity_accepted per line (IAR)
admin  POST /api/purchase-requests/{id}/issue    ──► per line: StockLedger +qty (stock in), new RIS, StockLedger −qty (issue)
                                                    property: ICS (< SPMU_PAR_THRESHOLD) or PAR (≥)
                                                    ──► issued, user notified
```

## Errors

Every `/api/*` error is JSON: 401 not logged in, 403 not allowed, 404 not found, 422 validation (`{"message", "errors": {field: [...]}}`). Set in `bootstrap/app.php`.

## Old system

The old React + plain PHP app is kept in `legacy/` for reference until the new UI covers every screen. It is not deployed.
