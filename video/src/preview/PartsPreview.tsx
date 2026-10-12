import type { ReactNode } from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C, FONT, label, SCRIPT } from "../brand";
import { CheckIcon, ChatIcon, CupIcon, LockIcon, PinIcon, ScooterIcon } from "../components/Icons";
import { Caption, Cursor, MiniMap, OrderBubble, QrCode, StepsBar } from "../components/Parts";
import { captions, delivery, pickup, stepsPickup } from "../content";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Preview of the smaller pieces, each with a name under it */
export function PartsPreview() {
  const frame = useCurrentFrame();
  const pressed = frame >= 100;
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 70% 30%, #eadac3, ${C.sand} 70%)`, fontFamily: FONT, padding: 80 }}>
      <div style={{ display: "grid", gridTemplateColumns: "640px 1fr 1fr", gridTemplateRows: "auto auto", gap: "70px 80px", alignItems: "start" }}>
        <Named name="Map: the cafe, free-delivery circle, the customer's pin">
          <MiniMap width={640} height={400} at={15} />
        </Named>

        <Named name="Pay panel: GCash QR">
          <div style={{ display: "grid", justifyItems: "center", gap: 14, padding: "22px 34px", background: C.paper, border: `2px solid ${C.brown}` }}>
            <span style={{ fontFamily: SCRIPT, fontSize: 56, lineHeight: 1, color: C.brown }}>Pay ₱{delivery.total}</span>
            <QrCode size={250} />
          </div>
        </Named>

        <Named name="Icons (drawn, no emojis)">
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", maxWidth: 420 }}>
            {[CupIcon, ScooterIcon, CheckIcon, LockIcon, PinIcon, ChatIcon].map((I, n) => (
              <span key={n} style={{ width: 78, height: 78, borderRadius: 39, background: C.ink, color: C.gold, display: "grid", placeItems: "center" }}>
                <I size={40} />
              </span>
            ))}
          </div>
        </Named>

        <Named name="Order bubble">
          <OrderBubble code={pickup.code} status="Ready for pickup" unread={1} at={30} />
        </Named>

        <Named name="Mouse click">
          <div style={{ position: "relative", width: 420, height: 160 }}>
            <span
              style={{
                position: "absolute", left: 40, top: 40, padding: "22px 44px", borderRadius: 999, background: pressed ? C.ink : C.brown,
                ...label(17, C.cream), letterSpacing: "0.16em", transform: `scale(${frame >= 100 && frame < 106 ? 0.96 : 1})`,
              }}
            >
              Place order
            </span>
            <Cursor points={[{ x: 380, y: 140, at: 40 }, { x: 200, y: 70, at: 95 }]} clicks={[100]} />
          </div>
        </Named>

        <Named name="Progress bar (pickup)">
          <div style={{ width: 460 }}>
            <StepsBar steps={stepsPickup} progress={interpolate(frame, [30, 150], [1, 4], clamp)} />
          </div>
        </Named>
      </div>
      <Caption text={captions.pitch.pickup} at={50} style={{ left: 80, bottom: 70 }} />
    </AbsoluteFill>
  );
}

function Named({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gap: 16, justifyItems: "start" }}>
      {children}
      <span style={{ ...label(13, C.cocoa), letterSpacing: "0.16em", fontWeight: 600 }}>{name}</span>
    </div>
  );
}
