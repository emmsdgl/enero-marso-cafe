import type { CSSProperties, ReactNode } from "react";
import { interpolate } from "remotion";
import { C, label } from "../brand";
import { PlusIcon } from "../components/Icons";
import { phoneSections, site } from "../content";

/*
 * The checkout on a phone (web/src/components/order/Checkout.tsx), at fixed sizes.
 * The page scrolls as one column; these are column coordinates (add TOP and take away the scroll for the screen).
 * The main card sits at x 14, y 96, 418 wide. A menu section starting at `m` has its chips at m + 44 and its list at m + 112.
 */
export const MAINCARD = { x: 14, y: 96, w: 418 };
export const PAD = 18; // the card's side padding (inside its 3 px border)
export const ROW = 60;
export const OPTIONS = 128; // a drink's sizes and Add button, open
export const SIZE_CHIP = { w: 96, h: 50, gap: 8 };
export const menuAt = (m: number) => ({ chips: m + 44, note: m + 88, list: m + 112 });

const cardStyle: CSSProperties = {
  position: "absolute", left: MAINCARD.x, width: MAINCARD.w, boxSizing: "border-box", background: C.cream,
  border: `3px solid ${C.ink}`, outline: `1px solid ${C.ink}`, outlineOffset: 5,
};

export function MainCard({ top = MAINCARD.y, children }: { top?: number; children: ReactNode }) {
  return <div style={{ ...cardStyle, top }}>{children}</div>;
}

/** "Pickup at / Delivery from Enero Marso Cafe" with the Change button (84 tall) */
export function SetupRow({ how, when }: { how: "pickup" | "delivery"; when: string }) {
  return (
    <div style={{ height: 84, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: `0 ${PAD}px`, borderBottom: `2px solid ${C.ink}` }}>
      <span style={{ display: "grid", gap: 1, minWidth: 0 }}>
        <span style={label(11)}>{how === "pickup" ? "Pickup at" : "Delivery from"}</span>
        <b style={{ fontSize: 17 }}>{site.cafe}</b>
        <small style={{ fontSize: 13, color: C.cocoa, whiteSpace: "nowrap" }}>{when}</small>
      </span>
      <span style={{ flex: "none", padding: "8px 14px", border: `1.5px solid ${C.ink}`, borderRadius: 999, ...label(11, C.ink), letterSpacing: "0.14em" }}>Change</span>
    </div>
  );
}

/** A fieldset heading inside the card ("Menu", "Deliver to") */
export const Legend = ({ children }: { children: ReactNode }) => <div style={{ height: 16, ...label(12), letterSpacing: "0.22em" }}>{children}</div>;

/**
 * The menu section's chips. They scroll sideways: `swipe` 0 → 1 slides them so the last chip ends at the right edge.
 * The real row fades out on the right; the fade lifts as the row reaches its end.
 */
export function Chips({ active, swipe = 0 }: { active: string; swipe?: number }) {
  const width = MAINCARD.w - 6 - PAD * 2;
  const fade = interpolate(swipe, [0, 1], [82, 100]);
  return (
    <div style={{ position: "relative", height: 34, overflow: "hidden", WebkitMaskImage: `linear-gradient(to right, #000 ${fade}%, transparent)` }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: "max-content", display: "flex", gap: 6, transform: `translateX(calc(${-swipe} * (100% - ${width}px)))` }}>
        {phoneSections.map((s) => (
          <span key={s} style={{ flex: "none", height: 34, boxSizing: "border-box", display: "grid", placeItems: "center", padding: "0 14px", borderRadius: 999, border: `1.5px solid ${C.ink}`, background: s === active ? C.ink : "transparent", ...label(11, s === active ? C.cream : C.ink), letterSpacing: "0.1em", fontWeight: 600 }}>{s}</span>
        ))}
      </div>
    </div>
  );
}

