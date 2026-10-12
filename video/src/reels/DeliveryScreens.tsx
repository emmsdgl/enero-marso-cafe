import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, EASE, label, SCRIPT } from "../brand";
import { ChatBubble, ChatLog } from "../components/Chat";
import { useEnter } from "../components/motion";
import { MiniMap, QrCode, TapRipple } from "../components/Parts";
import { ComposeBox, useSwap, useTyped } from "../components/Screens";
import { customer, delivery, payPanel, site, snacks, stepsDelivery } from "../content";
import { ADD_BUTTON_X, Chips, Legend, MainCard, MAINCARD, menuAt, PAD, ROW, SetupRow, Slip, slipButtonY, SnackRow } from "./Checkout";
import { BAR, BODY, CheckoutBar, CustomerScreen, PhoneField, PhoneTitle, PhoneTrack, SCREEN, SlipRow, TOP } from "./Phone";

/*
 * The delivery checkout's column. Inside the card: the "Deliver to" section from 89 (map at +44, 200 tall),
 * the menu section from 569, the slip under the card.
 */
const DELIVER = 89;
const MAP = { top: 96 + DELIVER + 44, w: MAINCARD.w - 6 - PAD * 2, h: 200 };
const MENU = menuAt(569);
const LIST = 96 + MENU.list;
const SLIP = { top: 1065, h: 640 };
const SCROLLS = { menu: 96 + 569, map: 96 + DELIVER - 6, slip: SLIP.top - 14 };
const NUGGETS = 2; // Chicken Nuggets with Fries' row
const T1 = { nuggets: 20, toMap: 38, pin: 70, reach: 84, type: 92, landmark: 152, review: 166, send: 222, page: 230 };

