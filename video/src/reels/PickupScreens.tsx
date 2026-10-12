import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, EASE, FONT, label, SCRIPT } from "../brand";
import { ChatBubble, ChatLog } from "../components/Chat";
import { CupIcon, PinIcon } from "../components/Icons";
import { useEnter } from "../components/motion";
import { TapRipple } from "../components/Parts";
import { ComposeBox, useSwap, useTyped } from "../components/Screens";
import { bubble, customer, emptyChat, menuRows, pickup, pickupCheckout, site, snacks, stepsPickup } from "../content";
import {
  ADD_BUTTON_X, Chips, DrinkOptions, DrinkRow, Legend, MainCard, menuAt, OPT_ADD, OPT_SIZE_Y, OPTIONS, ROW, ROW_BUTTON_X, SetupRow, sizeChipX, Slip, slipButtonY, SnackRow,
} from "./Checkout";
import { BAR, CheckoutBar, CustomerScreen, PhoneField, PhoneTitle, PhoneTrack, SCREEN, SlipRow, TOP } from "./Phone";

// The pickup checkout's column: the menu section starts 89 into the card (463 tall when no drink is open), the slip right under it
const MENU = menuAt(89);
const LIST = 96 + MENU.list;
const SLIP = { top: 96 + 463 + 26, h: 470 };
const SCROLL = SLIP.top - 14;
const LATTE = 2; // Spanish Latte's row
const T1 = { open: 30, large: 52, add: 72, swipe: 98, chip: 124, fries: 150, review: 178, place: 230, page: 238 };

