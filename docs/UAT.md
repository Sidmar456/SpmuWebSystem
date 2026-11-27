# User Acceptance Test (S8.3)

One week on the real server (after [DEPLOYMENT.md](DEPLOYMENT.md) passes), with real stock and real people. The Supply Office head signs at the end.

| | |
|---|---|
| Who | Supply Office staff (admin role), 2 to 3 offices (personnel role), for example a college, the Registrar and the Library, and 1 BAC member (validator role) |
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
| U10 | **Turnovers**: on a property item click **Request inspection**, describe the problem | PIR number, status Requested. Trying a second request for the same item is refused | | |
| U11 | Try to turn over an item as **Unserviceable** without a report | Note "is inspected before it is turned over" with a link; Submit is disabled | | |
| U12 | After the report says unserviceable, click **Turn over item** on it | Form is filled in (reason, condition, report number). PRS submitted, status For receiving | | |
| U13 | **Availability → New inquiry** with 2 items | SAI number, status Waiting for answer | | |
| U14 | After the answer, on the SAI click **Create purchase request**; add specifications and costs; **Print PR** | Only the not-available items are on the form. Totals add up. PR number, status In process | | |
| U15 | When a PR is returned, **Correct and resubmit** | The reason is shown. After resubmitting, the progress bar starts again at TWG verified | | |

### Supply Office (admin)

| ID | Steps | Expected | P/F | Notes |
|---|---|---|---|---|
| A1 | **Accounts**: approve one sign-up, reject one test sign-up | Approved person can log in; rejected cannot. Both get an email | | |
| A2 | **Dashboard** in the morning | Counts match the lists they open. Low stock plus out of stock together are the items in the 7:00 AM notification | | |
| A3 | Open a pending request; approve less than requested on one line | Requester notified. Stock is **not** deducted yet | | |
| A4 | Reject a request with a reason | Requester sees the reason | | |
| A5 | Issue an approved request; enter who received it; **Print** the RIS and have it signed | Stock goes down by the approved amounts. The stock card shows the issue with the RIS number. Slip prints on one page with signature lines | | |
| A6 | Try to issue a request when an item ran out after approval | "Not enough stock for …". Nothing is deducted from any item | | |
| A7 | **Receive** a turnover and accept it as serviceable; accept another with the condition changed to unserviceable; not accept a third with a reason; print a PRS | Serviceable: stock goes up. Unserviceable: stock unchanged. The person sees "Received · cleared", or "Not accepted" with the reason |
| A13 | Disable an account that still holds property, then one that holds none; enable it again; print a clearance | First is refused with the quantity held. Second is logged out at once. Clearance shows the certificate or the items still held | | |
| A8 | **Suppliers → Request stock**: email a request; when the delivery comes, **Mark delivered** with one item short | Supplier receives the email. Only the received quantities are added; the request shows "3 of 4" | | |
| A9 | **Stock in** a delivery and **Adjust** a damaged item (needs a reason); try an adjustment that would go below zero | Both show on the stock card with your name. Below zero is refused | | |
| A10 | **History → Monthly stock report** for the current month; open it in Excel | For 3 items, opening + in − issued + turned over ± adjustments = closing, and closing = on hand | | |
| A11 | Log in as personnel and open `/accounts` or `/dashboard` | Sent back to Stocks. Personnel never see admin screens | | |
| A12 | Ask the server admin to run `scripts\restore-test.bat` on last night's backup | Ends with PASS | | |
| A14 | **Inspections**: set a date on U10's request, then **Record report** as unserviceable; **Print report** | Requester notified twice. Report prints with findings and signature lines | | |
| A15 | **Receive** U12's turnover; try to set the condition to serviceable | Only Unserviceable is offered. Stock unchanged; the item appears in **Unserviceable → Register** | | |
| A16 | Set the ARE no. on that turnover; on **Unserviceable** tick 2 items, **Create IIRUP**, **Print IIRUP** | Items without an ARE no. cannot be ticked. After creating, they leave the register. The ARE no. can no longer change | | |
| A17 | On the IIRUP: **Schedule disposal**, then **Record disposal** | Status Disposal scheduled, then Disposed. The turnover's progress bar shows every step done | | |
| A18 | **Availability**: answer U13's inquiry, one item not available | Save stays disabled until every item is tagged. Requester notified | | |
| A19 | On U14's PR: record TWG verified and PR series no.; try to record a BAC step | BAC steps are not offered to the Supply Office. The PR waits for the BAC | | |
| A20 | After the BAC (B2), record BURS, funds, contract approved, PO signed; **Record delivery**; **Record inspection (IAR)** accepting one less than ordered | A reason is required for the short item. **Print IAR** shows delivered and accepted quantities | | |
| A21 | **Stock in and issue**: one existing item, one new property item | An RIS is created and issued at once; the stock card shows in and out. **Print ICS** or **Print PAR** depending on the cost. The item shows in the requester's Property in your care | | |
| A22 | **Dashboard** with open inspections, inquiries and PRs | The 3 new cards match their lists; PRs held by the BAC are not counted | | |

### BAC (validator)

| ID | Steps | Expected | P/F | Notes |
|---|---|---|---|---|
| B1 | Log in as the validator; open **Purchase requests** | Every PR is listed, not only your own. No admin menus (Dashboard, Accounts) | | |
| B2 | On a PR waiting for the BAC: **Record: BAC validated**, then **Record: Bid awarded** with a supplier and amount | Steps 3 and 4 done with your name. The Supply Office is notified it is their turn | | |
| B3 | On another PR: **Return for corrections** with a reason | Status Returned for corrections; the requester sees the reason (U15) | | |

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
| BAC tester | | | |
| Developer | | | |

Accepted with these open minor issues: ____________________________________________
