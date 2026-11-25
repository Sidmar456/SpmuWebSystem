# User Guide — SPMU Inventory Monitoring System (S8.4)

For ZPPSU personnel who request supplies, and for Supply Office staff who run the stockroom. Open the system in a browser on the campus network at the address the Supply Office gives you (for example `http://spmu.zppsu.local`). It works on phones too.

**Words used here**

| Word | Meaning |
|---|---|
| RIS | Requisition and Issue Slip: your request for items. Numbered RIS-2026-0001, and so on |
| PRS | Property Return Slip: returning a property item to the Supply Office |
| Consumable | Used up, for example bond paper or ink. Not returned |
| Property | Equipment that stays in your care, for example a projector. Can be turned over |

---

## Part 1. Personnel

### Get an account

1. Click **Request an account**. Enter your full name, ZPPSU email, college or office, and a password of at least 8 characters.
2. Read the privacy notice and tick the box.
3. Wait for the email saying your account is approved. Until then, logging in says "Your account is still waiting for approval."

Forgot your password? On the login screen click **Forgot password?**, enter your email, and open the link in the email within 60 minutes.

### Request items (RIS)

1. **Requests → New request**.
2. Write the **purpose**, for example "Handouts for the faculty seminar".
3. Under **Find an item**, type part of a name or stock number, then **Add** the items you need. Set the quantity for each. You cannot ask for more than is available.
4. **Submit request**. You get an RIS number with status **Pending**.
5. The bell at the top lights up when the Supply Office decides:
   - **Approved**: bring the RIS number to the Supply Office counter. The approved quantity can be less than you asked for.
   - **Rejected**: open the request to see the reason.
6. At the counter you sign the printed slip and receive the items. The status becomes **Issued**.

Changed your mind? Open a **Pending** request and click **Cancel request**.

### Return property (PRS)

1. **Turnovers**. "Property in your care" lists the property items issued to you.
2. Click **Turn over** next to the item. Choose the quantity, the reason, and the condition:
   - **Serviceable**: it still works and goes back to stock.
   - **Unserviceable**: broken or worn out, for disposal.
3. **Submit turnover**. It shows **For inspection**. Bring the item to the Supply Office; it stays under your name until they inspect it.
4. The bell tells you the result:
   - **Received · cleared**: the item is no longer under your name.
   - **Not accepted**: open the slip to see why, fix it, and submit a new turnover.

Leaving ZPPSU or moving office? **Turnovers → My clearance** prints your Certificate of Property Clearance, or lists what you still hold.

### Check your history

**History** shows all your requests and turnovers, newest first. Filter by date with **From** and **To**. Click a number to open it.

---

## Part 2. Supply Office

You see more menus: Dashboard, Suppliers and Accounts, plus the admin actions on each screen.

### Start of the day

1. **Dashboard**: requests to review, requests waiting to be issued, turnovers to receive, low and out-of-stock items, accounts waiting. Click a card to open that list.
2. At 7:00 AM the system sends one notification listing items at or below their reorder level.

### Approve accounts

**Accounts → Pending**. Check that the person is ZPPSU personnel, then **Approve** or **Reject** (asks first; cannot be undone). The person gets an email either way.

- **Make admin / Make personnel**: gives or removes access to the Supply Office screens. You cannot change your own role, and there must always be one active admin.
- **Disable**: for someone who left. They are logged out at once and cannot log in. Refused while they still hold property: get it turned over first. **Enable** undoes it.
- **Clearance**: prints the person's Certificate of Property Clearance, or the list of property still under their name.

### Stock

- **Add an item**: **Stocks → Add item**. Stock / property no., name, unit, type, reorder level, supplier, optional photo. **Opening quantity** is recorded on the stock card.
- **Delivery arrived**: open the item, **Stock in**, quantity received, optional remarks (delivery receipt number).
- **Count is wrong, damaged or lost**: **Adjust** with a negative or positive number and a reason. Stock can never go below zero.
- **Stock card**: every change with date, type, quantity, balance after, reference and who did it. Use it to answer audit questions.
- Quantity cannot be typed on the item form. It only changes through stock in, adjust, issue and turnover, so the stock card always explains the balance.

### Requests

1. **Requests → Pending**. Open one. The **In stock** column shows red "Not enough" when stock is short.
2. **Approve**: set the quantity for each line (0 leaves a line out). Stock is not deducted yet. Or **Reject** with a reason the requester will see.
3. When the requester comes: **Approved** tab, open it, **Issue items**, enter who received them. Stock is deducted now. If an item ran out in the meantime, nothing is deducted and you see which item is short.
4. **Print** the RIS and have it signed.

### Turnovers

**Turnovers → For inspection**, then **Inspect** when the item is at the counter:
- **Accept**: set the condition you actually find. The person is cleared. Serviceable items go back to stock; unserviceable ones are recorded for disposal.
- **Not accept**: write the reason (missing parts, wrong item). The item stays under the person's name.

**Print** the PRS for signatures. The dashboard shows how long the oldest slip has waited, and at 7:00 AM you get a reminder for anything waiting more than 3 days.

### Suppliers

- **Suppliers → Add supplier**: name, contact person, email, phone, address, notes.
- **Request stock** (needs the supplier's email and at least one item linked to it): enter quantities and notes, then **Email request**. The supplier gets an email with an SR number.
- When the delivery comes: **Mark delivered**. The quantities start at what you ordered; change any that came short. They are added to stock.
- A supplier that still has items or stock requests cannot be removed.

### Reports

**History → Monthly stock report**: pick a month, **Download CSV**, open it in Excel. Per item: opening, stock in, issued, turned over, adjustments, closing.

---

## Part 3. Training plan

Two short hands-on sessions on the real server, after opening balances are entered ([UAT.md](UAT.md) section 1). Each trainee uses their own account on a laptop or phone.

| Session | Who | Length | Covers | Done when the trainee can |
|---|---|---|---|---|
| 1. Supply Office | All Supply Office staff | 2 hours | Part 2 of this guide, plus [UAT.md](UAT.md) tests A1–A10 as exercises | Approve a sign-up, issue a request and print the RIS, receive a turnover, stock in a delivery, explain a balance from the stock card |
| 2. Offices | 1 to 2 people per college or office, who then show their colleagues | 1 hour | Part 1 of this guide, plus tests U1–U8 | Sign up, request items, cancel a request, turn over property, reset a password |

Bring: this guide printed, a projector, 2 sample items set up for practice, and a test supplier with your own email address so the stock request email can be seen.

After training, the Supply Office keeps one printed copy of this guide at the counter. Questions go to the Supply Office first, then to the developer listed in the sign-off sheet.