/** Delivery checkout on the phone: the last item goes in, a pin on the map, the address, then Send order (9 s) */
export function DeliveryCheckout() {
  const frame = useCurrentFrame();
  const scroll = interpolate(
    frame,
    [T1.toMap, T1.toMap + 24, T1.review + 2, T1.review + 26],
    [SCROLLS.menu, SCROLLS.map, SCROLLS.map, SCROLLS.slip],
    { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const reach = useEnter(T1.reach, 200);
  const address = useTyped(delivery.address, T1.type, 0.6);
  const toPage = useSwap(T1.page, 12);
  const three = frame >= T1.nuggets + 2;
  const y = (columnY: number) => TOP + columnY;
  return (
    <AbsoluteFill>
      <CustomerScreen>
        <div style={{ position: "absolute", inset: 0, transform: `translateY(${-scroll}px)`, opacity: 1 - toPage }}>
          <PhoneTitle />
          <MainCard>
            <SetupRow how="delivery" when="As soon as possible" />
            <div style={{ height: 478, boxSizing: "border-box", padding: "16px 18px 18px", display: "flex", flexDirection: "column" }}>
              <Legend>Deliver to</Legend>
              <div style={{ marginTop: 12 }}><MiniMap width={MAP.w} height={MAP.h} at={T1.pin} /></div>
              <p style={{ margin: "12px 0 0", minHeight: 58, boxSizing: "border-box", padding: "10px 12px", background: "#e6efe2", color: C.okText, fontSize: 13.5, lineHeight: 1.4, fontWeight: 500, opacity: reach, transform: `translateY(${(1 - reach) * 8}px)` }}>{delivery.reach}</p>
              <PhoneField name="Address" hint="house or unit, street, barangay" value={address || " "} style={{ marginTop: 12 }} />
              <PhoneField name="Landmark" hint="optional" value={frame >= T1.landmark ? "Blue gate" : " "} style={{ marginTop: 10 }} />
            </div>
            <div style={{ borderTop: `2px solid ${C.ink}`, padding: "16px 18px 18px" }}>
              <Legend>Menu</Legend>
              <div style={{ marginTop: 12 }}><Chips active={snacks.section} swipe={1} /></div>
              <div style={{ marginTop: 10, height: 16, fontSize: 13, color: C.cocoa }}>{snacks.note}</div>
              <div style={{ marginTop: 8, height: ROW * 4 + 1, borderTop: `1px solid ${C.ink}` }}>
                {snacks.rows.map((r, i) => <SnackRow key={r.name} name={r.name} note={r.note} price={r.price} pressed={i === NUGGETS && frame >= T1.nuggets && frame < T1.nuggets + 8} />)}
              </div>
            </div>
          </MainCard>
          <Slip top={SLIP.top} height={SLIP.h} button="Send order" pressed={frame >= T1.send}>
            <span style={{ display: "grid", fontSize: 15, lineHeight: 1.3 }}>
              Delivery from {site.cafe}
              <small style={{ fontSize: 13, color: C.cocoa }}>{delivery.address}</small>
            </span>
            <div style={{ borderTop: `1px solid ${C.ink}` }}>
              {delivery.items.map((it, i) => <SlipRow key={it.name} name={it.name} detail={it.size} price={it.price} at={i === NUGGETS ? T1.nuggets + 2 : -100} />)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 10 }}>
              <PhoneField name="Name" value={customer.name} />
              <PhoneField name="Mobile number" value={customer.phone} />
            </div>
            <p style={{ margin: 0, display: "flex", justifyContent: "space-between", fontSize: 14 }}><span>Delivery</span><b>Confirmed by the cafe</b></p>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: C.cocoa }}>Pay by GCash, Maya or bank transfer once the cafe confirms your order and the delivery fee.</p>
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 10, borderTop: `2px solid ${C.ink}` }}>
              <span style={{ fontWeight: 600, fontSize: 16 }}>Items</span>
              <b style={{ fontSize: 21 }}>₱{delivery.subtotal}</b>
            </div>
          </Slip>
        </div>
        {toPage > 0 && (
          <div style={{ position: "absolute", inset: 0, opacity: toPage }}>
            <PhoneTrack code={delivery.code} headline={delivery.headlines.sent} steps={stepsDelivery} progress={1} tabs={["Messages", "Your order"]} active="Your order">
              <Fact term="Deliver to">{delivery.address}</Fact>
              <Fact term="Items">{delivery.items.length} items · ₱{delivery.subtotal}</Fact>
              <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: 1.5, color: C.cocoa }}>You&rsquo;ll pay by GCash, Maya or bank transfer once the cafe confirms the delivery fee. Nothing to pay yet.</p>
            </PhoneTrack>
          </div>
        )}
      </CustomerScreen>
      <div style={{ position: "absolute", inset: 0, opacity: 1 - toPage }}>
        <CheckoutBar text={three ? `3 items · ₱${delivery.subtotal}` : `2 items · ₱${delivery.items[0].price + delivery.items[1].price}`} at={-30} bump={T1.nuggets + 2} />
      </div>
      <TapRipple x={ADD_BUTTON_X} y={y(LIST + NUGGETS * ROW + ROW / 2) - SCROLLS.menu} at={T1.nuggets} />
      <TapRipple x={MAINCARD.x + 3 + PAD + MAP.w * 0.68} y={y(MAP.top + MAP.h * 0.34 + 18) - SCROLLS.map} at={T1.pin} />
      <TapRipple x={BAR.x} y={BAR.y} at={T1.review} />
      <TapRipple x={SCREEN.w / 2} y={y(SLIP.top + slipButtonY(SLIP.h)) - SCROLLS.slip} at={T1.send} />
    </AbsoluteFill>
  );
}

const Fact = ({ term, children }: { term: string; children: React.ReactNode }) => (
  <div style={{ display: "grid", gap: 2, paddingBottom: 10, borderBottom: "1px solid rgba(21, 18, 17, 0.18)" }}>
    <span style={{ ...label(11), letterSpacing: "0.18em" }}>{term}</span>
    <span style={{ fontSize: 16, fontWeight: 500 }}>{children}</span>
  </div>
);

