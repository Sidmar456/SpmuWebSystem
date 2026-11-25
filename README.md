# SPMU IMS

Inventory Monitoring System for the Supply Office (Supply and Property Management Unit) of Zamboanga Peninsula Polytechnic State University (ZPPSU).

Personnel request items online. The Supply Office monitors stock, keeps supplier information, approves and issues requests, and receives property turned over by personnel. Every request and turnover is kept in a history. Built with Laravel 12, React 19 and MariaDB/MySQL.

> Status: every module and screen is built and tested (36 automated tests): accounts, stocks, suppliers and stock requests, request item (RIS), property turnover (PRS), history and reports, notifications and the dashboard. What is left is on site: deployment, backups, the one-week user acceptance test and training (S8.1–S8.4). The old PHP app is kept in `legacy/` for reference. See [docs/BACKLOG.md](docs/BACKLOG.md) for story status, and start with [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md).

## Modules

| Module | What it does |
|---|---|
| Request item | Personnel request items, and the Supply Office approves (fully or partly), rejects and issues them |
| Stocks | Items, balances, low-stock status, stock in, adjustments, stock card |
| Supplier information | Supplier details and the items each one supplies |
| Request history | One timeline of every request and turnover, per person or office-wide |
| Turnover | Personnel turn over a specific issued property item; serviceable items return to stock |
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

The seeder makes demo data: `admin@example.com` (admin) and `user@example.com` (personnel), both with the password `password`, plus one supplier and five items. Use it only locally.

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
| `admin` | Supply Office staff | Everything: approve accounts, manage stock and suppliers, decide and issue requests, receive turnovers, see all history |
| `user` | Requesting personnel | Browse stock, request items, turn over their own property, see their own history |

On a server, create the first admin with `php artisan spmu:admin <email> "<name>"`.

## Project layout

```
app/Modules/      one folder per module: models, enums, controllers, routes.php
database/         migrations, factories, demo seeder
routes/web.php    loads every module's routes under /api
tests/Feature/    one test file per module
resources/js/     React app (M7)
docs/             planning and capstone documents
legacy/           old React + plain PHP app, reference only, not deployed
```
