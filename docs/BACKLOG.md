# Backlog

Sizes: **S** about half a day, **M** about one day, **L** two to three days.
Tags: module (`core`, `accounts`, `stocks`, `suppliers`, `requests`, `turnovers`, `history`, `ui`) and audience (`admin`, `user`, `both`).

## Epics

| Epic | Milestone | Modules |
|---|---|---|
| E0 Laravel foundation | M0 | core |
| E1 Accounts | M1 | accounts |
| E2 Stocks | M2 | stocks |
| E3 Supplier information | M3 | suppliers |
| E4 Request item | M4 | requests |
| E5 Property turnover | M5 | turnovers |
| E6 Request history and reports | M6 | history, dashboard |
| E7 User interface | M7 | ui |
| E8 Launch | M8 | core |
| E9 Inspection and disposal | M9 | inspections, turnovers |
| E10 Procurement | M10 | procurement, stocks, requests |

## Status

Checked against the code on 25 Nov 2026 (branch `laravel-rewrite`). Update this table when a story merges.

| Story | Title | Status |
|---|---|---|
| S0.1 | Laravel app, module folders, route loading | Done |
| S0.2 | Session auth and `admin` gate | Done |
| S0.3 | JSON errors for every API route | Done |
| S0.4 | Feature tests per module | Done |
| S0.5 | CI on GitHub Actions (Pint, tests, build) | Done |
| S1.1 | Sign up as pending | Done |
| S1.2 | Approve or reject accounts | Done |
| S1.3 | Log in, log out, login rate limit | Done |
| S1.4 | Edit profile and password | Done |
| S1.5 | Privacy notice at sign up | Done |
| S1.6 | Forgot password by email | Done |
| S2.1 | Add and edit items with photo | Done |
| S2.2 | Stock in and adjustments through the ledger | Done |
| S2.3 | Stock card (movement history per item) | Done |
| S2.4 | Low-stock and out-of-stock status and filters | Done |
| S2.5 | Daily low-stock email to admins | Done |
| S3.1 | Supplier list, add, edit, remove | Done |
| S3.2 | Items per supplier | Done |
| S3.3 | Email a stock request to a supplier | Done |
| S4.1 | Submit a multi-item request | Done |
| S4.2 | Approve in full or in part | Done |
| S4.3 | Reject with a reason | Done |
| S4.4 | Cancel a pending request | Done |
| S4.5 | Issue at the counter, stock deducted | Done |
| S4.6 | Printable RIS slip | Done |
| S4.7 | RIS numbers restart each year | Done |
| S5.1 | List my issued property items | Done |
| S5.2 | Submit a turnover for a specific item | Done |
| S5.3 | Receive or reject a turnover | Done |
| S5.4 | Printable PRS slip | Done |
| S6.1 | Request history timeline | Done |
| S6.2 | Admin dashboard counts | Done |
| S6.3 | Monthly stock report export | Done |
| S6.4 | Audit log for account and supplier changes | Done |
| S7.1 | React shell, login and sign up | Done |
| S7.2 | Stocks screens | Done |
| S7.3 | Supplier screens | Done |
| S7.4 | Request screens (user and admin) | Done |
| S7.5 | Turnover screens (user and admin) | Done |
| S7.6 | History, notifications, dashboard screens | Done |
| S7.7 | Account approval screen | Done |
| S7.8 | Turnover inspection and clear outcome | Done |
| S1.7 | Disable, enable and change role of accounts | Done |
| S5.5 | Property clearance certificate | Done |
| S6.5 | Reminders for requests and turnovers waiting over 3 days | Done |
| S0.6 | Daily log rotation | Done |
| S8.1 | Production deployment | Ready: run on the server |
| S8.2 | Daily backups and a restore test | Ready: scripts tested locally |
| S8.3 | Opening balances and user acceptance test | Ready: run with the office |
| S8.4 | User guide and training | Guide done; training not held |
| S9.1 | Request a pre-inspection of issued equipment | Done |
| S9.2 | Schedule and record the pre-inspection report | Done |
| S9.3 | Route the outcome: turn over, or purchase request | Done |
| S9.4 | Unserviceable stockroom register and return slip | Done |
| S9.5 | Consolidated IIRUP | Done |
| S9.6 | Disposal schedule and record | Done |
| S10.1 | Availability inquiry and "not available" tag | Done |
| S10.2 | Purchase request (PR) from unavailable items | Done |
| S10.3 | BAC validation, then Supply Office approval | Done |
| S10.4 | Delivery, inspection request and IAR | Done |
| S10.5 | Accept delivered items into stock and issue | Done |
| S10.6 | ICS and PAR slips | Done |
| S6.6 | Dashboard and reminder for inspections, inquiries and PRs | Done |
| S0.7 | Design documents cover E9 and E10 | Done |

