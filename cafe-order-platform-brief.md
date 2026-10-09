# Project Brief: Enero Marso online ordering with per-order chat

> Finalized Oct 2026 after a devil's-advocate review with the owner-developer.
> The decisions below are settled; change them only by agreement and note the change here.
> Product facts (branches, hours, menus, people) live in `PRODUCT.md`; the look lives in `DESIGN.md`.

## What we're building
Online ordering for **Enero Marso Cafe**, added to the existing Next.js site in `web/`:

1. **Customer side (website):** browse a branch's menu, order for **pickup or delivery**, follow the order on a private
   tracking page, and chat with staff about that order.
2. **Staff side (the existing `/staff` portal, installable as an app):** receive orders live, move them through their
   statuses, quote delivery fees, verify GCash payments, and chat with the customer.

The key feature is **one chat per order**:
- Every order has its own thread; a new order always starts a new one.
- The chat is open while the order is in progress, and for **30 minutes after it is done** (for "missing item"
  reports). After that it is read-only for both sides.
- Cancelled orders close the chat at once. An order left unfinished for **12 hours** counts as closed.
- Closed chats are kept (read-only) for disputes, then anonymized after 1 year (see Privacy).

## Branches
Both branches take online orders from launch, each with its own menu and order board:
- **Enero Marso Cafe** (main, Western Bicutan): drinks and food.
- **Enero Marso Cafe Noir** (coffee cart across Vista Mall Taguig): drinks only.
- Orders are accepted only while the branch is open, until **30 minutes before closing**. This uses the hours in
  `web/src/data/branches.ts` (`takingOrders`), including windows that run past midnight.

## Customer flow (no account)
1. Pick the branch, then **Pickup** or **Delivery**.
2. Add items. Sizes, prices and sold-out items come from the server; the cart never sets a price.
3. Enter name, mobile number and notes. For **delivery**, also drop a pin on the map (or "use my location") and add the
   address and a landmark.
4. Accept the privacy notice and place the order.
5. Land on the private **tracking page** `/order/{code}?t={token}`, which has the live status and the chat.
6. Getting back to it is free: the link is shown with copy and share buttons, and the site remembers the active order
   on that phone ("You have an order in progress"). If the link is lost, staff can **re-issue** one, which voids the
   old link. No SMS. Email links come later, once the cafe has its own domain.
7. After completion, the chat shows as closed with a thank-you message.

## Payment and delivery
- **Pickup:** pay at the counter, by cash or GCash.
- **Delivery (via Lalamove):**
  1. Staff open the customer's pin (Plus Code and an "Open in Google Maps" link) in the Lalamove app and check the fee.
  2. Staff post the delivery fee; the order moves to **awaiting payment** with the new total.
  3. The customer pays the total by **GCash** to the branch's number or QR and enters the **reference number**.
  4. Staff check the reference and amount in the GCash app, then **verify**. Only then can the order be accepted.
  5. Staff book the Lalamove rider and paste the **tracking link**, which the customer sees on their page.
- Payment checking is **manual**: a personal GCash account has no API.
- **Later:** a PayMongo account confirms payments automatically through a webhook. An unregistered individual account
  can take **QR Ph** (1.34% per payment, payable from the GCash app). With DTI + BIR registration it can take direct
  GCash (2.23%), Maya and cards. The order's `payment_method` field leaves room for this.
- **Later:** the cafe may hire its own riders. Orders record a `delivery_provider` (`lalamove` now, `own_rider` later).

## Order status lifecycle
| Fulfillment | Steps |
|---|---|
| Pickup | `pending → accepted → preparing → ready → done` |
| Delivery | `pending → awaiting_payment → accepted → preparing → ready → out_for_delivery → done` |

- `cancelled` is possible from `pending`, `awaiting_payment` or `accepted`.
- Payment is tracked separately: `unpaid → submitted → verified` (or `refunded`).
- A delivery order can only be accepted once its payment is `verified`.
- The rules live in `web/src/lib/order-rules.ts` and are covered by tests.

