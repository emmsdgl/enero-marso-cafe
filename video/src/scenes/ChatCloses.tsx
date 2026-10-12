import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT } from "../brand";
import { ChatBubble, ChatLog } from "../components/Chat";
import { BrowserFrame, SiteBar } from "../components/Frames";
import { LockIcon } from "../components/Icons";
import { useEnter, useInOut } from "../components/motion";
import { Caption } from "../components/Parts";
import { ComposeBox, TrackCard, TrackTabs } from "../components/Screens";
import { chatClosed, delivery, site, stepsDelivery } from "../content";

const chat = delivery.chat;
const T = { delivered: 10, line: 30, skip: 92, close: 130 };

/** Delivered: the chat stays open 30 minutes for anything missing, then closes (8 s) */
export function ChatCloses({ caption }: { caption: string }) {
  const frame = useCurrentFrame();
  const enter = useEnter(0);
  const skip = useInOut(T.skip, T.close - 6, 200);
  const closed = useEnter(T.close, 200);
  const progress = interpolate(frame, [T.delivered, T.delivered + 22], [4, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, #eadac3, ${C.sand} 72%)` }}>
      <div style={{ position: "absolute", left: 260, top: 70, opacity: enter, transform: `translateY(${(1 - enter) * 40}px)` }}>
        <BrowserFrame width={1400} height={940} url={`${site.url}/order/${delivery.code}`}>
          <SiteBar />
          <div style={{ display: "grid", justifyItems: "center", paddingTop: 34 }}>
            <TrackCard code={delivery.code} headline={frame >= T.delivered ? delivery.headlines.done : delivery.headlines.out} steps={stepsDelivery} progress={progress} width={900}>
              <TrackTabs tabs={["Messages", "Your order"]} active="Messages" />
              <div style={{ position: "relative" }}>
                <ChatLog gap={12} style={{ height: 330, justifyContent: "flex-end", overflow: "hidden", opacity: interpolate(closed, [0, 1], [1, 0.38]) }}>
                  <ChatBubble side="mine" text={chat[4].text} meta="You · 3:05 PM" at={-60} />
                  <ChatBubble side="theirs" text={chat[5].text} meta="Enero Marso · 3:06 PM" at={-60} />
                  <ChatBubble side="system" text={chat[7].text} at={-60} />
                  <ChatBubble side="system" text={chat[8].text} at={T.line} />
                </ChatLog>
                {skip > 0 && (
                  <span style={{ position: "absolute", left: "50%", top: 70, transform: `translateX(-50%) scale(${interpolate(skip, [0, 1], [0.85, 1])})`, opacity: skip, padding: "14px 28px", borderRadius: 999, background: C.gold, color: C.ink, fontFamily: FONT, fontWeight: 700, fontSize: 26 }}>
                    30 minutes later
                  </span>
                )}
                {closed > 0 && (
                  <span style={{ position: "absolute", left: "50%", top: 110, transform: `translateX(-50%) scale(${interpolate(closed, [0, 1], [0.8, 1])})`, opacity: closed, width: 96, height: 96, borderRadius: 48, background: C.ink, color: C.gold, display: "grid", placeItems: "center", boxShadow: "0 18px 36px -18px rgba(21, 18, 17, 0.7)" }}>
                    <LockIcon size={44} />
                  </span>
                )}
              </div>
              {closed < 0.5 ? (
                <ComposeBox text="" />
              ) : (
                <p style={{ margin: 0, padding: "16px 18px", background: C.sand, fontFamily: FONT, fontSize: 17, color: C.cocoa, opacity: interpolate(closed, [0.5, 1], [0, 1]) }}>
                  {chatClosed}
                </p>
              )}
            </TrackCard>
          </div>
        </BrowserFrame>
      </div>
      <Caption text={caption} at={30} out={226} style={{ left: 120, bottom: 54 }} />
    </AbsoluteFill>
  );
}
