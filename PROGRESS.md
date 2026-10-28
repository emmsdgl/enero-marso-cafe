# Progress

Where the Enero Marso website stands and what comes next. Read this first when picking the work back up. Then read
`cafe-order-platform-brief.md` (settled decisions and the owner's to-dos), `PRODUCT.md` (cafe facts) and `DESIGN.md`
(the look).

**Last updated:** 2026-10-29.
**Latest commit:** `4359276` "M7 email", pushed to `origin/main`.

## Where things stand
- Every planned milestone is built, committed and pushed: online ordering M0–M6, the M7 email code, and M8–M14.
- Both Neon databases have all 17 migrations (`0000`–`0016`): `main` (production) and `dev` (local work).
- Nothing is half-done: the working tree is clean and there are no test databases left over.
- What's left is outside the code: settings and accounts, testing with real people, and refreshing the promo videos.

## Next steps, in order
1. **Talk settings.** Push-to-talk needs four Cloudflare settings in Vercel (Production): `REALTIME_SFU_APP_ID`,
   `REALTIME_SFU_APP_SECRET`, `REALTIME_TURN_KEY_ID` and `REALTIME_TURN_KEY_TOKEN`. They're in `web/.env.local`;
   whether they're in Vercel hasn't been confirmed yet.
2. **Test run with the team.** Use the shared testing checklist page: about 70 checks for the customer, employee,
   manager, owner, rider and counter tablet, each marked pass or problem with a note. Testers need "Contributor"
   access to mark it.
3. **Domain and email (M7 setup).** Not started as of 2026-10-29. The `main` branch's login service still sends from
   Neon's shared address and only trusts https://enero-marso-cafe.vercel.app.
   - The steps are in `cafe-order-platform-brief.md`, under "Needed from the owner", then "M7".
   - The code switches each part on by itself once its settings exist: emailed staff invites, the optional email at
     checkout, and the privacy email address.
   - "Forgot password" already works on the live site. Until custom email is set up, its codes come from
     auth@mail.myneon.app, so staff should check spam.
   - Vercel Pro is needed before real orders, because the free plan doesn't allow commercial use. The plan is to
     upgrade together with the domain.
4. **Promo videos** (`video/`). Re-render them once the domain is live.
   - They were made before M10 (paying inside the chat) and M13 (our own riders, "Track your rider").
   - The end card shows eneromarso.cafe.
   - The words are in `video/src/content.ts` and `video/src/voice.ts`. `npm run voice` needs the Azure key in
     `video/.env`.
5. **Soft launch** for one week, then real orders.

Housekeeping, any time:
- The Neon branch `main-backup-2026-10-12` is archived. Delete it once it's no longer wanted.
- The `NEXT_PUBLIC_GOOGLE_MAPS_*` settings have been unused since the switch to OpenStreetMap.
- `web/.env.local` holds a copy of the Azure speech key, which the website doesn't use.
- Sentry: check that `NEXT_PUBLIC_SENTRY_DSN` is set in Vercel (see the brief).

Left out of the plan on purpose:
- Phone notifications to customers.
- An Android app for Talk (only if the web version isn't enough).
- A native iPhone push-to-talk app.
- Booking Lalamove through its API.
- Delivery fees by road distance.

## What's built
| Milestone | What it does | Commit | Migration |
|---|---|---|---|
| Staff portal | Logins with roles, clock in/out, time records | `76f69e6` | 0000, 0001 |
| M0 | Brief, order rules with tests, CI, Sentry | `7ac9ac7` | none |
| M1 | Menu in the database, sold-out toggles | `57c2aed` | 0002, 0003 |
| M2 | Pickup ordering and the live staff board | `e27a6bb` | 0004 |
| M3 | A chat on every order | `fde73f2` | 0005 |
| M4 | Delivery: map pin, fees, QR payments | `8e44668` | 0006 |
| Hours | Opening hours editable per branch | `567b29b` | 0007 |
| M5 | Installable staff app with push notifications | `437989d` | 0008 |
| M6 | Privacy notice, one-year clean-up, launch prep | `ca0e305` | 0009 |
| Team | The admin can remove staff | `9cfa901` | 0010 |
| Videos | Promo pitch and two reels (`video/`) | `50bffd4` | none |
| M8 | Menu editor: groups, sizes, items, add-ons | `f270538` | 0011 |
| M9 | Checkout: item pop-up, info, search, pickup or delivery last | `e29cc42` | none |
| M10 | Order page as one chat, paying inside it | `65ab9f0` | 0012 |
| M11 | Talk: push-to-talk for the owner and staff on shift | `963a772` | 0013 |
| M12 | Counter tablet as its own app (EM Clock-in) | `774a6df` | none |
| M13 | Our own riders: fee at checkout, cash on delivery, rider screen | `dae4ab4` | 0014 |
| M14 | Live rider map for the customer | `ee15cc0` | 0015 |
| M7 | Forgot password, staff setup links, order link by email | `4359276` | 0016 |

## How it's put together
- **`web/`:** the website and the staff app, built with Next.js 16 (App Router) and React 19.
  - **Database:** Drizzle on Neon Postgres, with the neon-http driver; `db.batch` runs as one transaction.
  - **Logins:** Neon Auth (`@neondatabase/auth` 0.5.0-beta), behind `web/src/lib/auth/server.ts`.
  - **Live updates:** Pusher carries "something changed" pings only, through `lib/realtime.ts`.
  - **Push notifications:** Web Push, in `lib/push.ts`.
  - **Maps:** MapLibre with OpenFreeMap tiles; no key needed.
  - **Talk:** Cloudflare Realtime, in `lib/realtime-sfu.ts`.
  - **Email:** Resend, in `lib/email.ts`.
  - **Quality:** Vitest for tests, Sentry for errors.
- **`video/`:** the Remotion promo videos, a separate npm project.
- **Business rules** live in `web/src/lib/`. Pure rules sit in `*-rules.ts` files with tests, and the database code sits
  beside them. Pages and server actions stay thin.
- **Roles** come from one place, `web/src/lib/roles.ts`: employee, manager, admin (the owner) and rider.
- **Hosting:** the Vercel project `enero-marso-cafe` runs in Singapore (`sin1`) at https://enero-marso-cafe.vercel.app.
  Every push to `main` deploys. The nightly clean-up runs from `/api/cron/retention`.
- **Neon project `enero-marso-cafe`** (AWS Singapore): the branch `main` is production, and `dev` is what
  `web/.env.local` uses. Each branch has its own login service.

**Settings.** Names only: the values live in Vercel and `web/.env.local`, never in git or in chat.

| Setting | What it's for |
|---|---|
| `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` | Database and logins |
| `KIOSK_SECRET`, `SETUP_CODE` | Counter tablet sign-in; the one-time owner setup |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`, `PUSHER_APP_ID`, `PUSHER_SECRET` | Live updates (Vercel only; locally the pages poll every 20 s) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (optional) | Staff push notifications |
| `REALTIME_SFU_APP_ID`, `REALTIME_SFU_APP_SECRET`, `REALTIME_TURN_KEY_ID`, `REALTIME_TURN_KEY_TOKEN` | Talk |
| `SITE_URL` | The site's address in emails (Production only); previews use their own |
| `RESEND_API_KEY`, `STAFF_EMAIL_FROM`, `ORDER_EMAIL_FROM`, `EMAIL_REPLY_TO`, `PRIVACY_EMAIL` | Email (M7) |
| `RESEND_API_URL` | Tests only: points email at a stand-in server |
| `CRON_SECRET` | Protects the nightly clean-up |
| `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` | Error alerts |

## How we work
- One milestone at a time: plan it, argue against it, agree, build, test, then check in before the next.
- The owner commits and pushes from VS Code. Finished work is staged with a ready commit message, with no co-author
  lines.
- Migrations only add things; nothing is dropped.
  - Generate one in `web/` with `npm run db:generate -- --name <name>`.
  - Before pushing code that needs it, the owner runs it on `dev` and then on `main` (`npm run db:migrate` with that
    branch's `DATABASE_URL`).
- Checks before staging, in `web/`: `npm run typecheck`, `npm run lint`, `npm test` and `npm run build`.
- **End-to-end tests:**
  - They run on a throwaway Neon branch made from `dev`.
  - Puppeteer drives Chrome against `next build`, then `next start -p 3300`.
  - A throwaway branch is deleted only after the owner says OK.
  - The old test scripts were kept in a temporary folder and are gone, so write new ones when needed.
- Secrets go only in `web/.env.local` and Vercel. Never paste them in chat or commit them.

## Things to know
- **Next.js 16 differs from older versions.** Read `web/node_modules/next/dist/docs/` before using an API (see
  `web/AGENTS.md`).
- **Login library bug.** In `@neondatabase/auth` 0.5.0-beta, `auth.emailOtp.resetPassword` posts to a path that Neon
  Auth doesn't have (404). `web/src/lib/password-reset.ts` calls `email-otp/reset-password` directly instead. Recheck
  this after upgrading the package.
- **Neon keeps reset codes only as a hash** in `neon_auth.verification`. A test reads a code by trying all 6-digit
  numbers against that hash, on a throwaway branch.
- **Email limits.** Resend's free plan sends 100 emails a day. The site keeps 60 for order emails and 40 for staff
  emails (reset codes and invites); see `web/src/lib/email-rules.ts`. A failed email never fails an order.
- **Talk** uses plain route handlers, not server actions: action IDs change with each deploy, and the counter tablet
  stays open for days. Each device also sends a near-silent keep-alive, because Cloudflare drops a track that stays
  silent for about 90 s.
- **Menu cache.** A local `next start` caches the menu in `web/.next/cache/fetch-cache`. Delete that folder when
  switching databases.
- **Clock skew.** This PC's clock runs about 2.5 minutes ahead of Neon's, so compare times with SQL `now()`.
- **Browser for tests.** Puppeteer can't launch Edge since its 2026-10-17 update, so use Chrome.
- **Git Bash paths.** Git Bash rewrites arguments that look like `/paths`; prefix such commands with
  `MSYS_NO_PATHCONV=1`.
