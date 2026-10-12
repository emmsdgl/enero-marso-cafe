import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, label, SCRIPT } from "../brand";
import { ChatBubble, ChatLog } from "../components/Chat";
import { BrowserFrame, PhoneFrame, SiteBar, StaffHeader } from "../components/Frames";
import { CheckIcon } from "../components/Icons";
import { useEnter } from "../components/motion";
import { Caption, PushBanner, QrCode, TapRipple } from "../components/Parts";
import { TrackCard, TrackTabs, useSwap, useTyped } from "../components/Screens";
import { customer, delivery, payPanel, site, staffButtons, stepsDelivery } from "../content";

const PHONE_H = 980;
const T = { type: 40, paid: 104, push: 114, tap: 154, check: 162, received: 202, accepted: 212 };
const SCREEN_H = PHONE_H - 24; // the phone's screen, inside its frame
const RECEIVED_Y = SCREEN_H - 24 - 18 - 48 - 12 - 24; // the "Payment received" button's middle: padding, card padding, Not found, gap, half

/** The customer pays by GCash on the page; the staff phone gets "Payment to check" and taps Payment received (8 s) */
export function PayByGcash({ caption }: { caption: string }) {
  const frame = useCurrentFrame();
  const enter = useEnter(0);
  const ref = useTyped(delivery.gcashRef, T.type, 0.5);
  const sent = frame >= T.paid + 4;
  // The pay panel fades out first, then the chat fades in, so the two never overlap
  const toChat = useSwap(T.accepted, 20);
  const panelOut = Math.min(1, toChat * 2);
  const chatIn = Math.max(0, toChat * 2 - 1);
  const check = useEnter(T.check, 200);
  const received = frame >= T.received + 6;
  const pressing = frame >= T.paid && frame < T.paid + 6;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 40% 30%, #eadac3, ${C.sand} 72%)` }}>
      <div style={{ position: "absolute", left: 80, top: 90, opacity: enter }}>
        <BrowserFrame width={1150} height={900} url={`${site.url}/order/${delivery.code}`}>
          <SiteBar />
          <div style={{ display: "grid", justifyItems: "center", paddingTop: 34 }}>
            <TrackCard
              code={delivery.code}
              headline={frame >= T.accepted ? delivery.headlines.accepted : sent ? delivery.headlines.paid : delivery.headlines.pay}
              steps={stepsDelivery}
              progress={interpolate(frame, [T.accepted, T.accepted + 20], [2, 3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
              width={880}
            >
              <TrackTabs tabs={frame >= T.accepted ? ["Messages", "Your order"] : ["Pay", "Messages", "Your order"]} active={frame >= T.accepted ? "Messages" : "Pay"} />
              <div style={{ position: "relative", minHeight: 400 }}>
                <section
                  style={{
                    position: "absolute", inset: 0, display: "grid", gap: 12, alignContent: "start", padding: 20, fontFamily: FONT,
                    border: `2px solid ${sent ? C.gold : C.brown}`, background: sent ? "#fbf3e4" : C.paper, opacity: 1 - panelOut,
                  }}
                >
                  <span style={{ fontFamily: SCRIPT, fontSize: 52, lineHeight: 1, color: C.brown }}>Pay ₱{delivery.total}</span>
                  {sent ? (
                    <p style={{ margin: 0, fontSize: 18 }}><b>{payPanel.sent}.</b> {payPanel.checking}</p>
                  ) : (
                    <p style={{ margin: 0, fontSize: 16, lineHeight: 1.45 }}>{payPanel.how}</p>
                  )}
                  <div style={{ display: "flex", gap: 24, alignItems: "flex-start", opacity: sent ? 0.45 : 1 }}>
                    <QrCode size={170} />
                    <div style={{ flex: 1, display: "grid", gap: 12 }}>
                      <div style={{ display: "grid", gap: 2 }}>
                        <span style={label(11)}>Pay to</span>
                        <b style={{ fontSize: 18 }}>{delivery.account.label}</b>
                        <span style={{ fontSize: 15, color: C.cocoa }}>{delivery.account.name} · {delivery.account.number}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={label(11)}>Amount</span>
                        <b style={{ fontSize: 20 }}>₱{delivery.total}</b>
                        <span style={{ padding: "4px 12px", borderRadius: 999, border: `1.5px solid ${C.ink}`, fontSize: 13, fontWeight: 600 }}>Copy</span>
                      </div>
                      <div style={{ display: "grid", gap: 5, fontSize: 14, fontWeight: 600 }}>
                        <span>Reference number <small style={{ fontWeight: 500, color: C.cocoa }}>from your payment receipt</small></span>
                        <span style={{ padding: "10px 12px", border: `1.5px solid ${C.ink}`, background: "#fff", fontSize: 18, fontWeight: 500, minHeight: 24 }}>{ref || " "}</span>
                      </div>
                      <span style={{ height: 50, display: "grid", placeItems: "center", borderRadius: 999, background: pressing || sent ? C.ink : C.brown, transform: `scale(${pressing ? 0.97 : 1})`, ...label(14, C.cream), letterSpacing: "0.14em" }}>
                        {sent ? "Sent" : "I've paid"}
                      </span>
                    </div>
                  </div>
                </section>
                {chatIn > 0 && (
                  <ChatLog gap={12} style={{ position: "absolute", inset: 0, justifyContent: "flex-end", opacity: chatIn }}>
                    <ChatBubble side="system" text={delivery.chat[0].text} at={-60} />
                    <ChatBubble side="system" text={delivery.chat[1].text} at={-60} />
                    <ChatBubble side="system" text={delivery.chat[2].text} at={T.accepted + 4} />
                  </ChatLog>
                )}
              </div>
            </TrackCard>
          </div>
        </BrowserFrame>
      </div>

      <div style={{ position: "absolute", left: 1330, top: 50, opacity: enter }}>
        <PhoneFrame width={470} height={PHONE_H}>
          <StaffHeader />
          <div style={{ position: "absolute", top: 170, left: 0, right: 0, bottom: 0, display: "flex", flexDirection: "column", gap: 14, padding: "18px 20px 24px", fontFamily: FONT }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <b style={{ fontSize: 28, letterSpacing: "0.06em" }}>{delivery.code}</b>
              <span style={{ padding: "5px 12px", borderRadius: 999, fontSize: 14, fontWeight: 700, background: received ? C.okBg : "#f7e7cf", color: received ? C.okText : "#5c3a0d" }}>{received ? "Accepted" : "Awaiting payment"}</span>
            </div>
            <div style={{ display: "grid", gap: 4, fontSize: 16, color: C.cocoa }}>
              <span>{customer.name} · {customer.phone}</span>
              <span>Total to pay: ₱{delivery.total} (fee ₱{delivery.fee})</span>
            </div>
            <div style={{ marginTop: "auto", display: "grid", gap: 12, padding: 18, borderRadius: 14, background: C.cream, border: `1px solid ${C.line}`, opacity: check, transform: `translateY(${(1 - check) * 30}px)` }}>
              {received ? (
                <b style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 19, color: C.okText }}><CheckIcon size={24} /> {staffButtons.delivery.paid}</b>
              ) : (
                <>
                  <b style={{ fontSize: 18 }}>{payPanel.staffTitle}</b>
                  <span style={{ fontSize: 16 }}>{payPanel.staffLine}</span>
                  <small style={{ fontSize: 14, color: C.cocoa }}>{payPanel.staffHint}</small>
                  <span style={{ height: 48, display: "grid", placeItems: "center", borderRadius: 10, background: C.brown, color: C.cream, fontWeight: 700, fontSize: 17 }}>{staffButtons.delivery.paid}</span>
                  <span style={{ height: 48, display: "grid", placeItems: "center", borderRadius: 10, border: "1.5px solid rgba(21, 18, 17, 0.25)", fontWeight: 600, fontSize: 16 }}>Not found</span>
                </>
              )}
            </div>
          </div>
          <PushBanner title={delivery.push.payment.title} body={delivery.push.payment.body} at={T.push} out={T.tap + 6} top={52} />
          <TapRipple x={223} y={112} at={T.tap} />
          <TapRipple x={223} y={RECEIVED_Y} at={T.received} />
        </PhoneFrame>
      </div>
      <Caption text={caption} at={20} out={228} style={{ left: 120, bottom: 54 }} />
    </AbsoluteFill>
  );
}