/** The customer orders on the phone: Spanish Latte (Large), French Fries, Review order, Place order (9 s) */
export function PickupCheckout() {
  const frame = useCurrentFrame();
  const open = useEnter(T1.open, 200) - useEnter(T1.add + 12, 200);
  const swipe = interpolate(frame, [T1.swipe, T1.swipe + 18], [0, 1], { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // The drinks fade out, then the snacks fade in, so the two lists never show at once
  const toSnacks = useSwap(T1.chip + 2, 12);
  const drinksOut = Math.min(1, toSnacks * 2);
  const snacksIn = Math.max(0, toSnacks * 2 - 1);
  const scroll = interpolate(frame, [T1.review + 2, T1.review + 26], [0, SCROLL], { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const toPage = useSwap(T1.page, 12);
  const latte = menuRows[LATTE];
  const fries = snacks.rows[0];
  const twoItems = frame >= T1.fries + 2;
  const added = frame >= T1.add + 2;
  const y = (columnY: number) => TOP + columnY;
  return (
    <AbsoluteFill>
      <CustomerScreen>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-scroll}px)`, opacity: 1 - toPage }}>
          <PhoneTitle />
          <MainCard>
            <SetupRow how="pickup" when={pickupCheckout.when} />
            <div style={{ padding: "16px 18px 18px" }}>
              <Legend>Menu</Legend>
              <div style={{ marginTop: 12 }}><Chips active={frame >= T1.chip + 2 ? snacks.section : "Caffeinated"} swipe={swipe} /></div>
              <div style={{ position: "relative", marginTop: 10, height: 16 }}>
                <span style={{ position: "absolute", ...label(11, C.cocoa), letterSpacing: "0.1em", fontWeight: 600, opacity: 1 - drinksOut }}>Hot or iced</span>
                <span style={{ position: "absolute", fontSize: 13, color: C.cocoa, opacity: snacksIn }}>{snacks.note}</span>
              </div>
              {/* The drinks list grows while a drink is open; the snacks list takes its place once the chip is tapped */}
              <div style={{ position: "relative", marginTop: 8 }}>
                <div style={{ borderTop: `1px solid ${C.ink}`, opacity: 1 - drinksOut }}>
                  {menuRows.map((r, i) => (
                    <div key={r.name}>
                      <DrinkRow name={r.name} from={r.sizes[0][1]} open={i === LATTE ? open : 0} />
                      {i === LATTE && <DrinkOptions sizes={latte.sizes} chosen={frame >= T1.large ? 2 : 0} open={open} />}
                    </div>
                  ))}
                </div>
                <div style={{ position: "absolute", inset: 0, borderTop: `1px solid ${C.ink}`, opacity: snacksIn }}>
                  {snacks.rows.map((r, i) => <SnackRow key={r.name} name={r.name} note={r.note} price={r.price} pressed={i === 0 && frame >= T1.fries && frame < T1.fries + 8} />)}
                </div>
              </div>
            </div>
          </MainCard>
          {/* Under the card, so it moves down while a drink is open */}
          <Slip top={SLIP.top + OPTIONS * Math.max(0, open)} height={SLIP.h} button={added ? "Place order" : "Add an item to order"} pressed={frame >= T1.place} off={!added}>
            <span style={{ display: "grid", fontSize: 15, lineHeight: 1.3 }}>
              Pickup at {site.cafe}
              <small style={{ fontSize: 13, color: C.cocoa }}>Western Bicutan, Taguig</small>
            </span>
            <div style={{ borderTop: `1px solid ${C.ink}` }}>
              {!added && <p style={{ margin: "12px 0 0", fontSize: 14, color: C.cocoa }}>Nothing yet. Choose a drink or a dish, then tap Add.</p>}
              <SlipRow name={latte.name} detail="Large" price={pickup.items[0].price} at={T1.add + 2} />
              <SlipRow name={fries.name} price={fries.price} at={T1.fries + 2} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
              <PhoneField name="Name" value={customer.name} />
              <PhoneField name="Mobile number" value={customer.phone} />
            </div>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.4, color: C.cocoa }}>{pickupCheckout.pay}</p>
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 10, borderTop: `2px solid ${C.ink}` }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>Total</span>
              <b style={{ fontSize: 21 }}>₱{twoItems ? pickup.total : added ? pickup.items[0].price : 0}</b>
            </div>
          </Slip>
        </div>
        {toPage > 0 && (
          <div style={{ position: "absolute", inset: 0, opacity: toPage }}>
            <PhoneTrack code={pickup.code} headline={pickup.headlines.sent} steps={stepsPickup} progress={1} tabs={["Messages", "Your order"]} active="Messages">
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: C.cocoa }}>{emptyChat}</p>
              <div style={{ marginTop: "auto" }}><ComposeBox text="" /></div>
            </PhoneTrack>
          </div>
        )}
      </CustomerScreen>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - toPage }}>
        <CheckoutBar text={twoItems ? `2 items · ₱${pickup.total}` : `1 item · ₱${latte.sizes[2][1]}`} at={T1.add + 2} bump={T1.fries + 2} />
      </div>
      <TapRipple x={ROW_BUTTON_X} y={y(LIST + LATTE * ROW + ROW / 2)} at={T1.open} />
      <TapRipple x={sizeChipX(2)} y={y(LIST + (LATTE + 1) * ROW + OPT_SIZE_Y)} at={T1.large} />
      <TapRipple x={OPT_ADD.x} y={y(LIST + (LATTE + 1) * ROW + OPT_ADD.y)} at={T1.add} />
      <TapRipple x={SCREEN.w - 14 - 3 - 18 - 56} y={y(96 + MENU.chips + 17)} at={T1.chip} />
      <TapRipple x={ADD_BUTTON_X} y={y(LIST + ROW / 2)} at={T1.fries} />
      <TapRipple x={BAR.x} y={BAR.y} at={T1.review} />
      <TapRipple x={SCREEN.w / 2} y={y(SLIP.top + slipButtonY(SLIP.h)) - SCROLL} at={T1.place} />
    </AbsoluteFill>
  );
}

/** The order page's chat on the phone: Bea asks for less ice, the cafe answers (6 s) */
export function PickupChat() {
  const frame = useCurrentFrame();
  const chat = pickup.chat;
  const T = { prepared: 8, type: 22, sent: 62, reply: 108 };
  const typed = useTyped(chat[2].text, T.type, 0.8);
  return (
    <CustomerScreen>
      <PhoneTrack code={pickup.code} headline={pickup.headlines.preparing} steps={stepsPickup} progress={3} tabs={["Messages", "Your order"]} active="Messages">
        <ChatLog gap={10} style={{ flex: 1, minHeight: 0, justifyContent: "flex-end", overflow: "hidden" }}>
          <ChatBubble side="system" text={chat[0].text} at={-60} scale={0.88} />
          <ChatBubble side="system" text={chat[1].text} at={T.prepared} scale={0.88} />
          <ChatBubble side="mine" text={chat[2].text} meta="You · 2:38 PM" at={T.sent} scale={0.88} />
          <ChatBubble side="theirs" text={chat[3].text} meta="Enero Marso · 2:39 PM" at={T.reply} scale={0.88} />
        </ChatLog>
        <ComposeBox text={frame < T.sent ? typed : ""} />
      </PhoneTrack>
    </CustomerScreen>
  );
}

/** Back on the site's front page: the order bubble at the top turns "Ready for pickup"; a tap opens the order (6 s) */
export function PickupReady() {
  const frame = useCurrentFrame();
  const T = { ready: 36, tap: 84, page: 90, line: 100 };
  const toPage = useSwap(T.page, 12);
  const code = useEnter(T.page + 10, 12);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - toPage }}>
        <Landing />
        <PhoneBubble code={pickup.code} status={frame >= T.ready ? bubble.ready : bubble.preparing} changeAt={T.ready} unread={frame >= T.ready ? 1 : 0} />
      </AbsoluteFill>
      {toPage > 0 && (
        <AbsoluteFill style={{ opacity: toPage }}>
          <CustomerScreen>
            <PhoneTrack code={pickup.code} headline={pickup.headlines.ready} steps={stepsPickup} progress={4} tabs={["Messages", "Your order"]} active="Messages">
              <span style={{ alignSelf: "center", padding: "12px 26px", border: `2px dashed ${C.brown}`, fontSize: 30, fontWeight: 700, letterSpacing: "0.14em", opacity: code, transform: `scale(${interpolate(code, [0, 1], [0.9, 1])})` }}>
                {pickup.code}
              </span>
              <ChatLog gap={10} style={{ flex: 1, minHeight: 0, justifyContent: "flex-end", overflow: "hidden" }}>
                <ChatBubble side="mine" text={pickup.chat[2].text} meta="You · 2:38 PM" at={-60} scale={0.88} />
                <ChatBubble side="theirs" text={pickup.chat[3].text} meta="Enero Marso · 2:39 PM" at={-60} scale={0.88} />
                <ChatBubble side="system" text={pickup.chat[4].text} at={T.line} scale={0.88} />
              </ChatLog>
              <ComposeBox text="" />
            </PhoneTrack>
          </CustomerScreen>
        </AbsoluteFill>
      )}
      <TapRipple x={BUBBLE_TAP.x} y={BUBBLE_TAP.y} at={T.tap} />
    </AbsoluteFill>
  );
}

/** The site's front page on a phone (web/src/app/page.tsx): the cups photo, the monogram, the two links at the bottom */
function Landing() {
  return (
    <AbsoluteFill style={{ background: C.ink, color: C.cream, fontFamily: FONT }}>
      <Img src={staticFile("photos/landing-cups.jpg")} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "55% 45%" }} />
      <AbsoluteFill style={{ background: "radial-gradient(75% 70% at 50% 48%, rgba(21, 18, 17, 0.5), rgba(21, 18, 17, 0.85))" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 20px" }}>
        <Img src={staticFile("brand/enero-marso-monogram-gold.png")} style={{ width: 66, marginBottom: 26 }} />
        <h1 style={{ margin: "0 -0.1em 0 0", fontWeight: 500, fontSize: 37, lineHeight: 1, letterSpacing: "0.1em", textTransform: "uppercase" }}>{site.cafe}</h1>
        <p style={{ margin: "12px 0 40px", fontFamily: SCRIPT, fontSize: 31, lineHeight: 1.1, color: C.gold }}>{site.tagline}</p>
        <span style={{ padding: "17px 32px", border: `1px solid ${C.cream}`, ...label(14, C.cream), fontWeight: 600 }}>Order here</span>
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 20, bottom: 54, maxWidth: 220, display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", lineHeight: 1.6 }}>
        <span style={{ color: C.gold, marginTop: 2 }}><PinIcon size={20} /></span>
        <span><b style={{ display: "block", fontWeight: 600, color: C.gold }}>Visit us</b>{site.visit}</span>
      </div>
      <span style={{ position: "absolute", right: 20, bottom: 58, fontWeight: 600, fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>Enter the cafe ›</span>
    </AbsoluteFill>
  );
}

// On the front page the bubble floats at the top right (it would cover the page's own links at the bottom)
const BUBBLE = { right: 16, top: 66 };
const BUBBLE_TAP = { x: SCREEN.w - BUBBLE.right - 190, y: BUBBLE.top + 28 };

/** The floating "Your order" bubble at phone size, as the site draws it (.order-bubble) */
function PhoneBubble({ code, status, changeAt, unread }: { code: string; status: string; changeAt: number; unread: number }) {
  const ping = useEnter(changeAt, 12) - useEnter(changeAt + 8, 12);
  const needsYou = unread > 0;
  return (
    <div
      style={{
        position: "absolute", zIndex: 30, right: BUBBLE.right, top: BUBBLE.top, display: "flex", alignItems: "center", borderRadius: 999,
        border: "1px solid rgba(207, 157, 87, 0.45)", background: C.ink, color: C.cream, fontFamily: FONT,
        boxShadow: "0 16px 32px -16px rgba(21, 18, 17, 0.75)", transform: `scale(${1 + ping * 0.05})`, transformOrigin: "100% 50%",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 4px 6px 6px" }}>
        <span style={{ position: "relative", width: 44, height: 44, borderRadius: 22, background: C.gold, color: C.ink, display: "grid", placeItems: "center", boxShadow: needsYou ? `0 0 0 2px ${C.ink}, 0 0 0 4px ${C.cream}` : undefined }}>
          <CupIcon size={24} />
          {unread > 0 && <b style={{ position: "absolute", top: -6, right: -6, minWidth: 21, height: 21, boxSizing: "border-box", padding: "0 5px", borderRadius: 999, border: `2px solid ${C.ink}`, background: C.brown, color: C.cream, fontSize: 11, display: "grid", placeItems: "center" }}>{unread}</b>}
        </span>
        <span style={{ display: "grid" }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: C.card, whiteSpace: "nowrap" }}>Your order <b style={{ color: C.gold, letterSpacing: "0.08em" }}>{code}</b></span>
          <span style={{ fontWeight: 600, fontSize: 15, lineHeight: 1.3 }}>{status}</span>
        </span>
      </span>
      <span style={{ width: 44, alignSelf: "stretch", display: "grid", placeItems: "center", color: C.card }}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M6 12h12" /></svg>
      </span>
    </div>
  );
}
