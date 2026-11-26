# SPMU IMS

Inventory Monitoring System for the Supply and Property Management Unit (Supply Office) of Zamboanga Peninsula Polytechnic State University (ZPPSU).

It replaces paper request slips, logbooks and spreadsheet counts with one web app:

- Personnel request items online, return property they no longer need, report broken equipment, and ask for items the office does not have.
- The Supply Office keeps stock, suppliers and every slip in one place, and can show management and auditors who received what, when, and on which document.

Built with Laravel 12 (PHP), React 19 and MariaDB/MySQL.

> **Status:** every module and screen is built and tested (56 automated tests). What is left is done on site: deployment, backups, the one-week user acceptance test and training (stories S8.1–S8.4 in [docs/BACKLOG.md](docs/BACKLOG.md)). The old PHP app is kept in `legacy/` for reference only.

## Contents

1. [How the system works](#1-how-the-system-works)
2. [Roles](#2-roles)
3. [Modules](#3-modules)
4. [Flows, step by step](#4-flows-step-by-step)
5. [Documents and numbers](#5-documents-and-numbers)
6. [Statuses](#6-statuses)
7. [Automatic jobs and commands](#7-automatic-jobs-and-commands)
8. [Rules that protect the data](#8-rules-that-protect-the-data)
9. [Setup on Windows (step by step)](#9-setup-on-windows-step-by-step)
10. [Project layout](#10-project-layout)
11. [Tests and CI](#11-tests-and-ci)
12. [Deployment](#12-deployment)
13. [More documents](#13-more-documents)
14. [Known limits](#14-known-limits)

## 1. How the system works

```
Browser: React app (built by Vite into public/build)
   │  same-origin requests, session cookie + CSRF token
   ▼
Laravel 12
   routes/web.php ─ /api ─ app/Modules/<Module>/routes.php
                            ├─ controllers: validate input, check the role, answer JSON
                            ├─ StockLedger: the only code that changes stock quantities
                            └─ Notify: in-app notifications, emails through the queue
   ▼
MariaDB / MySQL (database spmu_ims)
```

- **One app, one address.** Laravel serves both the React screens and the JSON API. Login uses a normal session cookie, so there are no tokens to manage.
- **Modules.** Each feature lives in its own folder under `app/Modules/`: Accounts, Stocks, Suppliers, Requests, Turnovers, Inspections, Procurement, History, Notifications and Dashboard.
- **Stock ledger.** Every quantity change goes through `StockLedger::move()`: stock in, issue, turnover and adjustment. It locks the item row, refuses a negative balance, and writes a `stock_movements` row. That row is the stock card auditors ask for.
- **Notifications.** Each important event creates an in-app notification (the bell) and, where useful, an email. Emails wait in a queue, so a slow mail server never blocks anyone.
- **Printable slips.** Each official document (RIS, PRS, IIRUP, PR, IAR, ICS, PAR and others) has a print view laid out like the paper form, with signature lines.

More detail: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 2. Roles

| Role | Who | Can |
|---|---|---|
| `user` (personnel) | Faculty and staff of any office | Browse stock, request items, see the property in their care, request a pre-inspection, turn over property, send availability inquiries, prepare and correct purchase requests, see their own history |
| `admin` (Supply Office) | Supply Office staff | Everything personnel can do, plus: approve accounts, manage stock and suppliers, decide and issue requests, inspect equipment, receive turnovers, keep the unserviceable register, IIRUP and disposal, answer inquiries, record the office steps of a PR, deliveries and IARs, stock in and issue, see everything |
| `validator` (BAC) | Bids and Awards Committee members | Everything personnel can do, plus: see every purchase request, validate or return it, record the bid award |

- New sign-ups start as **pending** until an admin approves them.
- Admins give the admin or validator role in **Accounts**.
- The Supply Office acts as the inspectorate team. Offices without accounts (TWG, Procurement, Budget, Accounting, OP, OPIA, the disposal committee) have their steps recorded by the Supply Office.

## 3. Modules

| Module | Menu | What it does |
|---|---|---|
| Accounts | Accounts | Sign up (with privacy notice), approval, login, password reset, profile, disable/enable, change role, audit log |
| Stocks | Stocks | Items (consumable or property) with photo; stock in, adjustments, stock card, low-stock and out-of-stock status |
| Suppliers | Suppliers | Supplier details, items per supplier, emailed stock requests (SR), mark delivered (stock in) |
| Request item | Requests | Multi-item requests (RIS): approve fully or partly, reject, cancel, issue at the counter, print |
| Turnover | Turnovers | Return a specific issued property item (PRS); receive or not accept; property clearance certificate |
| Inspections | Inspections | Pre-inspection of equipment in a person's care: schedule, condition found, printable report (PIR) |
| Unserviceable property | Unserviceable | Register of received unserviceable items with ARE no.; consolidated IIRUP; disposal schedule and record |
| Availability inquiries | Availability | Supplies availability inquiry (SAI): each item is tagged available or not available |
| Purchase requests | Purchase requests | PR from not-available items or parts; 8 office steps incl. BAC; delivery; IAR; stock in and issue with RIS, ICS and PAR |
| History and reports | History | One timeline of requests and turnovers; monthly stock report (CSV) |
| Notifications | Bell icon | In-app notices with links to the record |
| Dashboard | Dashboard | Admin counts of what is waiting and how long the oldest item has waited |

Every endpoint and who may call it: [docs/MODULES.md](docs/MODULES.md).

## 4. Flows, step by step

### 4.1 Accounts

1. A person clicks **Sign up**, fills in name, email, office and password, and accepts the privacy notice (RA 10173). The account is **pending**.
2. An admin opens **Accounts → Pending** and clicks **Approve** or **Reject**. The person gets an email.
3. The person logs in. Logins are limited to 5 attempts per minute per email and IP.
4. **Forgot password** sends a reset link by email.
5. Admins can **Disable** an account (it is logged out at once), **Enable** it again, or change its role. Two limits:
   - Someone who still holds property cannot be disabled.
   - Nobody can change their own account, and the last active admin cannot be removed.

### 4.2 Stocks

1. **Stocks → Add item**: stock no., name, unit, category, type (consumable or property), reorder level, supplier and photo. Optionally an initial quantity.
2. **Stock in** adds quantity, for example from a delivery. **Adjust** corrects the count (a reason is required, and the balance can never go below zero).
3. Each item's **stock card** lists every movement with its balance after.
4. Items at or below their reorder level show **Low stock**; at zero, **Out of stock**. Admins get a low-stock email at 7:00 AM.

### 4.3 Suppliers and supplier stock requests

1. **Suppliers → Add supplier**: name, contact person, email, phone, address. Link items to their supplier on the item form.
2. **Request stock**: pick quantities of the supplier's items and click **Email request**. The supplier gets an email numbered `SR-YYYY-NNNN`.
3. When it arrives, **Mark delivered**. Adjust any quantities that came short; they are added to stock.

### 4.4 Request item (RIS)

1. Personnel open **Requests → New request**, add items from stock with quantities and a purpose, and submit. The request is **pending** and admins are notified.
2. The admin opens it and clicks **Approve** with a quantity per line (0 leaves a line out), or **Reject** with a reason. Personnel can **Cancel** while it is pending.
3. When the requester comes to the counter, the admin clicks **Issue items** and enters who received them. Stock is deducted now, not at approval. If any line is short, nothing is deducted.
4. **Print** the RIS for signatures. Property items now show in the person's **Property in your care**.

### 4.5 Property turnover (PRS) and clearance

1. Personnel open **Turnovers**. "Property in your care" lists issued property.
2. **Turn over** an item: quantity, reason (no longer needed, transfer, retirement, damaged, other) and condition. **Unserviceable** needs a pre-inspection first (4.6).
3. The turnover shows **For receiving** until the Supply Office acts. When the item is at the counter, the admin clicks **Receive**:
   - **Accept**: the condition found is recorded and the person is cleared of the item. Serviceable items go back into stock; unserviceable items go to the unserviceable register.
   - **Not accept**: a reason is given, and the item stays under the person's name.
4. **Print** the PRS (Property Return Slip) for signatures.
5. **My clearance** (or **Accounts** for admins) prints a Certificate of Property Clearance when nothing is left under the person's name. Otherwise it prints the list of property still held.

### 4.6 Unserviceable equipment (from pre-inspection to disposal)

This follows the office's "Turning over unserviceable equipment" process.

| # | Who | Step | In the system |
|---|---|---|---|
| 1 | End user | Report the equipment's condition | **Request inspection** next to the item; describe the problem. Creates `PIR-YYYY-NNNN` |
| 2 | Supply (inspectorate) | Schedule the inspection | **Set date**; the person is notified |
| 3 | Supply (inspectorate) | Determine the condition | **Record report**: unserviceable, for replacement, requires repair, or recoverable, with findings. **Print report** |
| 4a | End user | For replacement, repair or recoverable | **Prepare purchase request** for parts from the report (4.7) |
| 4b | End user | Unserviceable: return it | **Turn over item** on the report; the form is filled in from the report |
| 5 | Supply | Receive it and house it in the unserviceable stockroom | **Receive** the turnover. It enters **Unserviceable → Register**. The PRS is the supply return slip |
| 6 | Supply | Index it to the ARE | Enter the **ARE no.** on the turnover |
| 7 | OPIA (recorded by Supply) | Consolidate into an IIRUP and submit it to the disposal committee | **Unserviceable → Register**: tick items, **Create IIRUP** (`IIRUP-YYYY-NNNN`), **Print IIRUP** |
| 8 | Disposal committee (recorded by Supply) | Schedule and carry out the disposal | On the IIRUP: **Schedule disposal**, then **Record disposal** (mode: sale, transfer, destruction, donation or other) |

The inspection and turnover pages show a progress bar of these steps.

### 4.7 Procurement (from availability inquiry to issue)

This follows the office's "Procurement of goods and services" process.

1. **Availability inquiry (SAI).** Personnel open **Availability → New inquiry** and list what they need: free-text description, unit and quantity. The admin clicks **Answer** and tags every item **Available** or **Not available**. Available items are requested from Stocks as usual (4.4).
2. **Purchase request (PR).** On the answered SAI, the person clicks **Create purchase request**. The form holds the not-available items; the person adds specifications and an estimated unit cost.
   - A PR can also start from a pre-inspection report for parts (4.6, step 4a).
   - Each SAI item can be in one PR only. The PR is numbered `PR-YYYY-NNNN` and is printable.
3. **Office steps.** These are recorded in order, each with a date. Only the next step can be recorded, and only by its owner:

   | # | Step | Office | Recorded by |
   |---|---|---|---|
   | 1 | TWG verified | TWG | Supply Office; may **Return for corrections** |
   | 2 | PR series no. assigned | Procurement | Supply Office |
   | 3 | BAC validated | BAC | Validator; may **Return for corrections** |
   | 4 | Bid awarded (supplier, amount) | BAC | Validator |
   | 5 | BURS certified | Budget | Supply Office |
   | 6 | Funds certified | Accounting | Supply Office |
   | 7 | Contract approved | Office of the President | Supply Office |
   | 8 | PO signed by supplier (PO no.) | Procurement | Supply Office |

   A returned PR goes back to the person with the remarks. They click **Correct and resubmit** (specifications, quantities, costs), and the steps start over from step 1.
4. **Delivery.** When the whole order arrives, the admin clicks **Record delivery** (DR or invoice no., date).
5. **Inspection and acceptance (IAR).** **Record inspection (IAR)** with the accepted quantity per item; a reason is required for anything not accepted. This creates `IAR-YYYY-NNNN`, which can be printed.
6. **Stock in and issue.** For each accepted item, the admin picks an existing stock item or creates a new one, then enters who received the items. The items enter stock through the ledger and leave at once on a new RIS for the person.
   - Property also gets an **ICS** (unit cost below ₱50,000) or a **PAR** (₱50,000 and up). The threshold is set by `SPMU_PAR_THRESHOLD`.
   - Print the RIS, ICS and PAR for signatures.
7. Payment (voucher, ADA, check by Accounting and the Cashier) stays on paper.

### 4.8 History, reports, notifications, dashboard

- **History**: one timeline of requests and turnovers. Personnel see their own; admins see everyone's.
- **History → Monthly stock report**: a CSV per item with opening balance, stock in, issued, turned over, adjustments and closing balance, computed from the stock movements.
- **Notifications** (bell): every decision, return and reminder, with a link to the record.
- **Dashboard** (admins): counts of pending requests, items to issue, turnovers to receive and pending sign-ups, with the age of the oldest of each.
- **Audit log**: account approvals, role changes and supplier changes are recorded with who did them.

## 5. Documents and numbers

Numbers restart every year (`RIS-2026-0001`, …, `RIS-2027-0001`). A locked counter table makes sure two people never get the same number. The clearance certificate is the exception: its number is the person's id and the date.

| Prefix | Document | Made when | Printed from |
|---|---|---|---|
| `RIS` | Requisition and Issue Slip | A request is submitted (or a PR is issued) | Request page |
| `PRS` | Property Return Slip (supply return slip) | A turnover is submitted | Turnover page |
| `CLR` | Certificate of Property Clearance | On demand | Turnovers → My clearance, or Accounts |
| `PIR` | Pre-inspection request and report | A pre-inspection is requested | Inspection page, after the report |
| `IIRUP` | Inventory and Inspection Report of Unserviceable Property | Register items are consolidated | IIRUP page |
| `SR` | Supplier stock request (email) | A stock request is emailed to a supplier | Email to the supplier |
| `SAI` | Supplies Availability Inquiry | An inquiry is sent | Inquiry page, after the answer |
| `PR` | Purchase Request | A PR is submitted | PR page |
| `IAR` | Inspection and Acceptance Report | The IAR is recorded | PR page |
| `ICS` | Inventory Custodian Slip | Property below the threshold is issued from a PR | PR page |
| `PAR` | Property Acknowledgement Receipt | Property at or above the threshold is issued from a PR | PR page |

The IIRUP's date acquired and cost columns, the ICS's estimated useful life, and some signature names are left blank to fill in by hand.

## 6. Statuses

| Record | Statuses, in order |
|---|---|
| Account | pending → approved (or rejected); approved ↔ disabled |
| Request (RIS) | pending → approved → issued; or rejected, or cancelled |
| Turnover (PRS) | For receiving → Received · cleared, or Not accepted |
| Pre-inspection (PIR) | requested → scheduled → inspected; or cancelled |
| IIRUP | submitted to committee → disposal scheduled → disposed |
| Availability inquiry (SAI) | waiting for answer → answered |
| Purchase request (PR) | in process (8 steps) → PO signed → delivered → inspected (IAR) → issued; returned for corrections at step 1 or 3 |

## 7. Automatic jobs and commands

The scheduler (`php artisan schedule:work`, or a scheduled task on the server) runs:

| Command | When | What |
|---|---|---|
| `spmu:low-stock` | Daily 7:00 AM | Emails admins the items at or below their reorder level; skipped when there are none |
| `spmu:waiting` | Daily 7:00 AM | Reminds admins of pending requests, approved requests not yet issued, and turnovers waiting to be received for more than 3 days |

Other commands:

| Command | What |
|---|---|
| `php artisan spmu:admin <email> "<name>"` | Creates an admin account on a server (asks for the password) |
| `php artisan spmu:check` | Go-live check: production mode, debug off, key, real URL, Manila time zone, database, migrations, built screens, storage link, real mail, database queue and sessions, an approved admin, no demo accounts |
| `php artisan queue:work` | Sends queued emails; must keep running |

Logs rotate daily and are kept 30 days (`storage/logs/`).

## 8. Rules that protect the data

- Stock quantity is never typed in directly: only the ledger changes it, and it can never go negative.
- Stock leaves at issue, not at approval, and the stock is checked again at issue under a row lock.
- Only property that was issued to the same person can be turned over or inspected. A pending turnover still counts as held.
- Unserviceable equipment cannot be turned over by personnel without a pre-inspection report that found it unserviceable.
- An item already in an IIRUP cannot change its ARE no.; a disposed IIRUP cannot change.
- Purchase request steps are recorded strictly in order, each by its owner role. The Supply Office cannot record the BAC steps.
- Each SAI item can go into one PR only.
- Personnel see only their own requests, turnovers, inspections, inquiries and PRs.
- The password is checked before the account status, so a wrong password never reveals whether an email is registered.

Permission matrix and the Data Privacy Act checklist: [docs/SECURITY_AND_PRIVACY.md](docs/SECURITY_AND_PRIVACY.md).

## 9. Setup on Windows (step by step)

This sets up a copy for development or a demo on one PC. For the office server, follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### 1. Install the tools

| Tool | Version | Check with | Notes |
|---|---|---|---|
| PHP | 8.2 or newer | `php -v` | [Laravel Herd](https://herd.laravel.com/windows) is the easiest. XAMPP's PHP works only if it is 8.2+ |
| PHP extensions | `pdo_mysql`, `pdo_sqlite` (tests), `mbstring`, `openssl`, `fileinfo`, `zip` | `php -m` | Herd has them. In XAMPP, remove the `;` before each `extension=` line in `php.ini` |
| Composer | 2.x | `composer -V` | [getcomposer.org](https://getcomposer.org/download/) |
| Node.js | 20 or newer, with npm | `node -v` | [nodejs.org](https://nodejs.org/) LTS |
| MariaDB or MySQL | MariaDB 10.6+ or MySQL 8+ | phpMyAdmin opens | XAMPP's MariaDB is fine. Start **MySQL** in the XAMPP Control Panel |
| Git | any | `git --version` | |

If `php -v` shows an old version, another PHP is first on your `PATH` (often XAMPP's). Put the one you want first, or use Herd's terminal.

### 2. Get the code and install packages

```
git clone https://github.com/Sidmar456/SpmuWebSystem.git
cd SpmuWebSystem
composer install
npm install
copy .env.example .env
php artisan key:generate
```

`key:generate` writes `APP_KEY` into `.env`. Sessions and password reset links depend on it. Never copy another machine's key.

### 3. Configure `.env`

`.env.example` already works with XAMPP's defaults. Change only what differs on your PC:

| Setting | Default | What it is |
|---|---|---|
| `APP_URL` | `http://localhost` | Set to `http://127.0.0.1:8000` when you use `php artisan serve`. Password reset and notification links use it |
| `DB_CONNECTION` | `mariadb` | Use `mysql` if you run MySQL instead of MariaDB |
| `DB_HOST`, `DB_PORT` | `127.0.0.1`, `3306` | Where the database server listens |
| `DB_DATABASE` | `spmu_ims` | The database you create in step 4 |
| `DB_USERNAME`, `DB_PASSWORD` | `root`, empty | XAMPP's default login. Use your own if you set a root password |
| `MAIL_MAILER` | `log` | Emails are written to `storage/logs/` instead of being sent. Use `smtp` and the `MAIL_*` lines to really send (see [DEPLOYMENT.md](docs/DEPLOYMENT.md)) |
| `QUEUE_CONNECTION` | `database` | Emails wait in the `jobs` table until a queue worker sends them (step 6) |
| `SESSION_DRIVER`, `CACHE_STORE` | `database` | Sessions and cache are kept in the database; nothing extra to install |
| `SPMU_PAR_THRESHOLD` | `50000` | Unit cost (₱) from which property is issued on a PAR instead of an ICS |

After changing `.env` while the app is running, restart `php artisan serve`. If you ever ran `php artisan config:cache`, run `php artisan config:clear`.

### 4. Create the database and tables

In phpMyAdmin (http://localhost/phpmyadmin), create a database named `spmu_ims` with collation `utf8mb4_unicode_ci`. Then:

```
php artisan migrate --seed
php artisan storage:link
```

- `migrate` creates every table: accounts, stocks, requests, turnovers, inspections, IIRUP, inquiries, purchase requests and their steps, notifications, sessions, jobs.
- `--seed` adds demo data: `admin@example.com` (admin) and `user@example.com` (personnel), both with the password `password`, plus one supplier and five items. Use the seeder only on your own PC, never on the office server.
- `storage:link` makes uploaded item photos viewable. Without it, photos upload but show as broken images.

### 5. Build the screens

```
npm run build
```

This writes the React app to `public/build/`. Run it again after pulling new code. While you change the screens yourself, use `npm run dev` instead (step 6), which reloads the browser on every save.

### 6. Run it

Open separate terminals in the project folder:

```
php artisan serve            # the app, at http://127.0.0.1:8000
php artisan queue:work       # sends queued emails (account approval, password reset, supplier requests)
npm run dev                  # optional: only while editing the screens
php artisan schedule:work    # optional: 7:00 AM low-stock and waiting reminders
```

`composer dev` starts the server, queue and Vite together, but it also starts `php artisan pail`. Pail needs the `pcntl` extension, which Windows does not have. On Windows, use the separate terminals above.

### 7. First login and test accounts

Open http://127.0.0.1:8000 and log in as `admin@example.com` / `password`.

| To try | Do this |
|---|---|
| Personnel screens | Log in as `user@example.com` / `password` |
| A new sign-up | **Sign up** with any email, then approve it in **Accounts** as admin |
| BAC steps on purchase requests | Approve a new sign-up, then **Make validator** in **Accounts** |
| Emails | With `MAIL_MAILER=log`, open the newest file in `storage/logs/` and look for the message |

On a real server there is no seeder. Create the first admin with `php artisan spmu:admin <email> "<name>"`; it asks for the password.

### 8. Run the checks

```
php artisan test             # all feature tests; uses an in-memory database, not spmu_ims
vendor/bin/pint --test       # code style
npm run build                # the screens compile
```

GitHub Actions runs the same three on every push and pull request (`.github/workflows/`).

### Updating a copy you already set up

```
git pull
composer install
npm install
php artisan migrate
npm run build
```

Use `php artisan migrate`, never `migrate:fresh`: `migrate:fresh` drops every table and deletes your data.

### Troubleshooting

| You see | Fix |
|---|---|
| `could not find driver` | Enable `extension=pdo_mysql` in `php.ini` (find it with `php --ini`), then restart the terminal |
| `SQLSTATE[HY000] [2002]` connection refused | Start MySQL in the XAMPP Control Panel; check `DB_HOST` and `DB_PORT` |
| `SQLSTATE[HY000] [1045]` access denied | `DB_USERNAME` or `DB_PASSWORD` in `.env` is wrong |
| `SQLSTATE[HY000] [1049]` unknown database | Create `spmu_ims` in phpMyAdmin (step 4) |
| `Vite manifest not found` | Run `npm run build`, or keep `npm run dev` running |
| `No application encryption key has been specified` | Run `php artisan key:generate` |
| Item photos show as broken images | Run `php artisan storage:link` |
| "Page expired" (419) after logging in | Open the app at the same address as `APP_URL`, and clear the browser cookies for it |
| Emails never arrive | Keep `php artisan queue:work` running. With `MAIL_MAILER=log` they only go to the log file |
| Old screens after pulling new code | Run `npm run build` again and hard-refresh the browser (Ctrl+F5) |
| A table or column is missing | Run `php artisan migrate` |

## 10. Project layout

```
app/Modules/           one folder per module: models, enums, controllers, routes.php
  Accounts/            sign up, login, approval, roles
  Stocks/              items, StockLedger, stock movements
  Suppliers/           suppliers, supplier stock requests (SR)
  Requests/            item requests (RIS)
  Turnovers/           turnovers (PRS), clearance, ARE register, IIRUP
  Inspections/         pre-inspections (PIR)
  Procurement/         availability inquiries (SAI), purchase requests, office steps, IAR, ICS/PAR
  History/             timeline, monthly stock report
  Notifications/       Notify helper, in-app and email notices
  Dashboard/           admin counts
app/Support/Sequence   per-year document numbers
config/spmu.php        SPMU settings (PAR threshold)
database/              migrations, factories, demo seeder
routes/web.php         loads every module's routes under /api; every other path is a React screen
routes/console.php     spmu:* commands and the daily schedule
resources/js/          React app
  components/          Layout (menu) and ui.jsx (buttons, forms, badges, progress steps)
  pages/<module>/      the screens of each module
  pages/print/         every printable slip
tests/Feature/         one test file per module
docs/                  planning, design and capstone documents
legacy/                old React + plain PHP app, reference only, not deployed
```

## 11. Tests and CI

- `php artisan test` runs the feature tests on an in-memory SQLite database, so your `spmu_ims` data is never touched. They cover every flow above, including the role checks.
- `vendor/bin/pint --test` checks the PHP code style.
- `npm run build` checks that the screens compile.
- GitHub Actions (`.github/workflows/ci.yml`) runs all three on every push and pull request.

## 12. Deployment

The office server setup is in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). It covers the web server, `.env` for production with SMTP mail, the queue worker and scheduler as Windows services or scheduled tasks, daily backups and a restore test, the go-live checklist (`php artisan spmu:check`) and rollback.

Opening balances and the one-week acceptance test are in [docs/UAT.md](docs/UAT.md). User training is in [docs/USER_GUIDE.md](docs/USER_GUIDE.md).

## 13. More documents

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

## 14. Known limits

- ICS or PAR is chosen by the **estimated** unit cost on the PR, not the awarded price.
- Stock items have no unit cost, so property issued through an ordinary request (not a PR) gets an RIS only.
- Recorded PR steps, deliveries and IARs cannot be edited. Only steps 1 and 3 can send a PR back.
- Replacement deliveries for items not accepted at the IAR stay on paper, and so does payment.
- Pending availability inquiries and pre-inspections are not on the dashboard or in the 7:00 AM reminder; admins get the bell notification.
- Selecting items for an IIRUP works one page (25 items) at a time.
