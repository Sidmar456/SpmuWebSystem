# User Acceptance Test (S8.3)

One week on the real server (after [DEPLOYMENT.md](DEPLOYMENT.md) passes), with real stock and real people. The Supply Office head signs at the end.

| | |
|---|---|
| Who | Supply Office staff (admin role), and 2 to 3 offices (personnel role), for example a college, the Registrar and the Library |
| When | Week 1: day 1 opening balances, days 2 to 5 normal work, day 5 sign-off |
| Where | The production server, not a laptop. Use real accounts, not the demo seed accounts |
| Printed | One copy of this file per tester, and the count sheet below |

## 1. Opening balances (day 1)

The system starts empty. Its stock must match what is on the shelves before anyone requests anything.

1. **Freeze.** No issues or deliveries on count day. Put a notice on the counter.
2. **Count.** Two people count each item together and write it on the count sheet. Property items are counted per unit; note the serial number in remarks.
3. **Enter.** For each item:
   - New item: **Stocks → Add item**, with the count in **Opening quantity**. The stock card shows it as stock in, "Initial stock".
   - Item already in the system: open it, **Stock in**, quantity = count, remarks "Opening balance".
4. **Check.** Print the item list (or download **History → Monthly stock report**) and compare it with the count sheet line by line. Fix differences with **Adjust** and a reason, never by editing the item.
5. **Suppliers.** Add each supplier with an email address, then set the supplier on its items.

Count sheet:

| Stock / property no. | Item | Unit | Type (consumable / property) | Count | Counted by (2 names) | Entered by | Entered OK (✓) |
|---|---|---|---|---|---|---|---|
| | | | | | | | |

## 2. Test scripts (days 2 to 5)

Mark **P** (pass) or **F** (fail) and write the issue number from section 3 on every F. "Expected" is what must happen.

### Personnel (each office tester)

| ID | Steps | Expected | P/F | Notes |
|---|---|---|---|---|
| U1 | Sign up with your ZPPSU email and office. Try once without ticking the privacy notice | Without the tick: "Please read and accept the privacy notice." With it: "waiting for approval". You cannot log in yet | | |
| U2 | After the Supply Office approves you, log in | You get an email, and you land on Stocks | | |
| U3 | **Requests → New request**: search an item, add 2 items, try a quantity above what is available, then fix it and submit | Over-quantity shows "Only N … available". After submit you see the RIS number, status Pending | | |
| U4 | Cancel a second test request while it is still pending | Status Cancelled. It cannot be cancelled again | | |
| U5 | Wait for approval, then claim at the counter | Bell shows a notification. Request shows Approved, then Issued after the counter | | |
| U6 | **Turnovers**: turn over a property item issued to you | It shows under "Property in your care". After submit, the PRS number, status Pending | | |
| U7 | **History** | One timeline with your RIS and PRS, newest first. You see only your own | | |
| U8 | Log out, **Forgot password?**, follow the email link, set a new password, log in | Email arrives within 2 minutes. The new password works, the old one does not | | |
| U9 | On a phone, do U3 again | Everything fits the screen; no sideways scrolling | | |

### Supply Office (admin)

| ID | Steps | Expected | P/F | Notes |
|---|---|---|---|---|
| A1 | **Accounts**: approve one sign-up, reject one test sign-up | Approved person can log in; rejected cannot. Both get an email | | |
| A2 | **Dashboard** in the morning | Counts match the lists they open. Low stock plus out of stock together are the items in the 7:00 AM notification | | |
| A3 | Open a pending request; approve less than requested on one line | Requester notified. Stock is **not** deducted yet | | |
| A4 | Reject a request with a reason | Requester sees the reason | | |
| A5 | Issue an approved request; enter who received it; **Print** the RIS and have it signed | Stock goes down by the approved amounts. The stock card shows the issue with the RIS number. Slip prints on one page with signature lines | | |
| A6 | Try to issue a request when an item ran out after approval | "Not enough stock for …". Nothing is deducted from any item | | |
| A7 | **Inspect** a turnover and accept it as serviceable; accept another with the condition changed to unserviceable; not accept a third with a reason; print a PRS | Serviceable: stock goes up. Unserviceable: stock unchanged. The person sees "Received · cleared", or "Not accepted" with the reason |
| A13 | Disable an account that still holds property, then one that holds none; enable it again; print a clearance | First is refused with the quantity held. Second is logged out at once. Clearance shows the certificate or the items still held | | |
| A8 | **Suppliers → Request stock**: email a request; when the delivery comes, **Mark delivered** with one item short | Supplier receives the email. Only the received quantities are added; the request shows "3 of 4" | | |
| A9 | **Stock in** a delivery and **Adjust** a damaged item (needs a reason); try an adjustment that would go below zero | Both show on the stock card with your name. Below zero is refused | | |
| A10 | **History → Monthly stock report** for the current month; open it in Excel | For 3 items, opening + in − issued + turned over ± adjustments = closing, and closing = on hand | | |
| A11 | Log in as personnel and open `/accounts` or `/dashboard` | Sent back to Stocks. Personnel never see admin screens | | |
| A12 | Ask the server admin to run `scripts\restore-test.bat` on last night's backup | Ends with PASS | | |

## 3. Issue log

| # | Date | Test ID | What happened (steps, screen, message) | Severity (blocker / major / minor) | Fixed in | Retested by |
|---|---|---|---|---|---|---|
| 1 | | | | | | |

Severity: **blocker** stops the office from working or gives wrong stock; **major** has a workaround; **minor** is wording or looks.

## 4. Sign-off

Go-live needs every test passed, or failed only on **minor** issues that are listed with a fix date.

| | Name | Signature | Date |
|---|---|---|---|
| Supply Office head | | | |
| Supply Office staff | | | |
| Office tester | | | |
| Office tester | | | |
| Developer | | | |

Accepted with these open minor issues: ____________________________________________
