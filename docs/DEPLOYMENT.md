# Deployment

Target: one Windows server on the ZPPSU campus network running XAMPP (Apache, PHP 8.2+, MariaDB), reachable by staff browsers on the LAN. Laravel serves both the API and the React app, so there is one origin and no CORS setup.

```
Browser ──► http://<server>/            React app (public/build)
        └─► http://<server>/api/*       Laravel API (same origin, session cookie)
                    │
                    ├── MariaDB  spmu_ims
                    └── Task Scheduler ──► php artisan schedule:run   (every minute)
                                       └─► php artisan queue:work --stop-when-empty (every minute)
```

## 1. Before the first deployment

1. **Rotate the old Gmail SMTP password.** It was committed in `legacy/smplDB/secure/spmu_mail_config.php` (commit `78b4ca8`) and is still in git history.
2. Do not copy `legacy/` to the server. It is reference code only.
3. Ask the ICT office for a fixed LAN IP and, if possible, a hostname such as `spmu.zppsu.local`.

## 2. Server requirements

- XAMPP with PHP 8.2 or newer. Check with `C:\xampp\php\php.exe -v`.
- PHP extensions: `pdo_mysql`, `mbstring`, `openssl`, `fileinfo`, `intl` (enable `intl` in `php.ini` if it is off).
- Composer 2.
- Node.js 20+ on the build machine (your laptop is fine).

## 3. Database

In the MariaDB console (`C:\xampp\mysql\bin\mysql.exe -u root -p`):

```sql
CREATE DATABASE spmu_ims CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'spmu_app'@'localhost' IDENTIFIED BY '<strong-password>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP, REFERENCES ON spmu_ims.* TO 'spmu_app'@'localhost';
FLUSH PRIVILEGES;
```

Also set a password for MariaDB `root`. XAMPP leaves it empty.

## 4. Get the code onto the server

```
cd C:\xampp\htdocs
git clone https://github.com/Sidmar456/SpmuWebSystem.git spmu
cd spmu
composer install --no-dev --optimize-autoloader
copy .env.example .env
php artisan key:generate
```

Edit `C:\xampp\htdocs\spmu\.env`:

```
APP_NAME="SPMU IMS"
APP_ENV=production
APP_DEBUG=false
LOG_STACK=daily        # one file per day, kept 30 days (LOG_DAILY_DAYS)
LOG_LEVEL=warning
APP_URL=http://<server-ip-or-hostname>

DB_CONNECTION=mariadb
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=spmu_ims
DB_USERNAME=spmu_app
DB_PASSWORD=<strong-password>

SESSION_DRIVER=database
SESSION_SECURE_COOKIE=false   # true once the site runs on HTTPS
QUEUE_CONNECTION=database

MAIL_MAILER=smtp
MAIL_HOST=<smtp host>
MAIL_PORT=587
MAIL_USERNAME=<account>
MAIL_PASSWORD=<app password>
MAIL_FROM_ADDRESS=<supply office address>
MAIL_FROM_NAME="ZPPSU Supply Office"

SPMU_PAR_THRESHOLD=50000      # unit cost (PHP) from which property is issued on a PAR instead of an ICS
```

Never commit `.env`. It is already in `.gitignore`.

Then:

```
php artisan migrate --force
php artisan storage:link
php artisan spmu:admin <admin-email> "<Admin Name>"
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Do **not** run `php artisan db:seed` on the server. The seeder makes demo accounts with known passwords.

After the first admin logs in: each BAC member signs up, the admin approves them in **Accounts**, then clicks **Make validator**. Without at least one validator, purchase requests stop at step 3 (BAC validated).

## 5. Build the React app

On the build machine:

```
npm ci
npm run build
```

Copy the resulting `public/build/` folder to `C:\xampp\htdocs\spmu\public\build\` on the server. You can also run the same two commands on the server if Node is installed there.

## 6. Apache

Point Apache at Laravel's `public` folder so nothing else (`.env`, `storage`, `vendor`) can be reached from a browser. In `C:\xampp\apache\conf\extra\httpd-vhosts.conf`:

```
<VirtualHost *:80>
    ServerName spmu.zppsu.local
    DocumentRoot "C:/xampp/htdocs/spmu/public"
    <Directory "C:/xampp/htdocs/spmu/public">
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

Make sure `mod_rewrite` is enabled in `httpd.conf`. Restart Apache.

In `C:\xampp\php\php.ini`:

```
display_errors = Off
log_errors = On
upload_max_filesize = 10M
post_max_size = 12M
date.timezone = Asia/Manila
```

## 7. Scheduler and queue worker

Emails are sent from the queue. Without a worker, they wait in the `jobs` table, but in-app notifications still show.

Create two Windows Task Scheduler tasks. For each one, set it to run **whether the user is logged on or not**, repeat **every 1 minute** indefinitely, and start in `C:\xampp\htdocs\spmu`:

