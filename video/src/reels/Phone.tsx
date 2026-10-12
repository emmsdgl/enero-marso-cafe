import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { C, FONT, label, SCRIPT } from "../brand";
import { PhoneFrame, SiteBar } from "../components/Frames";
import { useEnter } from "../components/motion";
import { Caption, StepsBar } from "../components/Parts";
import { Series } from "../components/Series";
import { SCREEN_BLEND, seriesStarts } from "../timeline";

/*
 * The reels show the customer's own phone, nothing else. Screens are drawn at phone size (446 × 956 screen),
 * then the whole phone is scaled up. Every tap is in screen pixels, so it lands on the button it means.
 *
 * Platform buttons cover the bottom 20% and the right 15% of a reel, so the captions sit above the phone
 * and the phone stays left of the right-hand strip.
 */
export const REEL = { w: 1080, h: 1920 };
export const SCREEN = { w: 446, h: 956 };
export const TOP = 120; // the status bar and the site's dark bar
const SCALE = 1.36;
const PHONE_AT = { x: (REEL.w - 470 * SCALE) / 2, y: 372 };
export type PhoneScene = { id: string; len: number; caption: string; screen: ReactNode };

/** The middle of a reel: the phone rises in and stays put while its screens change; each screen's caption sits above it */
export function ReelPhone({ scenes }: { scenes: PhoneScene[] }) {
  const starts = seriesStarts(scenes.map((sc) => sc.len), SCREEN_BLEND);
  const enter = useEnter(0);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 38%, #eadac3, ${C.sand} 70%)` }}>
      {scenes.map((sc, i) => (
        <div key={sc.id} style={{ position: "absolute", left: 70, right: 70, top: 150, height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Caption text={sc.caption} at={starts[i] + 6} out={starts[i] + sc.len - 24} size={46} style={{ position: "relative", borderRadius: 44, textWrap: "balance" }} />
        </div>
      ))}
      <div style={{ position: "absolute", left: PHONE_AT.x, top: PHONE_AT.y, opacity: enter, transform: `translateY(${(1 - enter) * 160}px) scale(${SCALE})`, transformOrigin: "0 0" }}>
        <PhoneFrame width={470} height={980}>
          <Series scenes={scenes.map((sc) => ({ id: sc.id, len: sc.len, el: sc.screen }))} blend={SCREEN_BLEND} />
        </PhoneFrame>
      </div>
    </AbsoluteFill>
  );
}

/** A page of the website on the phone: the dark bar at the top, the page under it */
export function CustomerScreen({ children }: { children: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: C.sand, fontFamily: FONT, color: C.ink }}>
      <div style={{ paddingTop: 50, background: C.ink }}><SiteBar height={70} /></div>
      <div style={{ position: "absolute", top: TOP, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>{children}</div>
    </AbsoluteFill>
  );
}

/*
 * The order page's card on a phone, laid out at fixed heights so taps and chat land in known places.
 * Card box (content coords): x 14, y 22, 418 × 708. Inside it: code 25, headline 53 (up to three lines), steps 153, tabs 217, body 277.
 */
export const CARD = { x: 14, y: 22, w: 418, h: 708 };
const IN = { code: 25, headline: 53, steps: 153, tabs: 217, body: 277 };
export const BODY = { x: CARD.x + 23, y: TOP + CARD.y + IN.body, w: CARD.w - 46, h: CARD.h - IN.body - 25 };

export function PhoneTrack({ code, headline, under, steps, progress, tabs, active, badge, children }: {
  code: string; headline: string; under?: ReactNode; steps: readonly string[]; progress: number;
  tabs: string[]; active: string; badge?: number; children?: ReactNode;
}) {
  const at = (y: number, h?: number): CSSProperties => ({ position: "absolute", left: 20, right: 20, top: y, height: h });
  return (
    <article style={{ position: "absolute", left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h, boxSizing: "border-box", background: C.cream, border: `3px solid ${C.ink}`, outline: `1px solid ${C.ink}`, outlineOffset: 5 }}>
      <p style={{ ...at(IN.code - 3, 22), margin: 0, ...label(12, C.cocoa), letterSpacing: "0.22em", fontWeight: 600 }}>
        Order <b style={{ marginLeft: 6, fontSize: 17, letterSpacing: "0.12em", color: C.ink }}>{code}</b>
      </p>
      <div style={at(IN.headline - 3, 88)}>
        {/* Short headlines stay big; the long ones (up to 57 characters) get three lines */}
        <h1 style={{ margin: 0, fontSize: headline.length <= 32 ? 28 : 23.5, lineHeight: 1.22, fontWeight: 700, color: C.brown, textWrap: "balance" }}>{keepCodes(headline)}</h1>
        {under}
      </div>
      <div style={at(IN.steps - 3, 52)}>
        <StepsBar steps={steps} progress={progress} scale={0.86} />
      </div>
      <div style={{ ...at(IN.tabs - 3, 46), left: 20, right: 20 }}>
        <PhoneTabs tabs={tabs} active={active} badge={badge} />
      </div>
      <div style={{ ...at(IN.body - 3, BODY.h), display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </article>
  );
}

/** Order codes like EM-7KQ4P2 never break at their hyphen */
const keepCodes = (text: string) => text.split(/(EM-[A-Z0-9]{6})/).map((part, i) => (i % 2 ? <span key={i} style={{ whiteSpace: "nowrap" }}>{part}</span> : part));

function PhoneTabs({ tabs, active, badge }: { tabs: string[]; active: string; badge?: number }) {
  return (
    <div style={{ height: 46, display: "flex", borderBottom: `2px solid ${C.ink}`, boxSizing: "border-box" }}>
      {tabs.map((t) => (
        <span key={t} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 6, ...label(11, t === active ? C.ink : C.cocoa), letterSpacing: "0.16em", boxShadow: t === active ? `inset 0 -4px 0 ${C.gold}` : undefined }}>
          {t}
          {t === "Messages" && badge ? <b style={{ minWidth: 18, padding: "2px 5px", borderRadius: 999, background: C.brown, color: C.cream, fontSize: 10, letterSpacing: 0, textAlign: "center" }}>{badge}</b> : null}
        </span>
      ))}
    </div>
  );
}

/** The phone checkout's sticky bar: "2 items · ₱205 · Review order". Bumps when the count changes at `bump`. */
export function CheckoutBar({ text, at, bump = -100 }: { text: string; at: number; bump?: number }) {
  const p = useEnter(at, 18);
  const b = useEnter(bump, 12) - useEnter(bump + 6, 12);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute", zIndex: 20, left: 14, right: 14, bottom: 12, height: 54, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 22px",
        borderRadius: 999, background: C.ink, color: C.cream, boxShadow: "0 12px 24px -12px rgba(21, 18, 17, 0.6)",
        fontFamily: FONT, opacity: p, transform: `translateY(${(1 - p) * 40}px) scale(${1 + b * 0.04})`,
      }}
    >
      <span style={{ fontWeight: 600, fontSize: 16 }}>{text}</span>
      <b style={{ ...label(12, C.gold), letterSpacing: "0.16em" }}>Review order</b>
    </div>
  );
}
/** Where the bar's middle is, in screen pixels */
export const BAR = { x: SCREEN.w / 2, y: SCREEN.h - 12 - 27 };

