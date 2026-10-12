import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, label } from "../brand";
import { BrowserFrame, SiteBar } from "../components/Frames";
import { useEnter } from "../components/motion";
import { Caption, Cursor, MiniMap } from "../components/Parts";
import { OrderAheadTitle, useTyped } from "../components/Screens";
import { delivery, site } from "../content";
import { BROWSER, CONTENT, Field, MAIN, SLIP } from "./CustomerOrder";

const MAP = { w: MAIN.w - 72, h: 230 };
const MAP_TOP = 100 + 2 + 22 + 18 + 14; // inside the main card: summary, border, padding, legend, gap
const T = { tap: 30, reach: 50, type: 62 };
// Where the pin lands: MiniMap puts it at 68% across, 34% down
const PIN = { x: CONTENT.x + MAIN.x + 36 + MAP.w * 0.68, y: CONTENT.y + MAIN.y + MAP_TOP + MAP.h * 0.34 + 18 };

/** Delivery checkout: tap the map to drop a pin, see the distance, type the address (5 s) */
export function PinDrop({ caption }: { caption: string }) {
  const frame = useCurrentFrame();
  const reach = useEnter(T.reach, 200);
  const address = useTyped(delivery.address, T.type, 0.6);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, #eadac3, ${C.sand} 72%)` }}>
      <div style={{ position: "absolute", left: BROWSER.x, top: BROWSER.y }}>
        <BrowserFrame width={BROWSER.w} height={BROWSER.h} url={`${site.url}/order`}>
          <SiteBar />
          <div style={{ position: "absolute", inset: "76px 0 0", fontFamily: FONT }}>
            <div style={{ position: "absolute", top: 16, left: 0, right: 0 }}><OrderAheadTitle size={44} /></div>
            <div style={{ position: "absolute", left: MAIN.x, top: MAIN.y - 76, width: MAIN.w, height: MAIN.h, overflow: "hidden", background: C.cream, border: `3px solid ${C.ink}`, outline: `1px solid ${C.ink}`, outlineOffset: 6 }}>
              <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px" }}>
                <span style={{ display: "grid", gap: 2 }}>
                  <span style={label(12)}>Delivery from</span>
                  <b style={{ fontSize: 22 }}>{site.cafe}</b>
                  <span style={{ fontSize: 16, color: C.cocoa }}>As soon as possible</span>
                </span>
                <span style={{ padding: "10px 20px", border: `1.5px solid ${C.ink}`, borderRadius: 999, ...label(12, C.ink), letterSpacing: "0.14em" }}>Change</span>
              </div>
              <div style={{ borderTop: `2px solid ${C.ink}`, padding: "22px 36px 0", display: "grid", gap: 14 }}>
                <div style={{ height: 18, ...label(13) }}>Deliver to</div>
                <MiniMap width={MAP.w} height={MAP.h} at={T.tap} />
                <p style={{ margin: 0, minHeight: 48, padding: "12px 16px", background: "#e6efe2", color: "#24461a", fontSize: 16, fontWeight: 500, opacity: reach, transform: `translateY(${(1 - reach) * 10}px)` }}>{delivery.reach}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
                  <Field name="Address" value={address || " "} />
                  <Field name="Landmark (optional)" value={frame > T.type + 70 ? "Blue gate" : " "} />
                </div>
              </div>
            </div>
            <div style={{ position: "absolute", left: SLIP.x, top: SLIP.y - 76, width: SLIP.w, height: SLIP.h, padding: "28px 30px", display: "grid", alignContent: "start", gap: 16, background: C.cream, border: `3px solid ${C.ink}`, outline: `1px solid ${C.ink}`, outlineOffset: 6 }}>
              <b style={{ fontSize: 24 }}>Your order</b>
              <span style={{ display: "grid", fontSize: 16 }}>
                Delivery from {site.cafe}
                <small style={{ fontSize: 14, color: C.cocoa }}>{address || "Set your address and pin"}</small>
              </span>
              <p style={{ margin: 0, paddingTop: 14, borderTop: `1px solid ${C.ink}`, fontSize: 15, color: C.cocoa }}>Nothing yet. Choose a drink or a dish, then tap Add.</p>
            </div>
          </div>
        </BrowserFrame>
      </div>
      <Cursor points={[{ x: 1250, y: 760, at: 6 }, { x: PIN.x, y: PIN.y, at: T.tap - 4 }, { x: PIN.x - 60, y: PIN.y + 330, at: T.type + 20 }]} clicks={[T.tap]} />
      <Caption text={caption} at={16} out={140} style={{ left: 120, bottom: 54 }} />
    </AbsoluteFill>
  );
}