/** The Pay tab: QR, the reference typed in, "I've paid"; then the cafe accepts and the chat shows it (6 s) */
export function DeliveryPay() {
  const frame = useCurrentFrame();
  const T = { type: 24, paid: 74, accepted: 124 };
  const ref = useTyped(delivery.gcashRef, T.type, 0.4);
  const sent = frame >= T.paid + 2;
  const accepted = frame >= T.accepted;
  const toChat = useSwap(T.accepted, 18);
  const pressing = frame >= T.paid && frame < T.paid + 6;
  const progress = interpolate(frame, [T.accepted, T.accepted + 20], [2, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <CustomerScreen>
        <PhoneTrack
          code={delivery.code}
          headline={accepted ? delivery.headlines.accepted : sent ? delivery.headlines.paid : delivery.headlines.pay}
          steps={stepsDelivery}
          progress={progress}
          tabs={accepted ? ["Messages", "Your order"] : ["Pay", "Messages", "Your order"]}
          active={accepted ? "Messages" : "Pay"}
        >
          <div style={{ position: "relative", flex: 1 }}>
            <section
              style={{
                position: "absolute", inset: 0, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 10, padding: 14,
                border: `2px solid ${sent ? C.gold : C.brown}`, background: sent ? "#fbf3e4" : C.paper, opacity: 1 - Math.min(1, toChat * 2),
              }}
            >
              <span style={{ fontFamily: SCRIPT, fontSize: 42, lineHeight: 1, color: C.brown }}>Pay ₱{delivery.total}</span>
              {sent ? (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.4 }}><b>{payPanel.sent}.</b> {payPanel.checking}</p>
              ) : (
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4 }}>{payPanel.how}</p>
              )}
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", opacity: sent ? 0.45 : 1 }}>
                <QrCode size={108} />
                <div style={{ flex: 1, display: "grid", gap: 8 }}>
                  <span style={{ display: "grid", gap: 1 }}>
                    <span style={label(10)}>Pay to</span>
                    <b style={{ fontSize: 15 }}>{delivery.account.label}</b>
                    <span style={{ fontSize: 12.5, lineHeight: 1.35, color: C.cocoa }}>{delivery.account.name} · {delivery.account.number}</span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={label(10)}>Amount</span>
                    <b style={{ fontSize: 16 }}>₱{delivery.total}</b>
                    <span style={{ padding: "3px 10px", borderRadius: 999, border: `1.5px solid ${C.ink}`, fontSize: 12, fontWeight: 600 }}>Copy</span>
                  </span>
                </div>
              </div>
              <PhoneField name="Reference number" hint="from your receipt" value={ref || " "} style={{ opacity: sent ? 0.45 : 1 }} />
              <span style={{ marginTop: "auto", flex: "none", height: 44, display: "grid", placeItems: "center", borderRadius: 999, background: pressing || sent ? C.ink : C.brown, transform: `scale(${pressing ? 0.97 : 1})`, ...label(13, C.cream), letterSpacing: "0.14em" }}>
                {sent ? "Sent" : "I've paid"}
              </span>
            </section>
            {toChat > 0.5 && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 12, opacity: toChat * 2 - 1 }}>
                <ChatLog gap={10} style={{ flex: 1, minHeight: 0, justifyContent: "flex-end", overflow: "hidden" }}>
                  <ChatBubble side="system" text={delivery.chat[0].text} at={-60} scale={0.88} />
                  <ChatBubble side="system" text={delivery.chat[1].text} at={-60} scale={0.88} />
                  <ChatBubble side="system" text={delivery.chat[2].text} at={T.accepted + 10} scale={0.88} />
                </ChatLog>
                <ComposeBox text="" />
              </div>
            )}
          </div>
        </PhoneTrack>
      </CustomerScreen>
      {/* "I've paid" sits at the bottom of the card's body */}
      <TapRipple x={SCREEN.w / 2} y={BODY.y + BODY.h - 2 - 14 - 22} at={T.paid} />
    </AbsoluteFill>
  );
}