/** "Order ahead" with its script line, sized for the phone */
export function PhoneTitle() {
  return (
    <div style={{ position: "absolute", top: 12, left: 0, right: 0, display: "grid", justifyItems: "center" }}>
      <span style={{ fontWeight: 700, fontSize: 30, letterSpacing: "0.04em", color: C.brown }}>ORDER AHEAD</span>
      <span style={{ fontFamily: SCRIPT, fontSize: 24, marginTop: -6, color: C.ink }}>Skip the line, we&rsquo;ll have it ready</span>
    </div>
  );
}

/** One line of the Your order slip */
export function SlipRow({ name, detail, price, at = -100 }: { name: string; detail?: string | null; price: number; at?: number }) {
  const p = useEnter(at, 16);
  if (p <= 0) return null;
  return (
    <div style={{ height: 54, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(21, 18, 17, 0.2)", opacity: interpolate(p, [0, 1], [0, 1]), transform: `translateX(${(1 - p) * 20}px)` }}>
      <span style={{ flex: 1, display: "grid", fontSize: 15, fontWeight: 500, lineHeight: 1.25 }}>
        {name}
        {detail && <small style={{ fontSize: 12, color: C.cocoa }}>{detail}</small>}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14 }}>
        <Step>−</Step>1<Step>+</Step>
      </span>
      <b style={{ width: 46, textAlign: "right", fontSize: 15 }}>₱{price}</b>
    </div>
  );
}
const Step = ({ children }: { children: ReactNode }) => (
  <span style={{ width: 24, height: 24, borderRadius: 12, border: `1.5px solid ${C.ink}`, display: "grid", placeItems: "center", fontSize: 14, lineHeight: 1 }}>{children}</span>
);

/** A labelled input on the phone checkout */
export const PhoneField = ({ name, hint, value, style }: { name: string; hint?: string; value: string; style?: CSSProperties }) => (
  <span style={{ display: "grid", gap: 4, fontSize: 13, fontWeight: 600, ...style }}>
    <span>{name} {hint && <small style={{ fontWeight: 500, color: C.cocoa }}>{hint}</small>}</span>
    <span style={{ height: 40, boxSizing: "border-box", display: "flex", alignItems: "center", padding: "0 11px", border: `1.5px solid ${C.ink}`, background: C.paper, fontSize: 15, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden" }}>{value}</span>
  </span>
);
