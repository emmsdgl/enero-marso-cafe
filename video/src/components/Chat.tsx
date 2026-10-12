import type { CSSProperties } from "react";
import { interpolate } from "remotion";
import { C, FONT } from "../brand";
import { useEnter } from "./motion";

export type Side = "mine" | "theirs" | "system";

/**
 * One chat line, styled like the order page's chat (web/src/app/globals.css .chat-*).
 * Mine: brown on the right. Theirs: sand on the left. System: centered and muted.
 */
export function ChatBubble({ side, text, meta, at, scale = 1 }: { side: Side; text: string; meta?: string; at: number; scale?: number }) {
  const p = useEnter(at, 18);
  const s = (n: number) => n * scale;
  // Not there yet: takes no room. Arriving: grows in, so older lines slide up instead of jumping
  if (p <= 0) return null;
  const shown: CSSProperties = {
    maxHeight: interpolate(p, [0, 1], [0, s(260)]),
    overflow: "hidden",
    flex: "none",
    opacity: interpolate(p, [0, 0.6], [0, 1], { extrapolateRight: "clamp" }),
    transform: `translateY(${interpolate(p, [0, 1], [s(18), 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})`,
    transformOrigin: side === "mine" ? "100% 100%" : side === "theirs" ? "0% 100%" : "50% 50%",
  };
  if (side === "system") {
    return (
      <p style={{ ...shown, margin: 0, alignSelf: "center", maxWidth: "88%", textAlign: "center", fontFamily: FONT, fontWeight: 600, fontSize: s(15), lineHeight: 1.4, color: C.cocoa, textWrap: "balance" }}>
        {text}
      </p>
    );
  }
  const mine = side === "mine";
  return (
    <div style={{ ...shown, alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%", display: "grid", gap: s(4) }}>
      <p
        style={{
          margin: 0, padding: `${s(10)}px ${s(15)}px`, fontFamily: FONT, fontSize: s(17), lineHeight: 1.4,
          background: mine ? C.brown : C.sand, color: mine ? C.cream : C.ink,
          borderRadius: mine ? `${s(18)}px ${s(18)}px ${s(5)}px ${s(18)}px` : `${s(18)}px ${s(18)}px ${s(18)}px ${s(5)}px`,
        }}
      >
        {text}
      </p>
      {meta && <span style={{ padding: `0 ${s(6)}px`, textAlign: mine ? "right" : "left", fontFamily: FONT, fontSize: s(13), color: C.cocoa }}>{meta}</span>}
    </div>
  );
}

/** A column of chat lines */
export function ChatLog({ children, gap = 12, style }: { children: React.ReactNode; gap?: number; style?: CSSProperties }) {
  return <div style={{ display: "flex", flexDirection: "column", gap, ...style }}>{children}</div>;
}
