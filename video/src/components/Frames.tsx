import type { CSSProperties, ReactNode } from "react";
import { Img, staticFile } from "remotion";
import { C, FONT, label } from "../brand";
import { LockIcon } from "./Icons";

/** A plain desktop browser showing the cafe's website */
export function BrowserFrame({ width, height, url = "eneromarso.cafe", children, style }: { width: number; height: number; url?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        width, height, display: "flex", flexDirection: "column", overflow: "hidden", borderRadius: 18, background: C.sand,
        boxShadow: "0 50px 90px -40px rgba(21, 18, 17, 0.6), 0 0 0 1px rgba(21, 18, 17, 0.14)", ...style,
      }}
    >
      <div style={{ flex: "none", height: 58, display: "flex", alignItems: "center", gap: 20, padding: "0 22px", background: "#efe3cf", borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: "flex", gap: 9 }}>
          {["#d9a28a", "#e4c27a", "#a9c39a"].map((c) => <span key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />)}
        </div>
        <div style={{ flex: 1, maxWidth: 640, height: 36, display: "flex", alignItems: "center", gap: 10, padding: "0 18px", borderRadius: 18, background: C.paper, color: C.cocoa, fontFamily: FONT, fontSize: 17, fontWeight: 500 }}>
          <LockIcon size={16} />
          {url}
        </div>
      </div>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>{children}</div>
    </div>
  );
}

/** A modern phone: rounded screen, island, status bar */
export function PhoneFrame({ width = 430, height = 900, children, statusDark = true, style }: { width?: number; height?: number; children: ReactNode; statusDark?: boolean; style?: CSSProperties }) {
  return (
    <div style={{ width, height, padding: 12, borderRadius: 66, background: C.ink, boxShadow: "0 60px 100px -40px rgba(21, 18, 17, 0.7), inset 0 0 0 2px #3a332e", ...style }}>
      <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", borderRadius: 54, background: C.sand }}>
        {children}
        <div style={{ position: "absolute", zIndex: 60, top: 0, left: 0, right: 0, height: 54, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px 0 40px", color: statusDark ? C.cream : C.ink, fontFamily: FONT, fontWeight: 600, fontSize: 17, pointerEvents: "none" }}>
          <span>3:12</span>
          <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
              {[6, 9, 12, 15].map((h) => <span key={h} style={{ width: 3.5, height: h, borderRadius: 1, background: "currentColor" }} />)}
            </span>
            <span style={{ width: 26, height: 13, borderRadius: 4, border: "1.5px solid currentColor", padding: 1.5, display: "flex" }}>
              <span style={{ width: "75%", background: "currentColor", borderRadius: 1.5 }} />
            </span>
          </span>
        </div>
        <div style={{ position: "absolute", zIndex: 61, top: 12, left: "50%", width: 122, height: 34, marginLeft: -61, borderRadius: 17, background: "#000" }} />
      </div>
    </div>
  );
}

/** The website's dark top bar: gold logo, "Order" pill, menu button */
export function SiteBar({ height = 76 }: { height?: number }) {
  return (
    <div style={{ height, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 34px", background: C.ink }}>
      <Img src={staticFile("brand/enero-marso-monogram-gold.png")} style={{ height: height * 0.62 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ padding: "11px 26px", borderRadius: 999, background: C.gold, ...label(15, C.ink), letterSpacing: "0.22em" }}>Order</span>
        <span style={{ width: 44, height: 44, borderRadius: 22, border: `1.5px solid ${C.gold}`, display: "grid", placeItems: "center" }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </span>
      </div>
    </div>
  );
}

/** The staff app's dark header with the gold monogram, as installed on a phone */
export function StaffHeader({ active = "Orders" }: { active?: string }) {
  return (
    <div style={{ paddingTop: 60, background: C.ink }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 22px 12px" }}>
        <Img src={staticFile("brand/enero-marso-monogram-gold.png")} style={{ height: 38 }} />
        <span style={{ ...label(15, C.cream), letterSpacing: "0.24em" }}>Enero Marso</span>
        <span style={{ ...label(12, C.gold), letterSpacing: "0.26em" }}>Staff</span>
      </div>
      <div style={{ display: "flex", gap: 6, padding: "0 14px 14px" }}>
        {["Today", "Orders", "Menu", "Hours"].map((t) => (
          <span key={t} style={{ padding: "9px 15px", borderRadius: 999, fontFamily: FONT, fontWeight: 600, fontSize: 16, background: t === active ? C.cream : "transparent", color: t === active ? C.ink : C.cream }}>{t}</span>
        ))}
      </div>
    </div>
  );
}
