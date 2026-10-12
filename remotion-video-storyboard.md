# Remotion video: Enero Marso online ordering

Motion graphics that explain the cafe's ordering website and its one-chat-per-order feature, built in Remotion. Everything on screen matches the real app: the menu, prices, order codes, notifications, buttons and chat lines come from the live code.

## Three videos from one set of scenes

| Cut | Size | Length | For | Story |
|---|---|---|---|---|
| **Pitch** | 1920×1080, 30 fps | about 70 s | The cafe owner, YouTube, Facebook | Delivery, a short pickup beat, then the benefits card |
| **Reel: pickup** | 1080×1920, 30 fps | about 25 s | Reels and TikTok | Order, chat, "Show your code at the counter" |
| **Reel: delivery** | 1080×1920, 30 fps | about 30 s | Reels and TikTok | Pin, pay by GCash, on its way, delivered |

- **Audio:** no voiceover. Captions carry the story, with room left for music later.
- **Captions:** 3 to 8 words each, on screen for at least 2 seconds.
- **Reels:** keep text out of the bottom 20% and the right 15%, where the app's own buttons sit.

## Brand (from the website; nothing invented)
- **Name:** Enero Marso Cafe. The videos use the main branch, Enero Marso Cafe. Cafe Noir only appears by name, if at all.
- **Colors** (from `web/src/app/globals.css`):

  | Color | Hex |
  |---|---|
  | ink | `#151211` |
  | cream | `#faf1e1` |
  | sand | `#e1cdb3` |
  | card | `#d2b794` |
  | brown | `#834a22` |
  | cocoa | `#503225` |
  | gold | `#cf9d57` |

- **Fonts:** Montserrat for the interface and captions; Allura for script accents, as on the site ("Skip the line, we'll have it ready"). Both load through `@remotion/google-fonts`.
- **Logos:** `web/public/brand/` (`enero-marso-logo-gold.png`, `enero-marso-monogram-gold.png`, `icon-cup.png`).
- **Look:** intros and the outro on dark ink with a gold logo. App screens in cream with ink text, brown buttons and gold highlights, like the real site.
- **Motion:** calm, using `spring()` and `interpolate()`; no flashy effects.
- **Icons:** drawn SVG for the cup, scooter, check, lock and pin. No emojis.

## Sample data (all in one config file)

**Pickup order `EM-7KQ4P2`**
- Spanish Latte, Large: ₱140.
- French Fries: ₱65.
- Total: 2 items, ₱205.

**Delivery order `EM-4T9HCD`**, delivered 1.2 km from the cafe:
- White Mocha, Large: ₱145.
- Sea Salt Spanish Latte, Medium: ₱130.
- Chicken Nuggets with Fries: ₱170.
- Items: ₱445.
- Delivery fee: ₱50.
- Total to pay: ₱495.

**Customer:** Bea, 0917 123 4567. Paid by GCash, reference 1234 567 890123.

**URL:** eneromarso.cafe. If we publish before the domain is live, use the current address instead.

### Real wording to use

**Staff phone notifications**
- "New order EM-7KQ4P2", then "Cafe · Pickup ASAP · 2 items · ₱205".
- "New order EM-4T9HCD", then "Cafe · Delivery 1.2 km ASAP · 3 items · ₱445".
- "Payment to check: EM-4T9HCD", then "Cafe · ₱495 to GCash. Check it in the app, then accept."

**Staff buttons**
- Pickup: Accept, then Start preparing, then Mark ready, then Picked up.
- Delivery adds:
  - "Confirm and send fee";
  - "Payment received";
  - "Out for delivery", with the Lalamove tracking link.

**Customer page headlines**
- **Pickup:**
  1. "Order sent. Waiting for the cafe to accept it."
  2. "Your order is being prepared."
  3. "Ready! Show code EM-7KQ4P2 at the counter."
  4. "Picked up. Thanks for ordering!"
- **Delivery:**
  1. "Order sent. The cafe will confirm it and the delivery fee."
  2. "Confirmed! Pay ₱495 to start your order."
  3. "Payment sent. The cafe is checking it."
  4. "Your order is being prepared."
  5. "On its way to you."
  6. "Delivered. Thanks for ordering!"

**Order page tabs:** Pay (while paying), Messages and Your order. The progress bar has 5 steps.

**Chat, delivery**
- System lines, centered and muted:
  1. "The cafe confirmed the order. Delivery: ₱50. Total to pay: ₱495."
  2. "The customer sent payment reference 1234567890 (paid to GCash). The cafe is checking it."
  3. "Payment received. The cafe accepted the order."
  4. "The order is being prepared."
  5. "The order is ready and waiting for the rider."
  6. "The order is on its way with Lalamove."
  7. "Delivered. This chat stays open for 30 minutes in case anything's missing."
- Customer: "Less ice po, thank you!"
- Staff: "Sure po, noted!"

**Chat, pickup**
- System lines:
  1. "The cafe accepted the order."
  2. "The order is being prepared."
  3. "The order is ready for pickup."
  4. "Picked up. This chat stays open for 30 minutes in case anything's missing."
- The same customer and staff lines as delivery (Taglish).

**Chat once closed:** "This chat closed at 3:45 PM. For anything else, message Enero Marso Cafe on Facebook."

**Order bubble** (floats over the site while the order is in progress): "Your order EM-7KQ4P2 · Being prepared".

**Language:** customer and staff chat lines are in Taglish, as real customers write. Captions and the app's own system lines stay in English.

**Chat sides**
- On the customer's screen: their messages on the right in brown, the cafe's on the left in sand.
- On the staff phone: the staff's messages on the right.
- System lines are always centered.