## Chat rules
- Each status change posts a system message, e.g. "Your order is being prepared."
- Messages appear live on both sides with no refresh, through Pusher. If the live connection drops, pages check for
  updates every 20 seconds.
- The open/closed rule is worked out from the order's times whenever someone reads or writes. No background job
  closes chats.
- **The server rejects messages to a closed chat.** The interface hiding the box is not enough.
- Unread badges use the last-read time of each side.

## Staff side
- Lives inside the existing `/staff` portal, with the same accounts, roles and branch rules: employees, branch
  managers and the admin.
  - Employees signed in with a PIN at the branch can run the board.
  - Staff see only their branch's orders; the admin sees both branches.
- **Orders board:** the branch's active orders, newest first, with unread badges.
  - On the counter tablet, a **sound alert** plays for each new order and the screen stays awake.
  - **Push notifications** to staff phones are the backup channel.
- **Order detail:** items, customer details, the pin, status buttons, the fee quote, payment verification, the
  tracking link, the chat and link re-issue.
- **Menu:** everyone can mark items sold out; managers and the admin can edit names and prices.
- **Installable:** the portal installs from the browser. Android works directly; iPhones need "Add to Home Screen"
  (iOS 16.4+) before push works. There is no native app for now. All order logic sits behind server functions and a
  small API, so a native app later is just a new client.
- **Loyverse:** staff still ring online orders into Loyverse by hand for now. A sync is a later idea.

## Security
- The customer token is 32 random bytes. The database stores only its SHA-256, never the order ID alone as access.
- A token opens only its own order and chat. The tracking page sends `Referrer-Policy: no-referrer` and `noindex`.
- Staff actions require a staff session; branch scoping uses `canActOnBranch`. Staff actions are recorded with
  `audit()`.
- Rate limits are worked out by counting rows:
  - orders per IP address and per phone number per hour;
  - messages per order per minute.
- Prices, availability and opening hours are always checked on the server.

## Privacy (Data Privacy Act of 2012)
- A short privacy notice at checkout says what is collected and why, and names the cafe's contact person.
- Orders and chats are kept for **1 year**. After that, the customer's name, phone, address, pin and message text are
  anonymized; totals and items stay for records.
- Personal data is never sent to the realtime service or to error tracking. Events only say "order X changed", and
  pages fetch details from our own server.

## Data model (Drizzle on Neon Postgres)
- **Menu tables, seeded from `web/src/data/menu.ts`:**
  - `menu_categories`: id, branch_id, title, note, sizes[], kind, sort.
  - `menu_items`: id, category_id, name, note, prices[] (null = size not offered), star, available, sort.
  - `menu_addons`: branch_id, name, price, available.
- **`orders`:**
  - id, code (e.g. `EM-7KQ4P2`), branch_id, token_hash, status, fulfillment.
  - Customer: customer_name, customer_phone, notes.
  - Delivery: address, landmark, lat, lng, plus_code, delivery_provider, delivery_fee, tracking_url.
  - Money: subtotal, total, payment_method, payment_status, gcash_ref.
  - Timestamps: created_at, accepted_at, ready_at, out_at, done_at, cancelled_at.
  - Other: cancel_reason, staff_last_read_at, customer_last_read_at, created_ip, accepted_by.
- **`order_items`:** order_id, item_id, name, size, unit_price, qty, addons, line_total, notes. Names and prices are
  copied at the time of the order.
- **`order_messages`:** order_id, sender (customer, staff or system), staff_id, body, created_at.
- **`push_subscriptions`:** staff_id, endpoint, keys, created_at, last_used_at.
- **Existing tables:** `branches`, `staff`, `branch_networks`, `kiosks`, `time_entries`, `audit_log`.

## Tech stack (decided for the long term)
- **Website and staff app:** Next.js 16 (App Router) on **Vercel Pro**. Pro is needed before real orders, because the
  free Hobby plan doesn't allow commercial use.
- **Database:** Neon Postgres (plain Postgres, portable) with Drizzle migrations. Production migrations are run by the
  owner or with their explicit OK.
