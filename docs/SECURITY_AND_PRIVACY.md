# Security and Privacy

## Permission matrix

Enforced on the server: `auth` and `can:admin` on routes, and ownership checks in controllers. The UI only hides buttons.

| Action | Guest | User | Admin |
|---|---|---|---|
| Sign up, log in | yes | — | — |
| View and edit own profile | — | yes | yes |
| List, approve, reject accounts | — | — | yes |
| View items and stock levels | — | yes | yes |
| Add or edit items, stock in, adjust | — | — | yes |
| View stock movements | — | — | yes |
| Suppliers (all actions) | — | — | yes |
| Submit a request, cancel own pending request | — | yes | yes |
| View requests | — | own | all |
| Approve, reject, issue requests | — | — | yes |
| View own property holdings, submit a turnover | — | yes | yes |
| View turnovers | — | own | all |
| Receive or reject turnovers | — | — | yes |
| History | — | own | all |
| Dashboard | — | — | yes |
| Notifications | — | own | own |

Covered by tests: `tests/Feature/*Test.php` check 401 for guests, 403 for users on admin actions, and that one user cannot read another user's requests, turnovers or history.

## Security checklist

| Item | Status |
|---|---|
| Passwords hashed (bcrypt via the `hashed` cast) | Done |
| Minimum password length 8 | Done |
| Login checks the password before revealing account status | Done |
| Session ID regenerated on login; session invalidated on logout | Done |
| Login limited to 5 per minute per email and IP | Done |
| CSRF protection on every state-changing request (`web` middleware) | Done |
| Server-side role and ownership checks | Done |
| All queries through Eloquent or the query builder (parameterized) | Done |
| Stock changes in locked transactions | Done |
| Image uploads: `image` rule, jpg/png/webp only, 5 MB max, random file names | Done |
| API errors are JSON without stack traces when `APP_DEBUG=false` | Done |
| Secrets in `.env`, not in git | Done for the new app. The old SMTP password in `legacy/` history must be rotated |
| Only `public/` is served by Apache | See [DEPLOYMENT.md](DEPLOYMENT.md) |
| HTTPS | Depends on the campus ICT office |
| Audit log for account and supplier changes | S6.4 |

## Data Privacy Act (RA 10173) checklist

Personal data held: name, email, office, and request, issue and turnover history.

| Item | Status |
|---|---|
| Collect only what the process needs | Done (no ID numbers, phone numbers or addresses of personnel) |
| Privacy notice and consent at sign up | S1.5 |
| Personnel can see only their own records | Done |
| Data stays on a campus server | Planned ([DEPLOYMENT.md](DEPLOYMENT.md)) |
| Retention period for request and turnover records | Ask the Supply Office and university records officer. Supply records are usually kept for audit |
| Breach response: who is told, within 72 hours | Ask the university Data Protection Officer |