## Building blocks (React components, not images)
- **Frames:**
  - `BrowserFrame`: a simple browser with the address bar showing `eneromarso.cafe`.
  - `PhoneFrame`: a modern phone with the dark "ENERO MARSO STAFF" header.
- **Simplified screens** in the real look:
  - `CheckoutScreen`: the one-line "Pickup at / Delivery from" summary, menu rows with "+", size buttons, and Your order.
  - `TrackScreen`: code, headline, progress bar and tabs.
  - `StaffBoard`.
  - `StaffOrder`.
- **Small parts:** `ChatBubble`, `PushBanner`, `Caption`, `TapRipple` (a finger tap) and `Cursor` (laptop clicks).
- **Payment and map:** `QrCode` (decorative), `MapPin` on a simple drawn map, and `OrderBubble`.

## Scenes

### Pitch, 16:9 (about 70 s)
1. **Hook (0–5 s).** The gold logo fades in on ink and rises.
   - Caption: **"Ordering from Enero Marso just got easier."**
2. **The problem (5–11 s).** Scattered chat bubbles pile up: "Nareceive niyo po ba order ko?", "Ready na po ba?", "Hello po?", plus a missed call. The pile shakes, then sweeps away.
   - Caption: **"No more orders lost in chats."**
3. **The customer orders, delivery (11–23 s).** In the browser:
   - "Delivery from Enero Marso Cafe" appears.
   - A pin drops on the map.
   - Three items go in: "+", a size, then "Add · ₱145".
   - Your order shows ₱445, then "Send order".
   - The page reads "Order sent. The cafe will confirm it and the delivery fee."
   - Caption: **"Order online. No app, no account."**
4. **The staff get it (23–29 s).** On the phone:
   - The "New order EM-4T9HCD" banner slides down.
   - A tap opens the order.
   - The staff type ₱50, then tap "Confirm and send fee".
   - Caption: **"Our staff get it instantly."**
5. **Pay by GCash (29–36 s).**
   - Browser: the Pay tab with the QR and "Pay ₱495". The reference is typed in, then "I've paid".
   - Phone: "Payment to check" slides down, then a tap on "Payment received".
   - Caption: **"Pay by GCash. We confirm it."**
6. **The chat (36–48 s).** Split screen: the browser's Messages tab on the left, the phone on the right.
   - The lines animate on both screens at once: being prepared, "Less ice po, thank you!", "Sure po, noted!", then on its way with Lalamove and "Track your rider".
   - Caption: **"Every order gets its own chat."**
7. **Delivered, then the chat closes (48–56 s).**
   - The progress bar fills to Delivered.
   - "Delivered. This chat stays open for 30 minutes…" appears.
   - A "+30 min" time skip.
   - The chat dims, a lock appears, and the closed note shows.
   - Caption: **"Chat stays open 30 minutes, then closes."**
8. **Or pick it up (56–62 s).**
   - A quick pickup run ends on "Ready! Show code EM-7KQ4P2 at the counter."
   - A fresh, empty chat opens for the next order.
   - Captions: **"Or pick it up. Skip the line."**, then **"Next order? A brand new chat."**
9. **Outro (62–70 s).** The logo on ink with **eneromarso.cafe** below it.
   - Caption: **"Order now at eneromarso.cafe"**
   - End card with three benefits:
     - Organized orders, one chat each.
     - Payments checked before we start.
     - Every order and chat on record.

### Reel: pickup, 9:16 (about 25 s)
Customer side only, on a phone: no split screen, and the staff side is shown at most as a small inset.
1. **Hook (3 s):** the logo. Caption: **"Skip the line at Enero Marso."**
2. **Order (7 s):** "Pickup at Enero Marso Cafe", Spanish Latte (Large), French Fries, "Place order". Caption: **"Order ahead. No app needed."**
3. **Chat (6 s):** "being prepared", "Less ice po, thank you!", "Sure po, noted!" Caption: **"Message the cafe on your order."**
4. **Ready (5 s):** "Ready! Show code EM-7KQ4P2 at the counter." The order bubble floats over the menu. Caption: **"We'll tell you when it's ready."**
5. **CTA (4 s):** the logo and eneromarso.cafe. Caption: **"Order now at eneromarso.cafe"**

### Reel: delivery, 9:16 (about 30 s)
1. **Hook (3 s):** the logo. Caption: **"Enero Marso, delivered."**
2. **Order (7 s):** the pin drops, three items go in, "Send order". Caption: **"Pin your place. Pick your drinks."**
3. **Pay (6 s):** "Confirmed! Pay ₱495", the GCash QR, "I've paid". Caption: **"Pay by GCash, right on the page."**
4. **On its way (7 s):** the chat, "on its way with Lalamove", "Track your rider". Caption: **"Follow your order. Chat with us."**
5. **Delivered (3 s):** Delivered, and the chat stays open 30 minutes. Caption: **"Missing something? We're still here."**
6. **CTA (4 s):** the logo and eneromarso.cafe. Caption: **"Order now at eneromarso.cafe"**

## How we'll work
- **Project:** a `video/` folder in this repo, its own npm project.
  - Each scene goes in its own file, placed with `<Sequence>`.
  - All captions and sample data go in one config file, so text can change without touching the animation code.
- **Order:** we build in this order, with a preview in Remotion Studio and a check-in after each step:
  1. Setup and building blocks.
  2. Shared scenes.
  3. The delivery and pickup scenes.
  4. The three cuts, with vertical layouts and the end card.
  5. Render the three MP4s.

## Before publishing
- **License:** check the Remotion license (remotion.dev/license). It's free for individuals and companies of up to 3 people.
- **Domain:** make sure eneromarso.cafe is live. If it isn't yet, put the current address on the CTA cards.
