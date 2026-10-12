import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, label } from "../brand";
import { ChatBubble, ChatLog } from "../components/Chat";
import { BrowserFrame, PhoneFrame, SiteBar, StaffHeader } from "../components/Frames";
import { Caption, PushBanner, StepsBar, TapRipple } from "../components/Parts";
import { captions, delivery, stepsDelivery } from "../content";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Preview of the building blocks working together: the website in a browser, the staff app on a phone */
export function ScreensPreview() {
  const frame = useCurrentFrame();
  const chat = delivery.chat;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 30% 25%, #eadac3, ${C.sand} 70%)`, fontFamily: FONT }}>
      <BrowserFrame width={1120} height={800} style={{ position: "absolute", left: 90, top: 110 }}>
        <SiteBar />
        <div style={{ padding: "34px 0", display: "grid", justifyItems: "center" }}>
          <article style={{ width: 760, display: "grid", gap: 22, padding: "30px 36px", background: C.cream, border: `3px solid ${C.ink}`, outline: `1px solid ${C.ink}`, outlineOffset: 6 }}>
            <div>
              <p style={{ margin: 0, ...label(13, C.cocoa), letterSpacing: "0.22em", fontWeight: 600 }}>
                Order <b style={{ marginLeft: 6, fontSize: 19, letterSpacing: "0.12em", color: C.ink }}>{delivery.code}</b>
              </p>
              <h1 style={{ margin: "8px 0 0", fontSize: 38, fontWeight: 700, color: C.brown }}>{delivery.headlines.out}</h1>
            </div>
            <StepsBar steps={stepsDelivery} progress={interpolate(frame, [20, 70], [3, 4], clamp)} />
            <div style={{ display: "flex", borderBottom: `2px solid ${C.ink}` }}>
              {["Messages", "Your order"].map((t) => (
                <span key={t} style={{ flex: 1, textAlign: "center", padding: "14px 0", ...label(13, t === "Messages" ? C.ink : C.cocoa), letterSpacing: "0.18em", boxShadow: t === "Messages" ? `inset 0 -5px 0 ${C.gold}` : undefined }}>{t}</span>
              ))}
            </div>
            <ChatLog gap={12} style={{ minHeight: 250 }}>
              <ChatBubble side="system" text={chat[3].text} at={30} />
              <ChatBubble side="mine" text={chat[4].text} meta="You · 3:05 PM" at={60} />
              <ChatBubble side="theirs" text={chat[5].text} meta="Enero Marso · 3:05 PM" at={95} />
              <ChatBubble side="system" text={chat[7].text} at={130} />
            </ChatLog>
          </article>
        </div>
      </BrowserFrame>

      <PhoneFrame style={{ position: "absolute", left: 1350, top: 90 }}>
        <StaffHeader />
        <div style={{ padding: 16, display: "grid", gap: 12 }}>
          <span style={{ ...label(13, C.cocoa), letterSpacing: "0.16em" }}>New · 1</span>
          <div style={{ padding: 18, borderRadius: 14, background: C.cream, border: `1px solid ${C.line}`, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 22, letterSpacing: "0.06em" }}>{delivery.code}</b>
              <span style={{ padding: "4px 12px", borderRadius: 999, background: C.okBg, color: C.okText, fontSize: 14, fontWeight: 700 }}>New</span>
            </div>
            <span style={{ fontSize: 16, color: C.cocoa }}>Delivery {delivery.distance} · As soon as possible</span>
            <span style={{ fontSize: 16, color: C.cocoa }}>{delivery.items.length} items · ₱{delivery.subtotal}</span>
            <span style={{ marginTop: 6, padding: "13px 0", borderRadius: 10, background: C.brown, color: C.cream, textAlign: "center", fontWeight: 700, fontSize: 16 }}>Confirm and send fee</span>
          </div>
        </div>
        <PushBanner title={delivery.push.order.title} body={delivery.push.order.body} at={15} out={75} top={52} />
        <TapRipple x={210} y={110} at={62} />
      </PhoneFrame>

      <Caption text={captions.pitch.chat} at={25} style={{ left: 150, bottom: 70 }} />
    </AbsoluteFill>
  );
}
