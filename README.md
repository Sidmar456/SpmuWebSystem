# SPMU IMS

Inventory Monitoring System for the Supply Office (Supply and Property Management Unit) of Zamboanga Peninsula Polytechnic State University (ZPPSU).

Personnel request items online. The Supply Office monitors stock, keeps supplier information, approves and issues requests, and receives property turned over by personnel. Unserviceable equipment goes through pre-inspection, the unserviceable stockroom, the IIRUP and disposal. Items not in stock go through an availability inquiry and a purchase request, tracked from TWG and BAC to delivery, inspection and issue. Every request and turnover is kept in a history. Built with Laravel 12, React 19 and MariaDB/MySQL.

> Status: every module and screen is built and tested (56 automated tests): accounts, stocks, suppliers and stock requests, request item (RIS), property turnover (PRS), pre-inspection, unserviceable property and disposal (IIRUP), availability inquiry (SAI), purchase requests with BAC validation, IAR, ICS and PAR, history and reports, notifications and the dashboard. What is left is on site: deployment, backups, the one-week user acceptance test and training (S8.1–S8.4). The old PHP app is kept in `legacy/` for reference. See [docs/BACKLOG.md](docs/BACKLOG.md) for story status, and start with [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md).

## Modules

| Module | What it does |
|---|---|
| Request item | Personnel request items, and the Supply Office approves (fully or partly), rejects and issues them |
| Stocks | Items, balances, low-stock status, stock in, adjustments, stock card |
| Supplier information | Supplier details and the items each one supplies |
| Request history | One timeline of every request and turnover, per person or office-wide |
| Turnover | Personnel turn over a specific issued property item; serviceable items return to stock |
| Inspections | Pre-inspection of equipment in a person's care: schedule, condition found, printable report (PIR) |
| Unserviceable property | Unserviceable stockroom register with ARE no., consolidated IIRUP, disposal schedule and record |
| Availability inquiries | Supplies availability inquiry (SAI): the Supply Office tags each item available or not available |
| Purchase requests | PR from not-available items or parts after a pre-inspection; office steps, BAC validation, delivery, IAR, stock in and issue (RIS, ICS, PAR) |
| Accounts, notifications, dashboard | Supporting modules |

Code: `app/Modules/<Module>/`. Endpoints: [docs/MODULES.md](docs/MODULES.md).

## Documents

| Document | What it covers |
|---|---|
| [PROJECT_PLAN.md](docs/PROJECT_PLAN.md) | Goal, scope, assumptions, roadmap, risks |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | How the parts connect, request and turnover flows |
| [USER_FLOWS.md](docs/USER_FLOWS.md) | Day-in-the-life flows |
| [MODULES.md](docs/MODULES.md) | Modules, rules, every endpoint and who can call it |
| [DATABASE.md](docs/DATABASE.md) | Tables, ERD, how to change the schema |
| [SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md) | Permission matrix, security and Data Privacy Act checklists |
| [BACKLOG.md](docs/BACKLOG.md) | Epics and stories by milestone, with status |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Server setup, scheduler, backups, go-live checklist, rollback |
| [UAT.md](docs/UAT.md) | Opening balances, one-week acceptance test scripts, issue log, sign-off |
| [USER_GUIDE.md](docs/USER_GUIDE.md) | How to use the system (personnel and Supply Office), training plan |

## Flows

These follow the Supply Office's own process documents.

**Unserviceable equipment** (Inspections, Turnovers, Unserviceable):

1. The person clicks **Request inspection** on an item in their care.
2. The Supply Office (the inspectorate) sets the date, inspects, and records the condition: unserviceable, for replacement, requires repair, or recoverable.
3. If unserviceable, the person clicks **Turn over item** on the report. The Supply Office **Receives** it, and it enters the unserviceable stockroom. The PRS is the return slip; record the ARE no. on the turnover.
4. If for replacement, repair or recoverable, the person prepares a purchase request for parts from the report.
5. On **Unserviceable**, tick register items and **Create IIRUP** for the disposal committee. Then **Schedule disposal**, and **Record disposal** after it is carried out.

