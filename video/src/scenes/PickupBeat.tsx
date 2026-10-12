import { AbsoluteFill, interpolate } from "remotion";
import { C, FONT, label } from "../brand";
import { ChatBubble, ChatLog } from "../components/Chat";
import { PhoneFrame, SiteBar } from "../components/Frames";
import { useEnter } from "../components/motion";
import { Caption } from "../components/Parts";
import { ComposeBox, TrackCard, TrackTabs, useSwap } from "../components/Screens";
import { emptyChat, nextOrder, pickup, stepsPickup } from "../content";

const T = { next: 96 };

/** Pickup on the customer's phone: "Ready! Show code…", then a new order opens with a fresh, empty chat (6 s) */
export function PickupBeat({ first, second }: { first: string; second: string }) {
  const enter = useEnter(0);
  const next = useSwap(T.next, 16);
  const code = useEnter(20, 12);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 60% 35%, #eadac3, ${C.sand} 72%)` }}>
      <div style={{ position: "absolute", left: 1180, top: 50, opacity: enter, transform: `translateY(${(1 - enter) * 50}px)` }}>
        <PhoneFrame width={470} height={980}>
          <div style={{ paddingTop: 50, background: C.ink }}><SiteBar height={70} /></div>
          <div style={{ position: "absolute", top: 120, left: 0, right: 0, bottom: 0, padding: "22px 14px", fontFamily: FONT }}>
            <div style={{ position: "absolute", inset: "22px 14px", opacity: 1 - next }}>
              <TrackCard code={pickup.code} headline={pickup.headlines.ready} steps={stepsPickup} progress={4} width={418} style={{ padding: "24px 22px", gap: 18 }}>
                <span style={{ justifySelf: "center", padding: "16px 30px", border: `2px dashed ${C.brown}`, fontSize: 34, fontWeight: 700, letterSpacing: "0.14em", transform: `scale(${interpolate(code, [0, 1], [0.9, 1])})`, opacity: code }}>
                  {pickup.code}
                </span>
                <TrackTabs tabs={["Messages", "Your order"]} active="Messages" />
                <ChatLog gap={10} style={{ height: 250, justifyContent: "flex-end", overflow: "hidden" }}>
                  <ChatBubble side="mine" text={pickup.chat[2].text} meta="You · 2:41 PM" at={-60} scale={0.9} />
                  <ChatBubble side="theirs" text={pickup.chat[3].text} meta="Enero Marso · 2:41 PM" at={-60} scale={0.9} />
                  <ChatBubble side="system" text={pickup.chat[4].text} at={-60} scale={0.9} />
                </ChatLog>
              </TrackCard>
            </div>
            {next > 0 && (
              <div style={{ position: "absolute", inset: "22px 14px", opacity: next }}>
                <TrackCard code={nextOrder.code} headline={nextOrder.headline} steps={stepsPickup} progress={1} width={418} style={{ padding: "24px 22px", gap: 18 }}>
                  <span style={{ ...label(12), letterSpacing: "0.22em", paddingTop: 14, borderTop: `2px solid ${C.ink}` }}>Messages</span>
                  <p style={{ margin: 0, fontSize: 16, lineHeight: 1.5, color: C.cocoa }}>{emptyChat}</p>
                  <ComposeBox text="" />
                </TrackCard>
              </div>
            )}
          </div>
        </PhoneFrame>
      </div>
      <Caption text={first} at={14} out={T.next - 8} style={{ left: 120, bottom: 70 }} />
      <Caption text={second} at={T.next + 8} out={172} style={{ left: 120, bottom: 70 }} />
    </AbsoluteFill>
  );
}