- **Logins:** Neon Auth (managed Better Auth), kept behind `web/src/lib/auth/server.ts`.
- **Realtime:** Pusher Channels (free tier), behind `lib/realtime.ts` so the provider can change.
- **Push:** standard Web Push (VAPID) from the installable staff portal. No Firebase needed.
- **Maps:** Google Maps JavaScript API for the delivery pin.
  - The map loads only when Delivery is chosen. It's free under 10,000 map loads a month.
  - It needs a Google Cloud billing account; the key is restricted to the site with a daily quota cap.
  - The Plus Code is computed from the pin locally, at no cost.
- **Quality:**
  - Vitest unit tests for the rules.
  - GitHub Actions CI on every push: lint, type-check, tests and build.
  - Sentry error alerts (free plan, errors only, no personal data).
  - Next.js is pinned and upgraded once per major version.
- **Not chosen, and why:**
  - **Laravel:** a full rewrite of the live site and portal, plus a server to maintain.
  - **A native staff app:** a second codebase and store fees for about 10 staff.
  - **SMS:** a per-order cost.

## Out of scope for v1
- An automatic payment gateway (PayMongo) and online card payments.
- Customer accounts and order history, beyond the device remembering active orders.
- Analytics. Admin is limited to the order board, menu editing and the existing staff tools.
- Loyverse sync, and automatic Lalamove booking or quotes. The Lalamove API takes pin coordinates, so automatic quotes
  are a natural later step.
- Event and coffee-booth bookings through the order system. The `/reservations` form stays a placeholder.

## Milestones (build one at a time, check in after each)
0. **Foundations:**
   - This brief and the `PRODUCT.md` update.
   - The order rules with tests, and the opening-hours cutoff.
   - CI and Sentry.
1. **Menu in the database:**
   - Tables and a seed; `/menu` and the homepage read from the database.
   - `/staff/menu` with sold-out toggles and price edits.
2. **Pickup ordering end to end, both branches:**
   - Checkout and the tracking page.
   - The staff board with live updates, sound and wake lock.
3. **Per-order chat:**
   - System messages, the grace-period close and server-side rejection.
   - Unread badges, the "order in progress" banner and link re-issue.
4. **Delivery:**
   - The map pin, Plus Code and Maps link.
   - Fee quote, GCash reference and verification.
   - The Lalamove tracking link.
5. **Staff push notifications:**
   - The installable portal and service worker.
   - Testing on Android and on a home-screen iPhone.
6. **Hardening and launch:**
   - The privacy notice and the retention job.
   - Rate-limit review and a staff run-through.
   - Vercel Pro, then a one-week soft launch.

## Needed from the owner
- **M2:**
  - A Pusher account, with its keys added in Vercel.
  - Confirm the 30-minute cutoff.
  - Pickup timing: as soon as possible only, or a chosen time later that day.
- **M4:**
  - The GCash number or QR and account name for each branch (or one shared).
  - The delivery area or maximum distance, any minimum order, and whether Cafe Noir delivers.
  - A Google Cloud billing account for the Maps key.
- **M6:** upgrade to Vercel Pro, and name the privacy contact person.
- **Optional:** a custom domain, which unlocks email links.
- **Sentry:**
  - Create a free account and a Next.js project.
  - Add `NEXT_PUBLIC_SENTRY_DSN` in Vercel and `web/.env.local`.
  - Optionally add `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` for readable stack traces.

## How to work
1. Read `PRODUCT.md`, `DESIGN.md` and the existing code before writing UI. Follow the brand tokens in
   `web/src/app/globals.css`; ask before adding a color or a font.
2. Reuse what exists:
   - `requireStaff`, `canActOnBranch`, `audit`, `clientIp` and `manila` in `web/src/lib/staff.ts`;
   - `takingOrders` and `manilaClock` in `web/src/data/branches.ts`;
   - the staff UI pieces in `web/src/components/staff/`.
3. Keep business rules in `web/src/lib/` as plain server functions. Pages, server actions and API routes stay thin.
4. Every rule gets a unit test. Every milestone gets an end-to-end run on the Neon `dev` branch and phone and desktop
   screenshots.
5. Keep the code simple and readable: one solo maintainer.
