import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, FONT, label } from "../brand";
import { BrowserFrame, SiteBar } from "../components/Frames";
import { PlusIcon } from "../components/Icons";
import { useEnter } from "../components/motion";
import { Caption, Cursor } from "../components/Parts";
import { OrderAheadTitle, TrackCard, useSwap } from "../components/Screens";
import { customer, delivery, menuRows, menuSections, site, stepsDelivery } from "../content";

// The browser and its two cards sit at fixed spots, so the pointer can land exactly on the buttons
export const BROWSER = { x: 160, y: 70, w: 1600, h: 940 };
export const CONTENT = { x: BROWSER.x, y: BROWSER.y + 58 };
export const MAIN = { x: 70, y: 220, w: 930, h: 640 };
export const SLIP = { x: 1060, y: 220, w: 470, h: 640 };
const ROW = 76;
const LIST_TOP = 240; // inside MAIN
const OPTIONS = 152; // the White Mocha options, open
const abs = (box: { x: number; y: number }, x: number, y: number) => ({ x: CONTENT.x + box.x + x, y: CONTENT.y + box.y + y });

// What the pointer does, in frames
const T = { open: 60, large: 92, add: 116, second: 150, third: 172, send: 220, page: 228 };
const PLUS = abs(MAIN, MAIN.w - 36 - 22, LIST_TOP + ROW * 1.5);
const LARGE = abs(MAIN, 36 + 132 * 2 + 20 + 66, LIST_TOP + ROW * 2 + 6 + 31);
const ADD = abs(MAIN, 36 + 100, LIST_TOP + ROW * 2 + 6 + 62 + 14 + 26);
const SEND = abs(SLIP, SLIP.w / 2, SLIP.h - 28 - 28);

/** A customer orders on the website: opens White Mocha, picks Large, adds it (two more follow), sends the order (12 s) */
export function CustomerOrder({ caption }: { caption: string }) {
  const frame = useCurrentFrame();
  const enter = useEnter(0);
  const toPage = useSwap(T.page, 14);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 30%, #eadac3, ${C.sand} 72%)` }}>
      <div style={{ position: "absolute", left: BROWSER.x, top: BROWSER.y, opacity: enter, transform: `translateY(${(1 - enter) * 40}px)` }}>
        <BrowserFrame width={BROWSER.w} height={BROWSER.h} url={`${site.url}/order`}>
          <SiteBar />
          <div style={{ position: "absolute", inset: "76px 0 0", opacity: 1 - toPage }}>
            <div style={{ position: "absolute", top: 92 - 76, left: 0, right: 0 }}><OrderAheadTitle size={44} /></div>
            <MainCard frame={frame} />
            <SlipCard frame={frame} />
          </div>
          {toPage > 0 && (
            <div style={{ position: "absolute", inset: "76px 0 0", display: "grid", justifyItems: "center", alignContent: "start", paddingTop: 50, opacity: toPage }}>
              <TrackCard code={delivery.code} headline={delivery.headlines.sent} steps={stepsDelivery} progress={1} width={860}>
                <dl style={{ margin: 0, borderTop: `1px solid ${C.ink}` }}>
                  <Fact term="Deliver to">{delivery.address}</Fact>
                  <Fact term="Items">{delivery.items.length} items · ₱{delivery.subtotal}</Fact>
                </dl>
                <p style={{ margin: 0, fontSize: 17, color: C.cocoa }}>You&rsquo;ll pay by GCash, Maya or bank transfer once the cafe confirms the delivery fee. Nothing to pay yet.</p>
              </TrackCard>
            </div>
          )}
        </BrowserFrame>
      </div>
      <Cursor
        points={[
          { x: 1320, y: 560, at: 24 }, { x: PLUS.x, y: PLUS.y, at: T.open - 4 },
          { x: LARGE.x, y: LARGE.y, at: T.large - 4 }, { x: ADD.x, y: ADD.y, at: T.add - 4 },
          { x: SEND.x, y: SEND.y, at: T.send - 4 }, { x: SEND.x + 40, y: SEND.y - 160, at: T.send + 40 },
        ]}
        clicks={[T.open, T.large, T.add, T.send]}
      />
      <Caption text={caption} at={34} out={340} style={{ left: 120, bottom: 54 }} />
    </AbsoluteFill>
  );
}