---

## M0 Laravel foundation

**S0.1 Laravel app, module folders, route loading** `core` — Done
- Laravel 12 at the repo root. Old app moved to `legacy/`.
- `app/Modules/<Module>/routes.php` files loaded under `/api` by `routes/web.php`.

**S0.2 Session auth and `admin` gate** `core` — Done
- `web` guard with session cookies. `Gate::define('admin')` in `AppServiceProvider`. Routes use `auth` and `can:admin`.

**S0.3 JSON errors for every API route** `core` — Done
- `/api/*` returns JSON 401, 403, 404, 422. No redirects, no HTML error pages.

**S0.4 Feature tests per module** `core` — Done
- 23 tests in `tests/Feature/`. `php artisan test` passes.

**S0.5 CI on GitHub Actions** `core` **S**
- On every pull request: `composer install`, `vendor/bin/pint --test`, `php artisan test`, `npm ci && npm run build`.

## M1 Accounts

**S1.1–S1.4** — Done. See [MODULES.md](MODULES.md#accounts).
- The password is checked before the account status, so a wrong password never reveals whether an email is registered.
- The session ID is regenerated on login. Logins are limited to 5 per minute per email and IP.

**S1.5 Privacy notice at sign up** `accounts` `user` **S**
- Sign up shows what is collected and why (RA 10173). The user must tick a box. Save `privacy_accepted_at` on `users`.

**S1.6 Forgot password by email** `accounts` `both` **S**
- Laravel's password reset broker. The `password_reset_tokens` table already exists.

## M2 Stocks

**S2.1–S2.4** — Done.
- `quantity` cannot be set through create or update. Only `StockLedger` changes it.
- Adjustments need a reason and cannot make stock negative.

**S2.5 Daily low-stock email to admins** `stocks` `admin` **S**
- Scheduled command at 7:00 AM lists items at or below their reorder level. It is skipped when there are none.

## M3 Supplier information

**S3.1–S3.2** — Done. A supplier cannot be removed while items still point to it.

**S3.3 Email a stock request to a supplier** `suppliers` `admin` **M**
- Pick a supplier and items with quantities. Send by queued mail. Save the request (date, items, status `sent` or `delivered`).
- Marking it delivered opens **Stock in** with the quantities filled in.

## M4 Request item

**S4.1–S4.5** — Done.
- Quantity is checked against stock at submit time, and again under a row lock at issue time.
- If any line is short at issue, nothing is deducted.

**S4.6 Printable RIS slip** `requests` `admin` **S**
- Print view: RIS number, requester, office, purpose, items, quantities, approved by, issued by, received by, dates, signature lines.

**S4.7 RIS numbers restart each year** `requests` **S**
- Replace the id-based number with a per-year counter in a locked `sequences` table.

## M5 Property turnover

**S5.1–S5.3** — Done.
- Only `property` items that were issued to the same user can be turned over.
- Pending turnovers count against what the user still holds.
- `serviceable` items go back to stock. `unserviceable` items are recorded only.

**S5.4 Printable PRS slip** `turnovers` `admin` **S**
- Print view: PRS number, the RIS it came from, item, quantity, reason, condition, received by, signature lines.

## M6 Request history and reports

**S6.1–S6.2** — Done.

**S6.3 Monthly stock report export** `history` `admin` **M**
- For a month and per item: opening balance, stock in, issued, turned over, adjustments, closing balance. These are computed from `stock_movements`. Download as CSV.

**S6.4 Audit log for account and supplier changes** `core` `admin` **S**
- Stock changes are already in `stock_movements`. Add an `audit_logs` table for account approval and rejection, and for supplier add, edit and remove.

## M7 User interface

React 19 in `resources/js`, built by Vite through `laravel-vite-plugin`, served by Laravel at `/`. Port the screens from `legacy/src/pages` to the new API.

**S7.1 React shell, login and sign up** `ui` `both` **M**
- One `api()` helper sends `credentials: 'same-origin'`, `Accept: application/json` and the `X-XSRF-TOKEN` header.
- After login, admins see the admin sidebar and personnel see the request portal.

**S7.2 Stocks screens** `ui` `admin` **L** — item list with filters, item form, stock in, adjust, stock card.
**S7.3 Supplier screens** `ui` `admin` **S** — list, form, supplier detail with items.
**S7.4 Request screens** `ui` `both` **L** — user: browse and submit, my requests. Admin: queue, approve with per-line quantity, reject, issue.
**S7.5 Turnover screens** `ui` `both` **M** — user: my property and turnover form. Admin: queue, receive, reject.
**S7.6 History, notifications, dashboard** `ui` `both` **M** — timeline, notification bell, dashboard cards.
**S7.7 Account approval screen** `ui` `admin` **S** — list sign-ups by status, approve, reject with confirmation.
**S7.8 Turnover inspection** `ui` `both` **S** — admin **Inspect**: accept (person cleared) or not accept (stays under their name, reason shown). Statuses read "For inspection", "Received · cleared", "Not accepted".
**S1.7 Account management** `accounts` `admin` **S** — disable (blocked while holding property, ends sessions), enable, make admin or personnel. Never your own account; never the last active admin.
**S5.5 Property clearance** `turnovers` `both` **S** — `/clearance/{user}` prints a Certificate of Property Clearance, or the list of property still held.
**S6.5 Waiting reminders** `core` `admin` **S** — `spmu:waiting` at 7:00 AM; dashboard cards show how long the oldest item has waited.
**S0.6 Log rotation** `core` **S** — `LOG_STACK=daily`, 30 days.

## M8 Launch

**S8.1 Production deployment** `core` **M** — follow [DEPLOYMENT.md](DEPLOYMENT.md). `php artisan spmu:check` passes, then the browser checks.
**S8.2 Daily backups and a restore test** `core` **S** — `scripts/backup.bat` daily; `scripts/restore-test.bat` checks a dump (row counts, item quantities equal their stock movements). See [DEPLOYMENT.md](DEPLOYMENT.md) section 9.
**S8.3 Opening balances and user acceptance test** `core` **M** — physical count entered with **Stock in**. Supply Office staff and 2 to 3 offices run [UAT.md](UAT.md) for one week. Sign-off by the Supply Office head.
**S8.4 User guide and training** `core` **S** — [USER_GUIDE.md](USER_GUIDE.md), with the training plan in Part 3.

## M9 Inspection and disposal

Source: the office's "Turning over unserviceable equipment" flow (`END USER.docx`). The Supply Office acts as the inspectorate team, so admins do every inspection step. No new role.

Aligned to the flow (26 Nov 2026): personnel cannot turn over equipment as unserviceable without a pre-inspection report that found it unserviceable. The counter can still mark an item unserviceable on receipt. The turnover counter step is called **Receive**, so "inspection" means only the pre-inspection. Inspection and turnover pages show one progress stepper: Requested, Scheduled, Inspected, Turned over, Received, In stockroom, IIRUP, Disposed.

**S9.1 Request a pre-inspection** `inspections` `user` **S**
- From **Property in your care**, the person picks an issued property item and describes the problem. This creates a pre-inspection request `PIR-YYYY-NNNN`, and admins are notified.
- One open request per item at a time. The person can cancel a request until it is inspected.

**S9.2 Schedule and record the pre-inspection report** `inspections` `admin` **S**
- The admin sets an inspection date, and the person is notified.
- The admin records the outcome and findings. Outcomes: `unserviceable`, `replacement`, `repair`, `recoverable`. The person is notified with the next step.
- Printable pre-inspection report.

**S9.3 Route the outcome** `inspections` `both` **S**
- `unserviceable`: the person is told to turn the item over. The turnover form opens with the item, the reason and the condition filled in, and the PRS links back to the report.
- `replacement`, `repair`, `recoverable`: the person prepares a purchase request for parts, with the report attached (links to S10.2).

**S9.4 Unserviceable stockroom register** `turnovers` `admin` **S**
- Received unserviceable turnovers are listed in a register (unserviceable stockroom). The PRS serves as the supply return slip. Record the ARE number each item was indexed to.

**S9.5 Consolidated IIRUP** `turnovers` `admin` **M**
- The admin picks register items not yet in an IIRUP and creates an Inventory and Inspection Report of Unserviceable Property. It is printable and marked submitted to the disposal committee.

**S9.6 Disposal schedule and record** `turnovers` `admin` **S**
- Set a disposal date on an IIRUP. Then mark it disposed, with the method and the date. Its items leave the register.

## M10 Procurement

Source: the office's "Procurement of goods and services" flow (`END USER.docx`, `PR.jpg`). In the system: the end user, the Supply Office (also the inspectorate) and the BAC `validator` account. The BAC validates the PR (or returns it with remarks), then records the bidding result and award recommendation; Supply proceeds only after BAC validates. TWG, Procurement, Budget, OP and Accounting have no accounts: the Supply Office ticks each of their steps with a date (TWG verified, PR no. assigned, contract approved, PO signed), shown on the PR progress stepper. Payment (voucher, ADA, check) is out of scope.

**S10.1 Availability inquiry** `procurement` `both` **S** — Done. **Availability → New inquiry**: free-text lines (description, unit, quantity), number `SAI-YYYY-NNNN`. Supply answers every line at once: available, or "not available" with remarks. Printable SAI (a PR supporting document).
**S10.2 Purchase request** `procurement` `user` **M** — Done. `PR-YYYY-NNNN` from an answered SAI (only lines tagged not available; each SAI line in one PR only) or from a pre-inspection report found for replacement, repair or recoverable (free-text parts lines). Specifications, quantity, estimated unit cost, totals. Printable, with a blank PR series no. for Procurement.
**S10.3 BAC validation and office steps** `procurement` `both` **M** — Done. Steps in order, each recorded with a date: TWG verified, PR series no. assigned, BAC validated, bid awarded (supplier, amount), BURS certified, funds certified, contract approved (OP), PO signed (PO no.). BAC steps belong to the `validator` role, the rest to the Supply Office. TWG and BAC can return the PR with remarks; the end user corrects specs, quantities and costs and resubmits, and the steps start over. PO signed sets the status to `ordered`.
**S10.4 Delivery and IAR** `procurement` `admin` **M** — Done. On a PR with a signed PO: **Record delivery** (full delivery, DR or invoice no., date), then **Record inspection (IAR)** with the accepted quantity per line (a reason is required when anything is not accepted). `IAR-YYYY-NNNN`, printable. Status `ordered` then `delivered` then `inspected`. Replacement deliveries for non-accepted items stay on paper.
**S10.5 Accept into stock and issue** `procurement` `admin` **S** — Done. **Stock in and issue** on an inspected PR: each accepted line maps to an existing stock item or a new one; stock goes in through the ledger (ref IAR no.) and straight out on a new RIS for the end user, already issued. PR status `issued`. Issued property shows in the person's care, so it can be turned over later.
**S10.6 ICS and PAR slips** `procurement` `admin` **S** — Done. At issue, property lines below `SPMU_PAR_THRESHOLD` (default 50,000, `config/spmu.php`) get an ICS no., at or above it a PAR no., by the PR unit cost. Printable ICS and PAR.

## Additions after M10

**S6.6 Dashboard and reminder for inspections, inquiries and PRs** `core` `admin` **S** — Done. Three dashboard cards with the age of the oldest: pre-inspections to schedule or report, availability inquiries to answer, and purchase requests waiting for the Supply Office (an office step it records, the delivery, the IAR or the issue; not while the BAC holds it). `spmu:waiting` at 7:00 AM includes the same three queues.

**S0.7 Design documents cover E9 and E10** `core` **S** — Done. ARCHITECTURE (unserviceable and procurement flows, why office steps are recorded), MODULES (Inspections, Procurement, IIRUP endpoints, `PrStep` table, validator role), DATABASE (new tables and columns, ERD, sequence names) and USER_FLOWS (F11 to F14) match the code.