/** Messages while it's made and sent out: less ice, the cafe's reply, then on its way with Track your rider (7 s) */
export function DeliveryOnWay() {
  const frame = useCurrentFrame();
  const chat = delivery.chat;
  const T = { type: 16, sent: 54, reply: 96, ready: 132, out: 160 };
  const typed = useTyped(chat[4].text, T.type, 0.8);
  const out = frame >= T.out;
  const rider = useEnter(T.out + 6, 18);
  const progress = interpolate(frame, [T.out, T.out + 20], [3, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <CustomerScreen>
      <PhoneTrack
        code={delivery.code}
        headline={out ? delivery.headlines.out : delivery.headlines.preparing}
        under={out && (
          <span style={{ display: "inline-flex", marginTop: 8, padding: "9px 16px", borderRadius: 999, background: C.brown, ...label(11, C.cream), letterSpacing: "0.14em", opacity: rider, transform: `translateY(${(1 - rider) * 8}px)` }}>
            Track your rider
          </span>
        )}
        steps={stepsDelivery}
        progress={progress}
        tabs={["Messages", "Your order"]}
        active="Messages"
      >
        <ChatLog gap={10} style={{ flex: 1, minHeight: 0, justifyContent: "flex-end", overflow: "hidden" }}>
          <ChatBubble side="system" text={chat[2].text} at={-60} scale={0.88} />
          <ChatBubble side="system" text={chat[3].text} at={-60} scale={0.88} />
          <ChatBubble side="mine" text={chat[4].text} meta="You · 3:05 PM" at={T.sent} scale={0.88} />
          <ChatBubble side="theirs" text={chat[5].text} meta="Enero Marso · 3:06 PM" at={T.reply} scale={0.88} />
          <ChatBubble side="system" text={chat[6].text} at={T.ready} scale={0.88} />
          <ChatBubble side="system" text={chat[7].text} at={T.out} scale={0.88} />
        </ChatLog>
        <ComposeBox text={frame < T.sent ? typed : ""} />
      </PhoneTrack>
    </CustomerScreen>
  );
}

/** Delivered: the bar fills, and the chat says it stays open 30 minutes; the message box glows to show it's still there (4 s) */
export function DeliveryDone() {
  const frame = useCurrentFrame();
  const chat = delivery.chat;
  const T = { delivered: 6, line: 26, glow: 54 };
  const glow = useEnter(T.glow, 20) - useEnter(T.glow + 24, 200);
  const progress = interpolate(frame, [T.delivered, T.delivered + 22], [4, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <CustomerScreen>
      <PhoneTrack code={delivery.code} headline={frame >= T.delivered ? delivery.headlines.done : delivery.headlines.out} steps={stepsDelivery} progress={progress} tabs={["Messages", "Your order"]} active="Messages">
        <ChatLog gap={10} style={{ flex: 1, minHeight: 0, justifyContent: "flex-end", overflow: "hidden" }}>
          <ChatBubble side="mine" text={chat[4].text} meta="You · 3:05 PM" at={-60} scale={0.88} />
          <ChatBubble side="theirs" text={chat[5].text} meta="Enero Marso · 3:06 PM" at={-60} scale={0.88} />
          <ChatBubble side="system" text={chat[7].text} at={-60} scale={0.88} />
          <ChatBubble side="system" text={chat[8].text} at={T.line} scale={0.88} />
        </ChatLog>
        <div style={{ boxShadow: `0 0 0 ${Math.max(0, glow) * 5}px rgba(207, 157, 87, 0.55)` }}>
          <ComposeBox text="" />
        </div>
      </PhoneTrack>
    </CustomerScreen>
  );
}
