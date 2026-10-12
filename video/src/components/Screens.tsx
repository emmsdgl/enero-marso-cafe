import type { CSSProperties, ReactNode } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { C, FONT, label, SCRIPT } from "../brand";
import { StepsBar } from "./Parts";

/** Text that types itself from frame `at`, `perFrame` characters at a time */
export function useTyped(text: string, at: number, perFrame = 0.7) {
  const frame = useCurrentFrame();
  return text.slice(0, Math.max(0, Math.floor((frame - at) * perFrame)));
}

/** The customer's order page card: code, headline, progress, then whatever goes below (tabs, chat, details) */
export function TrackCard({ code, headline, steps, progress, children, width = 760, style }: {
  code: string; headline: ReactNode; steps: readonly string[]; progress: number; children?: ReactNode; width?: number; style?: CSSProperties;
}) {
  return (
    <article style={{ width, display: "grid", gap: 22, alignContent: "start", padding: "30px 36px", background: C.cream, border: `3px solid ${C.ink}`, outline: `1px solid ${C.ink}`, outlineOffset: 6, fontFamily: FONT, ...style }}>
      <div>
        <p style={{ margin: 0, ...label(13, C.cocoa), letterSpacing: "0.22em", fontWeight: 600 }}>
          Order <b style={{ marginLeft: 6, fontSize: 19, letterSpacing: "0.12em", color: C.ink }}>{code}</b>
        </p>
        <h1 style={{ margin: "8px 0 0", fontSize: 36, lineHeight: 1.15, fontWeight: 700, color: C.brown, textWrap: "balance" }}>{headline}</h1>
      </div>
      <StepsBar steps={steps} progress={progress} />
      {children}
    </article>
  );
}

/** The order page's Messages / Your order tabs (Pay too while paying) */
export function TrackTabs({ tabs, active, badge }: { tabs: string[]; active: string; badge?: number }) {
  return (
    <div style={{ display: "flex", borderBottom: `2px solid ${C.ink}` }}>
      {tabs.map((t) => (
        <span key={t} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, padding: "14px 0", ...label(13, t === active ? C.ink : C.cocoa), letterSpacing: "0.18em", boxShadow: t === active ? `inset 0 -5px 0 ${C.gold}` : undefined }}>
          {t}
          {t === "Messages" && badge ? <b style={{ minWidth: 22, padding: "2px 6px", borderRadius: 999, background: C.brown, color: C.cream, fontSize: 11, letterSpacing: 0, textAlign: "center" }}>{badge}</b> : null}
        </span>
      ))}
    </div>
  );
}

/** A chat's message box: what's being typed, and the send button */
export function ComposeBox({ text, placeholder = "Message Enero Marso…" }: { text: string; placeholder?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, padding: 6, border: `1.5px solid ${C.ink}`, background: C.paper, fontFamily: FONT }}>
      <span style={{ flex: 1, padding: "10px 10px", fontSize: 17, color: text ? C.ink : "#7a5a44", minHeight: 24 }}>{text || placeholder}</span>
      <span style={{ padding: "12px 18px", background: text ? C.brown : C.card, ...label(12, text ? C.cream : C.cocoa), letterSpacing: "0.16em" }}>Send</span>
    </div>
  );
}

/** The page heading on the website's order page */
export function OrderAheadTitle({ size = 52 }: { size?: number }) {
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 2 }}>
      <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: size, letterSpacing: "0.04em", color: C.brown }}>ORDER AHEAD</span>
      <span style={{ fontFamily: SCRIPT, fontSize: size * 0.72, color: C.ink, marginTop: -size * 0.12 }}>Skip the line, we&rsquo;ll have it ready</span>
    </div>
  );
}

/** Fade between two looks of the same screen (for status changes) */
export function useSwap(at: number, length = 12) {
  const frame = useCurrentFrame();
  return interpolate(frame, [at, at + length], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
}