| Task | Program | Arguments |
|---|---|---|
| SPMU scheduler | `C:\xampp\php\php.exe` | `artisan schedule:run` |
| SPMU queue | `C:\xampp\php\php.exe` | `artisan queue:work --stop-when-empty --tries=3` |

At 7:00 AM the scheduler runs `spmu:low-stock` (items at or below reorder level) and `spmu:waiting` (requests, turnovers, pre-inspections, availability inquiries and purchase requests waiting on the Supply Office for more than 3 days). Each sends admins one notification, and nothing when there is nothing to report. The queue sends every email: notifications, supplier stock requests. Password reset emails are sent at once, without the queue, so `MAIL_*` in `.env` must work.

## 8. Network

- Allow inbound TCP 80 (and 443 for HTTPS) in Windows Firewall for the private profile only.
- Do not expose the server to the internet unless the ICT office puts HTTPS and a firewall in front of it.
- With HTTPS, set `APP_URL=https://...` and `SESSION_SECURE_COOKIE=true`, then run `php artisan config:cache`.

## 9. Backups

Scripts: `scripts/backup.bat` (daily) and `scripts/restore-test.bat` (before go-live, then once a month).

1. Create a backup login in MariaDB:
   ```sql
   CREATE USER 'spmu_backup'@'localhost' IDENTIFIED BY '<backup-password>';
   GRANT SELECT, LOCK TABLES, SHOW VIEW, TRIGGER ON spmu_ims.* TO 'spmu_backup'@'localhost';
   ```
2. Put the login in an option file, so the password never appears on a command line. Create `C:\spmu-backup\backup.cnf` and allow only Administrators to read the folder:
   ```
   [client]
   user=spmu_backup
   password=<backup-password>
   ```
   Make `C:\spmu-backup\restore.cnf` the same way with a login that can create and drop databases (for example `root`). Only the restore test uses it.
3. Task Scheduler, daily at 6:00 PM: program `C:\xampp\htdocs\spmu\scripts\backup.bat`. Each run makes `D:\backups\spmu\YYYY-MM-DD\` with `spmu_ims.sql`, `photos\` and `env.txt`, and deletes folders older than 7 days. Change `DEST` at the top of the script if the backup drive is not `D:`. Copy the folder to a second place (external drive or the ICT file server) every week.
4. Restore test:
   ```
   scripts\restore-test.bat D:\backups\spmu\2026-12-01\spmu_ims.sql
   ```
   It loads the dump into `spmu_restore_test`, prints row counts next to the live database, and checks that every item's quantity equals the sum of its stock movements. It ends with **PASS** and drops the scratch database. On **FAIL** it keeps the scratch database for inspection.

`env.txt` holds `APP_KEY` and the mail and database passwords. Keep the backup drive locked away like the server.

**Full restore** (server lost): set up the server with sections 2 to 7, run `mysql -u root -p spmu_ims < spmu_ims.sql`, copy `photos\` to `storage\app\public\`, and restore `.env` from `env.txt`.

## 10. Go-live checklist

First run `php artisan spmu:check` on the server. It checks what can be read from the server itself: production mode, debug off, real mail, built frontend, storage link, migrations, an approved admin, no demo accounts, no failed jobs. Fix every FAIL, then do the browser checks below.

| Check | How |
|---|---|
| Debug is off | Open `/api/items/999999` while logged in: a short JSON 404, no stack trace |
| `.env` is not reachable | Open `http://<server>/.env`: 404 |
| Guests are refused | Open `/api/items` in a private window: JSON 401 |
| Personnel cannot do admin actions | Log in as a user, call `POST /api/items`: 403 |
| Admin can log in | Dashboard loads |
| Request flow | Submit, approve, issue: stock goes down, and a movement appears on the stock card |
| Turnover flow | Turn over a property item, receive it: stock goes up |
| Inspection flow | Request a pre-inspection, schedule and report it as unserviceable, turn the item over from the report, receive it: it appears in **Unserviceable → Register** |
| Purchase request flow | Send an inquiry, tag an item not available, create a PR, record the 8 steps (log in as a validator for steps 3 and 4), delivery, IAR, **Stock in and issue**: an RIS and an ICS or PAR print |
| Validator | At least one BAC member has the validator role |
| Email | Approve a test account: the email arrives within 2 minutes |
| Backups | `scripts\restore-test.bat` on last night's dump ends with PASS |
| Privacy notice | The office or university privacy officer approved the wording on the sign-up screen |

## 11. Updating

```
cd C:\xampp\htdocs\spmu
php artisan down
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan up
```

Copy the new `public/build/` if the frontend changed. Back up the database first. Read the pull request's deploy notes: they list new migrations and `.env` settings.

**Rollback:** `php artisan down`, then `git checkout <previous tag>`, restore the database dump, run `composer install --no-dev`, and `php artisan up`.
