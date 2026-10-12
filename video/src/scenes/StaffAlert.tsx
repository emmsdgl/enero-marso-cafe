import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, label } from "../brand";
import { PhoneFrame, StaffHeader } from "../components/Frames";
import { CheckIcon } from "../components/Icons";
import { useEnter } from "../components/motion";
import { Caption, PushBanner, TapRipple } from "../components/Parts";
import { useTyped } from "../components/Screens";
import { customer, delivery, staffButtons } from "../content";

const PHONE = { x: 1180, y: 50, w: 470, h: 980 };
const HEADER = 170; // the staff app's header, on this phone
const BUTTON_Y = PHONE.h - 24 - 24 - 27; // the fee button's middle, inside the screen
const T = { push: 18, tap: 66, detail: 78, fee: 112, confirm: 150 };

/** The staff phone: "New order" arrives, a tap opens it, staff type the delivery fee and send it (6 s) */
export function StaffAlert({ caption }: { caption: string }) {
  const frame = useCurrentFrame();
  const enter = useEnter(0);
  const detail = useEnter(T.detail, 200);
  const fee = useTyped("50", T.fee, 0.12);
  const sent = frame >= T.confirm + 6;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 35%, #eadac3, ${C.sand} 72%)` }}>
      <div style={{ position: "absolute", left: PHONE.x, top: PHONE.y, opacity: enter, transform: `translateY(${(1 - enter) * 50}px)` }}>
        <PhoneFrame width={PHONE.w} height={PHONE.h}>
          <StaffHeader />
          <div style={{ padding: 18, display: "grid", gap: 12, fontFamily: FONT }}>
            <span style={{ ...label(13, C.cocoa), letterSpacing: "0.16em" }}>New · 0</span>
            <div style={{ padding: 22, borderRadius: 14, border: `1.5px dashed rgba(21, 18, 17, 0.3)`, color: C.cocoa, fontSize: 16 }}>No new orders right now.</div>
          </div>

          <div style={{ position: "absolute", top: HEADER, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", gap: 14, padding: "18px 20px 24px", background: C.sand, fontFamily: FONT, transform: `translateX(${(1 - detail) * 100}%)` }}>
            <span style={{ fontSize: 15, color: C.cocoa }}>‹ Orders</span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 28, letterSpacing: "0.06em" }}>{delivery.code}</b>
              <span style={{ padding: "5px 12px", borderRadius: 999, fontSize: 14, fontWeight: 700, background: sent ? "#f7e7cf" : C.okBg, color: sent ? "#5c3a0d" : C.okText }}>{sent ? "Awaiting payment" : "New"}</span>
            </div>
            <div style={{ display: "grid", gap: 4, fontSize: 16, color: C.cocoa }}>
              <span>Delivery · {delivery.distance} · As soon as possible</span>
              <span>{customer.name} · {customer.phone}</span>
              <span>{delivery.address}</span>
            </div>
            <div style={{ borderTop: `1px solid ${C.ink}` }}>
              {delivery.items.map((i) => (
                <Line key={i.name} left={<>{i.name}{i.size && <small style={{ display: "block", fontSize: 13, color: C.cocoa }}>{i.size}</small>}</>} right={`₱${i.price}`} />
              ))}
              <Line left={<b>Items</b>} right={<b>₱{delivery.subtotal}</b>} />
            </div>
            <div style={{ marginTop: "auto", display: "grid", gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Delivery fee</span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "12px 14px", border: `1.5px solid ${C.ink}`, borderRadius: 10, background: C.paper, fontSize: 20, fontWeight: 600 }}>
                ₱ {fee || <span style={{ color: "#9a8270", fontWeight: 500 }}>0</span>}
              </span>
              <span style={{ height: 54, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 10, background: sent ? C.ink : C.brown, color: C.cream, fontWeight: 700, fontSize: 17 }}>
                {sent ? <><CheckIcon size={20} /> Fee sent to Bea</> : staffButtons.delivery.fee}
              </span>
            </div>
          </div>

          <PushBanner title={delivery.push.order.title} body={delivery.push.order.body} at={T.push} out={T.tap + 8} top={52} />
          <TapRipple x={PHONE.w / 2 - 12} y={112} at={T.tap} />
          <TapRipple x={PHONE.w / 2 - 12} y={BUTTON_Y} at={T.confirm} />
        </PhoneFrame>
      </div>
      <Caption text={caption} at={20} out={168} style={{ left: 120, bottom: 70 }} />
    </AbsoluteFill>
  );
}

const Line = ({ left, right }: { left: ReactNode; right: ReactNode }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(21, 18, 17, 0.18)", fontSize: 16 }}>
    <span>{left}</span>
    <span style={{ fontWeight: 600 }}>{right}</span>
  </div>
);
