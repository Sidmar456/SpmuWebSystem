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

## Errors

Every `/api/*` error is JSON: 401 not logged in, 403 not allowed, 404 not found, 422 validation (`{"message", "errors": {field: [...]}}`). Set in `bootstrap/app.php`.

## Old system

The old React + plain PHP app is kept in `legacy/` for reference until the new UI covers every screen. It is not deployed.
