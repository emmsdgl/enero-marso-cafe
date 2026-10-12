import type { ReactNode } from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useVideoConfig } from "remotion";
import { C, FONT } from "../brand";
import { ChatIcon, CheckIcon, ReceiptIcon } from "../components/Icons";
import { useEnter } from "../components/motion";
import { site } from "../content";

const ICONS = [ChatIcon, CheckIcon, ReceiptIcon];

/**
 * The end card: the logo on ink, "Order now at" and the address. With `benefits`, the three benefits
 * come in under it at `benefitsAt` and the logo makes room (the pitch); without, it's the reels' 4 s call to action.
 */
export function Outro({ lead, benefits, benefitsAt = 96 }: { lead: string; benefits?: readonly string[]; benefitsAt?: number }) {
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const logoIn = useEnter(4);
  const leadIn = useEnter(20);
  const urlIn = useEnter(30);
  const rule = useEnter(42, 200, 24);
  const room = useEnter(benefitsAt, 200, 30);
  const hasBenefits = Boolean(benefits?.length);
  const logo = tall ? width * 0.5 : interpolate(hasBenefits ? room : 0, [0, 1], [height * 0.3, height * 0.22]);
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center", fontFamily: FONT }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 40%, rgba(207, 157, 87, 0.16), transparent 62%)" }} />
      <div style={{ position: "relative", display: "grid", justifyItems: "center", textAlign: "center" }}>
        <Img
          src={staticFile("brand/enero-marso-logo-gold.png")}
          style={{ height: logo, opacity: interpolate(logoIn, [0, 0.7], [0, 1], { extrapolateRight: "clamp" }), transform: `scale(${interpolate(logoIn, [0, 1], [0.95, 1])})` }}
        />
        <span style={{ marginTop: tall ? 70 : 40, opacity: leadIn, transform: `translateY(${(1 - leadIn) * 18}px)`, fontWeight: 600, fontSize: tall ? 54 : 42, color: C.cream }}>{lead}</span>
        <span style={{ marginTop: 6, opacity: urlIn, transform: `translateY(${(1 - urlIn) * 18}px)`, fontWeight: 700, fontSize: tall ? 92 : 84, letterSpacing: "0.01em", lineHeight: 1.1, color: C.gold }}>{site.url}</span>
        <span style={{ marginTop: 14, width: `${rule * (tall ? 62 : 46)}%`, height: 3, background: C.gold, opacity: 0.6 }} />
        {hasBenefits && (
          // Grows in, so the logo and address rise to make room instead of jumping
          <div style={{ maxHeight: room * 320, overflow: "hidden" }}>
            <div style={{ display: "flex", flexDirection: tall ? "column" : "row", gap: tall ? 34 : 70, paddingTop: tall ? 80 : 70 }}>
              {benefits!.map((b, i) => (
                <Benefit key={b} at={benefitsAt + 8 + i * 10} icon={ICONS[i % ICONS.length]}>{b}</Benefit>
              ))}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
}

function Benefit({ at, icon: Icon, children }: { at: number; icon: (p: { size?: number }) => ReactNode; children: ReactNode }) {
  const p = useEnter(at);
  return (
    <div style={{ width: 380, display: "grid", justifyItems: "center", gap: 18, opacity: p, transform: `translateY(${(1 - p) * 24}px)` }}>
      <span style={{ width: 78, height: 78, borderRadius: 39, border: `2px solid ${C.gold}`, color: C.gold, display: "grid", placeItems: "center" }}>
        <Icon size={36} />
      </span>
      <span style={{ fontWeight: 600, fontSize: 28, lineHeight: 1.3, color: C.cream, textWrap: "balance" }}>{children}</span>
    </div>
  );
}
