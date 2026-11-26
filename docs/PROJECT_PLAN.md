# Project Plan

ZPPSU Supply and Property Management Unit Inventory Monitoring System (working name: SPMU IMS).

## 1. Goal

Replace paper request slips, logbooks and spreadsheet counts at the ZPPSU Supply Office with one web app. Personnel request items online. The Supply Office monitors stock, keeps supplier information, issues requests, and receives property that personnel turn over. Every request and turnover stays in a history the office can show to management and auditors.

Success looks like this:

- A Supply Officer can see the current balance of any item in under 10 seconds, without opening a logbook.
- Personnel can submit a request without visiting the office, and only come in to claim approved items.
- Every issued item has an RIS number, a record of who issued it and who received it, and a line on the item's stock card.
- Every turned-over property item has a PRS number and goes back to stock if it is serviceable.
- Only approved ZPPSU personnel can use the system, and only Supply Office staff can change stock.

## 2. Scope

| Module | What we build |
|---|---|
| Request item | Personnel browse stock and submit multi-item requests (RIS). The Supply Office approves in full or in part, rejects with a reason, and issues at the counter |
| Stocks | Items with stock number, unit, type (consumable or property), photo and reorder level. Stock in, adjustments, and a stock card for every change. Low-stock and out-of-stock status |
| Supplier information | Supplier contact details and the items each one supplies |
| Request history | One timeline of every request and turnover, per person or office-wide |
| Turnover | Personnel turn over a specific property item issued to them (PRS). Serviceable items return to stock; unserviceable ones are recorded |
| Supporting | Accounts with admin approval, in-app and email notifications, admin dashboard |

## 3. Out of scope

- Procurement (purchase requests, bidding, purchase orders). The system starts when items arrive at the Supply Office.
- Accounting values (unit cost, depreciation). Can be added as a column later.
- Barcode or QR scanning hardware.
- SMS. Email and in-app notifications only.
- Native mobile apps. The web app works in a phone browser.
- Integration with other university systems.
- Importing data from the old system. Go-live starts from a physical count.

## 4. Assumptions

Please correct any that are wrong:

- A1. Two roles: `admin` (Supply Office staff) and `user` (requesting personnel). One person has one role.
- A2. Request statuses: `pending`, `approved`, `rejected`, `cancelled`, `issued`. Stock leaves at issue, not at approval.
- A3. Turnover statuses: `pending`, `received`, `rejected`.
- A4. Only `property` items can be turned over. `consumable` items are used up when issued.
- A5. The system runs on one server inside the campus network, not on the public internet.
- A6. Timezone is `Asia/Manila`.
- A7. Turnover replaces the old system's borrowing with due dates. If the office still lends equipment for a few days, a due date can be added to property requests later.

## 5. Roadmap

| Milestone | Theme | Status |
|---|---|---|
| M0 | Laravel foundation | Done (CI not started) |
| M1 | Accounts | Mostly done |
| M2 | Stocks | Mostly done |
| M3 | Supplier information | Mostly done |
| M4 | Request item | Mostly done (print slip next) |
| M5 | Property turnover | Mostly done (print slip next) |
| M6 | Request history and reports | Partial |
| M7 | User interface (React screens) | In progress (S7.1, S7.2 done) |
| M8 | Launch | Not started |

Story-level status is in [BACKLOG.md](BACKLOG.md). The backend API for all modules is done and tested. M7 comes next, because nobody can use the system without screens.

## 6. Risks

| ID | Risk | Effect | Mitigation |
|---|---|---|---|
| R1 | The new backend has no screens yet | The system cannot be demoed or used | M7 next. Port screens from `legacy/src/pages` |
| R2 | The old Gmail SMTP password is in git history | The mail account can be taken over | Rotate it now. The new app reads mail settings from `.env` only |
| R3 | The server's XAMPP has PHP older than 8.2 | Laravel 12 will not run | Check `php -v` early. Update XAMPP or install PHP 8.2+ |
| R4 | Single server, no backups yet | Data loss on disk failure | Daily backup, S8.2 |
| R5 | Personal data of personnel | Breach of RA 10173 (Data Privacy Act) | Campus-only server, own-records-only access, privacy notice S1.5. See [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) |
| R6 | A personal Gmail account delays or blocks automated email | Notifications arrive late | Use a school mail account or a transactional SMTP service |
| R7 | Staff keep using paper in parallel | Balances drift from reality | Physical count as opening balances, training, S8.3 |
| R8 | Old data is not migrated | History before go-live exists only on paper or in the old database | Start fresh from a physical count. Keep the old database read-only for reference |

## 7. Team and roles

| Role | Person | Does |
|---|---|---|
| Project owner | Supply Office head | Approves scope and stories |
| Developers | Capstone team | Build, test, document |
| Adviser | Capstone adviser | Reviews the plan and the paper |
| Pilot users | Supply Office staff and 2 to 3 offices | User acceptance test |