/** A drink row: name, "from ₱115", and the round + that turns into × while open (0 → 1) */
export function DrinkRow({ name, from, open = 0 }: { name: string; from: number; open?: number }) {
  return (
    <div style={{ height: ROW, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(21, 18, 17, 0.2)" }}>
      <b style={{ flex: 1, fontSize: 14, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{name}</b>
      <span style={{ fontWeight: 700, fontSize: 13, color: C.brown }}>from ₱{from}</span>
      <span style={{ width: 34, height: 34, borderRadius: 17, display: "grid", placeItems: "center", background: open > 0.5 ? C.ink : C.brown, color: C.cream, transform: `rotate(${open * 45}deg)` }}>
        <PlusIcon size={16} />
      </span>
    </div>
  );
}

/** A drink's sizes and its Add button, growing open (0 → 1) */
export function DrinkOptions({ sizes, chosen, open }: { sizes: readonly (readonly [string, number])[]; chosen: number; open: number }) {
  return (
    <div style={{ height: OPTIONS * Math.max(0, open), overflow: "hidden", borderBottom: open > 0.02 ? "1px solid rgba(21, 18, 17, 0.2)" : undefined }}>
      <div style={{ paddingTop: 6, display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: SIZE_CHIP.gap }}>
          {sizes.map(([s, p], n) => (
            <span key={s} style={{ width: SIZE_CHIP.w, height: SIZE_CHIP.h, boxSizing: "border-box", display: "grid", placeItems: "center", alignContent: "center", borderRadius: 10, border: `1.5px solid ${C.ink}`, background: n === chosen ? C.ink : "transparent", color: n === chosen ? C.cream : C.ink, fontWeight: 600, fontSize: 13 }}>
              {s}
              <small style={{ fontWeight: 700, fontSize: 12, color: n === chosen ? C.gold : C.brown }}>₱{p}</small>
            </span>
          ))}
        </div>
        <span style={{ width: 168, height: 42, display: "grid", placeItems: "center", borderRadius: 999, background: C.brown, ...label(12, C.cream), letterSpacing: "0.14em" }}>
          Add · ₱{sizes[chosen][1]}
        </span>
      </div>
    </div>
  );
}
/** Where a drink's options put their size chips and Add button, from the top of the open row's options */
export const sizeChipX = (n: number) => MAINCARD.x + 3 + PAD + n * (SIZE_CHIP.w + SIZE_CHIP.gap) + SIZE_CHIP.w / 2;
export const OPT_SIZE_Y = 6 + SIZE_CHIP.h / 2;
export const OPT_ADD = { x: MAINCARD.x + 3 + PAD + 84, y: 6 + SIZE_CHIP.h + 12 + 21 };

/** A food row with no sizes: its own Add button */
export function SnackRow({ name, note, price, pressed = false }: { name: string; note?: string | null; price: number; pressed?: boolean }) {
  return (
    <div style={{ height: ROW, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(21, 18, 17, 0.2)" }}>
      <span style={{ flex: 1, display: "grid", minWidth: 0 }}>
        <b style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", lineHeight: 1.25 }}>{name}</b>
        {note && <small style={{ fontSize: 12, color: C.cocoa }}>{note}</small>}
      </span>
      <span style={{ fontWeight: 700, fontSize: 13, color: C.brown }}>₱{price}</span>
      <span style={{ width: 60, height: 32, display: "grid", placeItems: "center", borderRadius: 999, background: pressed ? C.ink : C.brown, ...label(11, C.cream), letterSpacing: "0.16em" }}>Add</span>
    </div>
  );
}
/** The middle of a row's round + or Add button, across the screen */
export const ROW_BUTTON_X = MAINCARD.x + MAINCARD.w - 3 - PAD - 17;
export const ADD_BUTTON_X = MAINCARD.x + MAINCARD.w - 3 - PAD - 30;

/** The Your order slip, below the main card: fixed height, its button at the bottom */
export function Slip({ top, height, button, pressed, off = false, children }: { top: number; height: number; button: string; pressed: boolean; off?: boolean; children: ReactNode }) {
  return (
    <div style={{ ...cardStyle, top, height, padding: "20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <b style={{ fontSize: 21 }}>Your order</b>
      {children}
      <span style={{ flex: "none", height: 52, display: "grid", placeItems: "center", borderRadius: 999, background: off ? C.card : pressed ? C.ink : C.brown, ...label(13, off ? C.cocoa : C.cream), letterSpacing: "0.14em" }}>{button}</span>
    </div>
  );
}
/** The slip's button middle, from the slip's top */
export const slipButtonY = (height: number) => height - 23 - 26;
