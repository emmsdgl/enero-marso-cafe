# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated, recommended and accepted in principle: Next.js (App Router) deployed on Vercel. Reason: the owner plans employee login and delivery task management, which need auth, server routes, and a database alongside the public site. Style explorations may be static HTML prototypes; the chosen direction is built in Next.js.

## Users

Enero Marso Cafe is a small cafe in the Philippines serving a mixed crowd, all confirmed by the owner:
- Students and remote workers who stay for hours to study or work.
- Office workers grabbing coffee on the go, mostly takeout.
- Families and friends hanging out, especially on weekends, dining in.
- Couples and guests on dates or special occasions who come for the ambience and the "Premier" experience.

Future users: cafe employees (login, delivery tasks).

## Product Purpose

The website must do all of these:
- Show the menu (drinks, food, prices) so people can browse before coming.
- Get people to visit: location, map, opening hours, directions.
- Drive orders: delivery and pickup / pre-order.
- Show the place and its vibe: interior, events, social media.

Later: an employee area for delivery operations.

## Confirmed facts (from the owner's Canva design, Oct 2026)

- Tagline: "Coffee, Comfort & Good Conversations".
- Address: 126 Champaca St., Western Bicutan, Taguig.
- About copy: "Enero Marso Cafe is a cozy spot built around great coffee, comfort, and good conversations. With passionate baristas behind every brew, ..."
- Menu so far: Iced Latte ₱120, Vanilla Latte ₱140, Choco Frappe ₱160, Baked Lasagna ₱180, Carbonara Pasta ₱160, Club Sandwich ₱120.
- Site structure: separate landing page (Canva page 1) leading to the homepage (Canva page 2); nav Home, Gallery, Our Store, Contact.
- Canva design: "ENERO MARSO CAFE" (DAHWajLGU78). The owner's Canva Pro account now has access. Clean assets were exported from a working copy (DAHW83WOkOg, text removed). The drink/food photos and barista video are Canva Pro stock; the cup photo is the cafe's own.

## Branches (confirmed by owner, Oct 2026)

1. **Enero Marso Cafe** (main): 126 Champaca St., Western Bicutan, Taguig. Full menu (coffee and food).
   - Hours: Mon closed; Tue–Sun 6:00 PM – 1:00 AM (past midnight).
   - Instagram: https://www.instagram.com/eneromarsocafe/
   - Facebook: https://www.facebook.com/profile.php?id=61569139323409
2. **Enero Marso Cafe Noir**: "Good Coffee, Great Conversations". A small trailer coffee cart that serves quality drinks. Cayetano Blvd. cor. Bagong Calzada, Ususan, Taguig (across Vista Mall Taguig).
   - Serves drinks only (no food).
   - Hours: Mon, Wed, Thu, Fri, Sat, Sun 9:00 AM – 1:00 AM (past midnight); Tue 1:00 PM – 10:00 PM.
   - The Instagram and Facebook pages below are Noir's own, not the whole brand's.
   - Instagram: https://www.instagram.com/eneromarsonoir/
   - Facebook: https://www.facebook.com/1216769311528466

## Mission and Vision (owner's wording)

- Mission: To serve quality coffee with genuine warmth creating meaningful moments and memorable experiences in every visit.
- Vision: To be a beloved coffee destination where great coffee, good people, and everyday moments come together.

## Operations (confirmed by owner, Oct 2026)

- POS: both stores use **Loyverse** for sales and stock. The website must not duplicate POS sales/inventory; staff features complement it.
- Delivery: third-party only (**Lalamove**). No in-house riders, so no delivery role.
- Payments: **GCash** and **cash** at both stores.
- Staff portal (inside the same Next.js app under /staff): roles Employee, Branch Manager, Admin. Built: accounts, clock in/out, time records. Planned: online order queue, sold-out toggles, menu/price management, website content.
- People: owner/admin **Mr. Denzel**; branch managers **Mr. Karlo** (Enero Marso Cafe, main) and **Mr. Adrian** (Cafe Noir).
- Clock-in rules (owner's choice): either the branch's registered counter tablet with a personal PIN, or the person's own phone while on the branch's registered Wi-Fi (matched by the connection's public IP).
- Database: Neon project `enero-marso-cafe` (Singapore), Neon Auth for logins. Branches: `main` (production), `dev` (local development).

## Positioning

Premium coffee quality is the differentiator: the coffee itself, not just the space. The brand name carries "Premier".

## Capabilities and Constraints

- Owner is preparing a full web design in Canva (made by a friend); when it arrives it becomes the authority for the public site's look.
- Delivery partners, ordering mechanism, and payment flow are undecided.
- Employee login is planned, not built.

## Brand Commitments

- Name: "Enero Marso Cafe", tagline line "Premier".
- Logo: gold E/M monogram in an open circle with a coffee bean, wordmark "ENERO MARSO", "CAFE" between rules, "Premier" in script. Gold on black. Source: `assets/enero-marso-logo.jpg` (original: `enero marso logo.jpg`).
- Logo loader animation exists: `loader/` (approved by owner), ported into the site.
- Brand typography follows the logo lettering (owner's decision): Montserrat (matches "ENERO MARSO" / "CAFE") and Allura (closest free match to the "Premier" script; the exact script font is unknown, likely a paid Canva font).
- Palette from the Canva design: cream #faf1e1, sand #e1cdb3, card #d2b794, brown #834a22, gold #cf9d57, cocoa #503225, ink #151211.

## Evidence on Hand

- Logo artwork, the Canva design, and the confirmed facts above.
- Still missing: opening hours, phone/email, social handles, and the full menu. Do not invent them; placeholders say "to be announced" or "photo coming soon".

## Product Principles

- The coffee is the hero; everything else supports believing in its quality.
- One site serves very different visits: a fast takeout check, a long study session, a weekend family table, a date night. Each should find its answer quickly.
- Practical facts (menu, hours, location, order) are never more than one tap away, especially on phones.
- Premium, not pretentious: welcoming to students and families as much as to special occasions.