Personnel cannot turn over equipment as unserviceable without a report that found it so.

**Purchase request** (Availability, Purchase requests):

1. The person sends an availability inquiry (SAI). The Supply Office tags each item available or not available.
2. The person clicks **Create purchase request** for the not-available items, with specifications and estimated unit costs.
3. The office steps are recorded in order, each with a date:

   | # | Step | Recorded by |
   |---|---|---|
   | 1 | TWG verified | Supply Office (can return the PR) |
   | 2 | PR series no. assigned | Supply Office |
   | 3 | BAC validated | BAC validator (can return the PR) |
   | 4 | Bid awarded | BAC validator |
   | 5 | BURS certified | Supply Office |
   | 6 | Funds certified | Supply Office |
   | 7 | Contract approved | Supply Office |
   | 8 | PO signed | Supply Office |

   A returned PR is corrected by the person and resubmitted, and the steps start over.
4. **Record delivery** (full delivery), then **Record inspection (IAR)** with the accepted quantity of each item.
5. **Stock in and issue**: accepted items go into stock and straight out on an RIS. Property also gets an ICS (below `SPMU_PAR_THRESHOLD`, default ₱50,000) or a PAR (at or above it).

Payment (voucher, ADA, check) stays on paper.

## Local setup on Windows

You need PHP 8.2+, Composer, Node.js 20+, and MariaDB or MySQL. XAMPP's MariaDB works. Check `php -v`: XAMPP's own PHP must be 8.2 or newer. Laravel Herd is an easy way to get a current PHP.

```
git clone https://github.com/Sidmar456/SpmuWebSystem.git
cd SpmuWebSystem
composer install
npm install
copy .env.example .env
php artisan key:generate
```

Create the database `spmu_ims` (utf8mb4) in phpMyAdmin. `.env.example` already points to it with XAMPP's default `root` login. Then:

```
php artisan migrate --seed
```

The seeder makes demo data: `admin@example.com` (admin) and `user@example.com` (personnel), both with the password `password`, plus one supplier and five items. Use it only locally. To try the BAC steps, sign up another account, approve it, and use **Make validator** in **Accounts**.

Updating a copy you already set up: after `git pull`, run `composer install`, `npm install` and `php artisan migrate` (not `migrate:fresh`, which deletes your data).

Optional `.env` setting: `SPMU_PAR_THRESHOLD` (default `50000`) is the unit cost from which property is issued on a PAR instead of an ICS.

Every day:

```
php artisan serve           # http://127.0.0.1:8000
npm run dev                 # React hot reload; or `npm run build` once
php artisan queue:work      # sends queued emails; with MAIL_MAILER=log they go to storage/logs/laravel.log
```

Checks before every commit:

```
php artisan test
vendor/bin/pint --test
```

## Roles

| Role | Who | Can |
|---|---|---|
| `admin` | Supply Office staff | Everything except the BAC steps: approve accounts, manage stock and suppliers, decide and issue requests, inspect equipment, receive turnovers, IIRUP and disposal, record office steps, deliveries and IARs, see all history |
| `user` | Requesting personnel | Browse stock, request items, request inspections, turn over their own property, send availability inquiries and purchase requests, see their own history |
| `validator` | BAC member | Everything personnel can do, plus see every purchase request, validate or return it, and record the bid award |

On a server, create the first admin with `php artisan spmu:admin <email> "<name>"`. Admins give the `validator` role in **Accounts**.

## Project layout

```
app/Modules/      one folder per module: models, enums, controllers, routes.php
database/         migrations, factories, demo seeder
routes/web.php    loads every module's routes under /api
tests/Feature/    one test file per module
config/spmu.php   SPMU settings (PAR threshold)
resources/js/     React app (M7)
docs/             planning and capstone documents
legacy/           old React + plain PHP app, reference only, not deployed
```
