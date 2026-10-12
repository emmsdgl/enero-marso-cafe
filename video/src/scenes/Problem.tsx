import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { C, FONT } from "../brand";
import { useEnter } from "../components/motion";
import { Caption } from "../components/Parts";
import { scattered } from "../content";

// Where each message lands (fractions of the frame), its tilt, and when it pops in
const SPOTS = [
  { x: 0.08, y: 0.14, r: -4, at: 6, who: "Bea" },
  { x: 0.5, y: 0.1, r: 3, at: 15, who: "Jun" },
  { x: 0.26, y: 0.34, r: -2, at: 24, who: "Rica" },
  { x: 0.6, y: 0.33, r: 4, at: 32, who: "Marco" },
  { x: 0.05, y: 0.52, r: 3, at: 41, who: "Ella" },
  { x: 0.4, y: 0.56, r: -3, at: 49, who: "Tonio" },
  { x: 0.66, y: 0.58, r: 2, at: 57, who: "Bea" },
];

/** Messages from customers pile up in scattered chats, shake, then get swept away (about 6 s) */
export function Problem({ caption }: { caption: string }) {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const shake = frame >= 92 && frame < 114 ? Math.sin(frame * 1.7) * 9 * (1 - (frame - 92) / 22) : 0;
  const sweep = useEnter(116, 200);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 40%, #eadac3, ${C.sand} 72%)`, overflow: "hidden" }}>
      <AbsoluteFill style={{ transform: `translateX(${shake - sweep * width * 1.15}px) rotate(${-sweep * 6}deg)`, opacity: 1 - sweep * 0.6 }}>
        {SPOTS.map((s, i) => (
          <Message key={i} x={s.x * width} y={s.y * height} rotate={s.r} at={s.at} who={s.who} text={scattered[i % scattered.length]} />
        ))}
        <MissedCall x={width * 0.74} y={height * 0.16} at={38} />
        <MissedCall x={width * 0.2} y={height * 0.74} at={62} />
      </AbsoluteFill>
      <Caption text={caption} at={28} out={168} style={{ left: 120, bottom: 70 }} />
    </AbsoluteFill>
  );
}

function Message({ x, y, rotate, at, who, text }: { x: number; y: number; rotate: number; at: number; who: string; text: string }) {
  const p = useEnter(at, 14);
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, display: "flex", alignItems: "flex-end", gap: 12, fontFamily: FONT,
        opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }), transform: `rotate(${rotate}deg) scale(${interpolate(p, [0, 1], [0.7, 1])})`, transformOrigin: "0% 100%",
      }}
    >
      <span style={{ width: 54, height: 54, borderRadius: 27, background: C.card, color: C.cocoa, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 22 }}>{who[0]}</span>
      <span style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: C.cocoa }}>{who}</span>
        <span style={{ padding: "16px 22px", borderRadius: "24px 24px 24px 6px", background: "#fff", color: C.ink, fontSize: 28, fontWeight: 500, boxShadow: "0 14px 30px -18px rgba(21, 18, 17, 0.55)", whiteSpace: "nowrap" }}>{text}</span>
      </span>
    </div>
  );
}

function MissedCall({ x, y, at }: { x: number; y: number; at: number }) {
  const p = useEnter(at, 14);
  return (
    <div style={{ position: "absolute", left: x, top: y, display: "flex", alignItems: "center", gap: 12, padding: "14px 22px", borderRadius: 999, background: C.ink, color: C.cream, fontFamily: FONT, fontSize: 22, fontWeight: 600, opacity: p, transform: `scale(${interpolate(p, [0, 1], [0.7, 1])})` }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e8a093" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
        <path d="M16 3l5 5M21 3l-5 5" />
      </svg>
      Missed call
    </div>
  );
}
