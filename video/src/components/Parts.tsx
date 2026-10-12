import type { CSSProperties } from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { C, EASE, FONT, label } from "../brand";
import { CupIcon } from "./Icons";
import { useEnter, useInOut } from "./motion";

/** A phone notification sliding down from the top: in at `at`, back up at `out` */
export function PushBanner({ title, body, at, out = 10_000, top = 14 }: { title: string; body: string; at: number; out?: number; top?: number }) {
  const p = useInOut(at, out, 20);
  return (
    <div
      style={{
        position: "absolute", zIndex: 70, top, left: 12, right: 12, display: "flex", gap: 14, alignItems: "center", padding: "14px 16px",
        borderRadius: 26, background: "rgba(250, 241, 225, 0.97)", boxShadow: "0 18px 40px -16px rgba(21, 18, 17, 0.55)",
        transform: `translateY(${interpolate(p, [0, 1], [-170, 0])}px)`, opacity: interpolate(p, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      <span style={{ flex: "none", width: 46, height: 46, borderRadius: 12, background: C.ink, display: "grid", placeItems: "center" }}>
        <Img src={staticFile("brand/enero-marso-monogram-gold.png")} style={{ height: 30 }} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "grid", gap: 2, fontFamily: FONT }}>
        <span style={{ display: "flex", justifyContent: "space-between", ...label(11, C.cocoa), letterSpacing: "0.14em" }}>
          <span>Enero Marso Staff</span>
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>now</span>
        </span>
        <span style={{ fontWeight: 700, fontSize: 17, color: C.ink }}>{title}</span>
        <span style={{ fontSize: 15, lineHeight: 1.35, color: C.cocoa }}>{body}</span>
      </span>
    </div>
  );
}

/** A finger tap: a soft press and a gold ring spreading out */
export function TapRipple({ x, y, at }: { x: number; y: number; at: number }) {
  const frame = useCurrentFrame() - at;
  if (frame < 0 || frame > 22) return null;
  const t = interpolate(frame, [0, 22], [0, 1], { easing: EASE });
  return (
    <div style={{ position: "absolute", zIndex: 80, left: x, top: y, width: 0, height: 0, pointerEvents: "none" }}>
      <span style={{ position: "absolute", left: -22, top: -22, width: 44, height: 44, borderRadius: 22, background: "rgba(21, 18, 17, 0.25)", opacity: interpolate(frame, [0, 4, 12], [0, 1, 0], { extrapolateRight: "clamp" }) }} />
      <span style={{ position: "absolute", left: -40 * t - 8, top: -40 * t - 8, width: 80 * t + 16, height: 80 * t + 16, borderRadius: "50%", border: `3px solid ${C.gold}`, opacity: 1 - t }} />
    </div>
  );
}

/** A mouse pointer gliding between points; `clicks` are frames where it presses */
export function Cursor({ points, clicks = [] }: { points: { x: number; y: number; at: number }[]; clicks?: number[] }) {
  const frame = useCurrentFrame();
  const xs = points.map((p) => p.x), ys = points.map((p) => p.y), ats = points.map((p) => p.at);
  const opts = { easing: EASE, extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const x = points.length > 1 ? interpolate(frame, ats, xs, opts) : xs[0];
  const y = points.length > 1 ? interpolate(frame, ats, ys, opts) : ys[0];
  const press = clicks.some((c) => frame >= c && frame < c + 6) ? 0.85 : 1;
  return (
    <svg style={{ position: "absolute", zIndex: 90, left: x, top: y, transform: `scale(${press})`, transformOrigin: "0 0", filter: "drop-shadow(0 4px 6px rgba(0,0,0,.35))" }} width="34" height="40" viewBox="0 0 17 20">
      <path d="M1 1v15.5l4-3.6 2.6 5.6 2.6-1.2-2.6-5.4H13z" fill={C.ink} stroke={C.cream} strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * The order page's progress bar: done steps brown, the current one gold.
 * `progress` counts reached steps (2 = the second step is current); in between, the next bar fills in.
 */
export function StepsBar({ steps, progress, scale = 1, showLabels = true }: { steps: readonly string[]; progress: number; scale?: number; showLabels?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${steps.length}, 1fr)`, gap: 6 * scale }}>
      {steps.map((s, i) => {
        const fill = Math.max(0, Math.min(1, progress - i));
        const now = i === Math.ceil(progress) - 1;
        return (
          <div key={s} style={{ display: "grid", gap: 10 * scale }}>
            <div style={{ position: "relative", height: 8 * scale, background: "rgba(21, 18, 17, 0.14)" }}>
              <div style={{ position: "absolute", inset: 0, width: `${fill * 100}%`, background: now ? C.gold : C.brown }} />
            </div>
            {showLabels && <span style={{ ...label(11 * scale, now ? C.ink : C.cocoa), letterSpacing: "0.08em", fontWeight: 600 }}>{s}</span>}
          </div>
        );
      })}
    </div>
  );
}

/** A decorative QR code (not scannable, so nobody pays a sample account) */
export function QrCode({ size, seed = 7 }: { size: number; seed?: number }) {
  const n = 29;
  let s = seed;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const finder = (r: number, c: number) => {
    for (const [fr, fc] of [[0, 0], [0, n - 7], [n - 7, 0]]) {
      if (r >= fr && r < fr + 7 && c >= fc && c < fc + 7) {
        const rr = r - fr, cc = c - fc;
        return rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) ? 1 : 0;
      }
      if (r >= fr - 1 && r <= fr + 7 && c >= fc - 1 && c <= fc + 7) return 0;
    }
    return -1;
  };
  const cells: [number, number][] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    const f = finder(r, c);
    if (f === 1 || (f === -1 && rand() > 0.52)) cells.push([r, c]);
  }
  return (
    <svg width={size} height={size} viewBox={`-2 -2 ${n + 4} ${n + 4}`} style={{ background: "#fff", borderRadius: 8 }} shapeRendering="crispEdges">
      {cells.map(([r, c]) => <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill={C.ink} />)}
    </svg>
  );
}

/** A simple drawn map: streets, the cafe, the free-delivery circle, and the customer's pin dropping in at `at` */
export function MiniMap({ width, height, at }: { width: number; height: number; at: number }) {
  const p = useEnter(at, 12);
  const cx = width * 0.42, cy = height * 0.55;
  const px = width * 0.68, py = height * 0.34;
  return (
    <div style={{ position: "relative", width, height, overflow: "hidden", borderRadius: 14, background: "#efe3cf" }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {[0.18, 0.42, 0.7, 0.9].map((f) => <line key={`h${f}`} x1={0} x2={width} y1={height * f} y2={height * f + 30} stroke={C.paper} strokeWidth={14} />)}
        {[0.12, 0.36, 0.6, 0.84].map((f) => <line key={`v${f}`} y1={0} y2={height} x1={width * f} x2={width * f - 40} stroke={C.paper} strokeWidth={12} />)}
        <line x1={0} y1={height * 0.62} x2={width} y2={height * 0.2} stroke="#f6e9d2" strokeWidth={26} />
        <circle cx={cx} cy={cy} r={Math.min(width, height) * 0.3} fill="rgba(207, 157, 87, 0.12)" stroke={C.gold} strokeWidth={2} strokeDasharray="8 8" />
      </svg>
      <span style={{ position: "absolute", left: cx - 22, top: cy - 22, width: 44, height: 44, borderRadius: 22, background: C.ink, color: C.gold, display: "grid", placeItems: "center", boxShadow: "0 6px 12px -4px rgba(0,0,0,.4)" }}>
        <CupIcon size={24} />
      </span>
      <span style={{ position: "absolute", left: px - 14, top: py + 30, width: 28, height: 9, borderRadius: "50%", background: "rgba(21, 18, 17, 0.25)", transform: `scale(${p})` }} />
      <svg width="48" height="60" viewBox="0 0 24 30" style={{ position: "absolute", left: px - 24, top: py - 30 + interpolate(p, [0, 1], [-90, 0]), opacity: interpolate(p, [0, 0.2], [0, 1], { extrapolateRight: "clamp" }) }}>
        <path d="M12 29s-10-8.6-10-16.6a10 10 0 0 1 20 0C22 20.4 12 29 12 29z" fill={C.brown} stroke={C.cream} strokeWidth="1.5" />
        <circle cx="12" cy="12.4" r="3.6" fill={C.cream} />
      </svg>
    </div>
  );
}

/** The floating "Your order" bubble from the website */
export function OrderBubble({ code, status, unread = 0, at, style }: { code: string; status: string; unread?: number; at: number; style?: CSSProperties }) {
  const p = useEnter(at, 20);
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 14, padding: "8px 26px 8px 8px", borderRadius: 999, background: C.ink, color: C.cream,
        border: "1px solid rgba(207, 157, 87, 0.45)", boxShadow: "0 18px 36px -18px rgba(21, 18, 17, 0.75)",
        opacity: interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: "clamp" }), transform: `translateY(${interpolate(p, [0, 1], [20, 0])}px) scale(${interpolate(p, [0, 1], [0.96, 1])})`, ...style,
      }}
    >
      <span style={{ position: "relative", width: 56, height: 56, borderRadius: 28, background: C.gold, color: C.ink, display: "grid", placeItems: "center" }}>
        <CupIcon size={30} />
        {unread > 0 && <b style={{ position: "absolute", top: -6, right: -6, minWidth: 24, height: 24, padding: "0 6px", borderRadius: 12, border: `2px solid ${C.ink}`, background: C.brown, color: C.cream, fontFamily: FONT, fontSize: 13, display: "grid", placeItems: "center" }}>{unread}</b>}
      </span>
      <span style={{ display: "grid", fontFamily: FONT }}>
        <span style={{ ...label(13, C.card), letterSpacing: "0.18em", fontWeight: 600 }}>Your order <b style={{ color: C.gold, letterSpacing: "0.08em" }}>{code}</b></span>
        <span style={{ fontWeight: 600, fontSize: 19 }}>{status}</span>
      </span>
    </div>
  );
}

/** On-screen caption: a short line that rises in at `at` and leaves at `out` */
export function Caption({ text, at, out = 10_000, size = 50, style }: { text: string; at: number; out?: number; size?: number; style?: CSSProperties }) {
  const p = useInOut(at, out, 200);
  return (
    <div
      style={{
        position: "absolute", zIndex: 100, display: "inline-flex", alignItems: "center", gap: 18, padding: `${size * 0.42}px ${size * 0.7}px`, borderRadius: 999,
        background: C.ink, color: C.cream, fontFamily: FONT, fontWeight: 600, fontSize: size, letterSpacing: "-0.01em", lineHeight: 1.15,
        boxShadow: "0 24px 50px -24px rgba(21, 18, 17, 0.8)",
        opacity: interpolate(p, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }), transform: `translateY(${interpolate(p, [0, 1], [24, 0])}px)`, ...style,
      }}
    >
      <span style={{ width: size * 0.22, height: size * 0.22, borderRadius: "50%", background: C.gold, flex: "none" }} />
      {text}
    </div>
  );
}
