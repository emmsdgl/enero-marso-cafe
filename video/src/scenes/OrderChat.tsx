import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, label } from "../brand";
import { ChatBubble, ChatLog } from "../components/Chat";
import { BrowserFrame, PhoneFrame, SiteBar, StaffHeader } from "../components/Frames";
import { useEnter } from "../components/motion";
import { Caption, PushBanner } from "../components/Parts";
import { ComposeBox, TrackCard, TrackTabs, useTyped } from "../components/Screens";
import { delivery, site, stepsDelivery } from "../content";

const chat = delivery.chat;
// When each line arrives (the phone gets it a moment later)
const LINES = [
  { who: "system", text: chat[2].text, at: -40 },
  { who: "system", text: chat[3].text, at: 14 },
  { who: "customer", text: chat[4].text, at: 80, meta: "3:05 PM" },
  { who: "staff", text: chat[5].text, at: 182, meta: "3:06 PM" },
  { who: "system", text: chat[6].text, at: 234 },
  { who: "system", text: chat[7].text, at: 284 },
] as const;
const T = { typeCustomer: 38, typeStaff: 136, out: 284 };

/** Split screen: the customer's Messages tab and the staff phone, the same chat on both (12 s) */
export function OrderChat({ caption }: { caption: string }) {
  const frame = useCurrentFrame();
  const enter = useEnter(0);
  const typedCustomer = useTyped(chat[4].text, T.typeCustomer, 0.75);
  const typedStaff = useTyped(chat[5].text, T.typeStaff, 0.75);
  // Typed into the box, then sent: the box empties as the bubble appears
  const customerTyping = frame < LINES[2].at ? typedCustomer : "";
  const staffTyping = frame < LINES[3].at ? typedStaff : "";
  const progress = interpolate(frame, [14, 30, T.out, T.out + 20], [2, 3, 3, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const onWay = frame >= T.out;
  const status = frame >= T.out ? "Out for delivery" : frame >= LINES[4].at ? "Ready" : "Preparing";
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 40% 30%, #eadac3, ${C.sand} 72%)` }}>
      <div style={{ position: "absolute", left: 80, top: 90, opacity: enter, transform: `translateY(${(1 - enter) * 40}px)` }}>
        <BrowserFrame width={1150} height={900} url={`${site.url}/order/${delivery.code}`}>
          <SiteBar />
          <div style={{ display: "grid", justifyItems: "center", paddingTop: 34 }}>
            <TrackCard code={delivery.code} headline={onWay ? delivery.headlines.out : delivery.headlines.preparing} steps={stepsDelivery} progress={progress} width={880}>
              <TrackTabs tabs={["Messages", "Your order"]} active="Messages" />
              <ChatLog gap={12} style={{ height: 300, justifyContent: "flex-end", overflow: "hidden" }}>
                {LINES.map((l, i) => (
                  <ChatBubble key={i} at={l.at} text={l.text} side={l.who === "system" ? "system" : l.who === "customer" ? "mine" : "theirs"} meta={"meta" in l ? `${l.who === "customer" ? "You" : "Enero Marso"} · ${l.meta}` : undefined} />
                ))}
              </ChatLog>
              <ComposeBox text={customerTyping} />
            </TrackCard>
          </div>
        </BrowserFrame>
      </div>

      <div style={{ position: "absolute", left: 1330, top: 50, opacity: enter, transform: `translateY(${(1 - enter) * 50}px)` }}>
        <PhoneFrame width={470} height={980}>
          <StaffHeader />
          <div style={{ position: "absolute", top: 170, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", background: C.cream, fontFamily: FONT }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: C.cream, borderBottom: `1px solid ${C.line}` }}>
              <b style={{ fontSize: 22, letterSpacing: "0.06em" }}>{delivery.code}</b>
              <span style={{ padding: "5px 12px", borderRadius: 999, fontSize: 14, fontWeight: 700, background: C.okBg, color: C.okText }}>{status}</span>
            </div>
            <span style={{ padding: "14px 20px 0", ...label(12, C.brown), letterSpacing: "0.2em" }}>Chat with Bea</span>
            <ChatLog gap={12} style={{ flex: 1, justifyContent: "flex-end", overflow: "hidden", padding: "12px 18px" }}>
              {LINES.map((l, i) => (
                <ChatBubble key={i} at={l.at + 4} text={l.text} side={l.who === "system" ? "system" : l.who === "staff" ? "mine" : "theirs"} meta={"meta" in l ? `${l.who === "staff" ? "You" : "Bea"} · ${l.meta}` : undefined} scale={0.92} />
              ))}
            </ChatLog>
            <div style={{ padding: "0 14px 24px" }}>
              <ComposeBox text={staffTyping} placeholder="Message Bea…" />
            </div>
          </div>
          <PushBanner title={`New message on ${delivery.code}`} body={chat[4].text} at={LINES[2].at + 6} out={LINES[2].at + 54} top={52} />
        </PhoneFrame>
      </div>
      <Caption text={caption} at={20} out={344} style={{ left: 120, bottom: 54 }} />
    </AbsoluteFill>
  );
}

