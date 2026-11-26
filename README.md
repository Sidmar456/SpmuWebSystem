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