function MainCard({ frame }: { frame: number }) {
  const open = useEnter(T.open, 200) - useEnter(T.add + 14, 200);
  const large = frame >= T.large;
  return (
    <div style={{ position: "absolute", left: MAIN.x, top: MAIN.y - 76, width: MAIN.w, height: MAIN.h, overflow: "hidden", background: C.cream, border: `3px solid ${C.ink}`, outline: `1px solid ${C.ink}`, outlineOffset: 6, fontFamily: FONT }}>
      <div style={{ height: 100, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px" }}>
        <span style={{ display: "grid", gap: 2 }}>
          <span style={label(12)}>Delivery from</span>
          <b style={{ fontSize: 22 }}>{site.cafe}</b>
          <span style={{ fontSize: 16, color: C.cocoa }}>As soon as possible</span>
        </span>
        <span style={{ padding: "10px 20px", border: `1.5px solid ${C.ink}`, borderRadius: 999, ...label(12, C.ink), letterSpacing: "0.14em" }}>Change</span>
      </div>
      <div style={{ borderTop: `2px solid ${C.ink}`, padding: "22px 36px 0" }}>
        <div style={{ height: 18, ...label(13) }}>Menu</div>
        <div style={{ height: 44, marginTop: 14, display: "flex", gap: 8, overflow: "hidden", WebkitMaskImage: "linear-gradient(to right, #000 85%, transparent)" }}>
          {menuSections.map((s, i) => (
            <span key={s} style={{ flex: "none", display: "grid", placeItems: "center", padding: "0 18px", borderRadius: 999, border: `1.5px solid ${C.ink}`, background: i === 0 ? C.ink : "transparent", ...label(13, i === 0 ? C.cream : C.ink), letterSpacing: "0.12em" }}>{s}</span>
          ))}
        </div>
        <div style={{ height: 16, marginTop: 12, ...label(12, C.cocoa), letterSpacing: "0.1em", fontWeight: 600 }}>Hot or iced</div>
        <div style={{ position: "absolute", left: 36, right: 36, top: LIST_TOP, borderTop: `1px solid ${C.ink}` }}>
          {menuRows.map((r, i) => (
            <div key={r.name}>
              <div style={{ height: ROW, display: "flex", alignItems: "center", gap: 16, borderBottom: `1px solid rgba(21, 18, 17, 0.2)` }}>
                <b style={{ flex: 1, fontSize: 18, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{r.name}</b>
                <span style={{ fontWeight: 700, fontSize: 17, color: C.brown }}>from ₱{r.sizes[0][1]}</span>
                <span style={{ width: 44, height: 44, borderRadius: 22, display: "grid", placeItems: "center", background: i === 1 && open > 0.5 ? C.ink : C.brown, color: C.cream, transform: `rotate(${i === 1 ? open * 45 : 0}deg)` }}>
                  <PlusIcon size={20} />
                </span>
              </div>
              {i === 1 && (
                <div style={{ height: OPTIONS * Math.max(0, open), overflow: "hidden" }}>
                  <div style={{ paddingTop: 6, display: "grid", gap: 14 }}>
                    <div style={{ display: "flex", gap: 10 }}>
                      {r.sizes.map(([s, p], n) => {
                        const on = large ? n === 2 : n === 0;
                        return (
                          <span key={s} style={{ width: 132, height: 62, display: "grid", placeItems: "center", alignContent: "center", borderRadius: 10, border: `1.5px solid ${C.ink}`, background: on ? C.ink : "transparent", color: on ? C.cream : C.ink, fontWeight: 600, fontSize: 15 }}>
                            {s}
                            <small style={{ fontWeight: 700, fontSize: 14, color: on ? C.gold : C.brown }}>₱{p}</small>
                          </span>
                        );
                      })}
                    </div>
                    <span style={{ width: 200, height: 52, display: "grid", placeItems: "center", borderRadius: 999, background: C.brown, ...label(13, C.cream), letterSpacing: "0.14em" }}>
                      Add · ₱{large ? r.sizes[2][1] : r.sizes[0][1]}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlipCard({ frame }: { frame: number }) {
  const lines = delivery.items.map((item, i) => ({ ...item, at: [T.add + 2, T.second, T.third][i] }));
  const shown = lines.filter((l) => frame >= l.at);
  const total = shown.reduce((n, l) => n + l.price, 0);
  return (
    <div style={{ position: "absolute", left: SLIP.x, top: SLIP.y - 76, width: SLIP.w, height: SLIP.h, padding: "28px 30px", display: "flex", flexDirection: "column", gap: 16, background: C.cream, border: `3px solid ${C.ink}`, outline: `1px solid ${C.ink}`, outlineOffset: 6, fontFamily: FONT }}>
      <b style={{ fontSize: 24 }}>Your order</b>
      <span style={{ display: "grid", fontSize: 16 }}>
        Delivery from {site.cafe}
        <small style={{ fontSize: 14, color: C.cocoa }}>{delivery.address}</small>
      </span>
      <div style={{ minHeight: 200, borderTop: `1px solid ${C.ink}` }}>
        {shown.length === 0 && <p style={{ margin: "14px 0 0", fontSize: 15, color: C.cocoa }}>Nothing yet. Choose a drink or a dish, then tap Add.</p>}
        {lines.map((l) => (
          <SlipLine key={l.name} at={l.at} name={l.name} detail={l.size} price={l.price} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field name="Name" value={customer.name} />
        <Field name="Mobile number" value={customer.phone} />
      </div>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 10, borderTop: `2px solid ${C.ink}` }}>
        <span style={{ fontWeight: 600, fontSize: 17 }}>Items</span>
        <b style={{ fontSize: 22 }}>₱{total}</b>
      </div>
      <span style={{ height: 56, display: "grid", placeItems: "center", borderRadius: 999, background: shown.length ? (frame >= T.send ? C.ink : C.brown) : C.card, ...label(14, shown.length ? C.cream : C.cocoa), letterSpacing: "0.14em" }}>
        {shown.length ? "Send order" : "Add an item to order"}
      </span>
    </div>
  );
}

function SlipLine({ at, name, detail, price }: { at: number; name: string; detail: string | null; price: number }) {
  const p = useEnter(at, 16);
  if (p <= 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(21, 18, 17, 0.2)", opacity: p, transform: `translateX(${(1 - p) * 24}px)` }}>
      <span style={{ flex: 1, display: "grid", fontSize: 16, fontWeight: 500 }}>
        {name}
        {detail && <small style={{ fontSize: 13, color: C.cocoa }}>{detail}</small>}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15 }}>
        <Step>−</Step>1<Step>+</Step>
      </span>
      <b style={{ width: 54, textAlign: "right", fontSize: 16 }}>₱{price}</b>
    </div>
  );
}

const Step = ({ children }: { children: ReactNode }) => (
  <span style={{ width: 26, height: 26, borderRadius: 13, border: `1.5px solid ${C.ink}`, display: "grid", placeItems: "center", fontSize: 15, lineHeight: 1 }}>{children}</span>
);

export const Field = ({ name, value }: { name: string; value: string }) => (
  <span style={{ display: "grid", gap: 5, fontSize: 13, fontWeight: 600 }}>
    {name}
    <span style={{ padding: "10px 12px", border: "1.5px solid rgba(21, 18, 17, 0.3)", background: C.paper, fontSize: 15, fontWeight: 500 }}>{value}</span>
  </span>
);

const Fact = ({ term, children }: { term: string; children: ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 16, padding: "12px 0", borderBottom: "1px solid rgba(21, 18, 17, 0.18)" }}>
    <dt style={{ ...label(12), letterSpacing: "0.18em", paddingTop: 3 }}>{term}</dt>
    <dd style={{ margin: 0, fontSize: 18, fontWeight: 500 }}>{children}</dd>
  </div>
);

