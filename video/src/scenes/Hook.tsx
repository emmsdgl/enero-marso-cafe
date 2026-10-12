import { AbsoluteFill, Img, interpolate, staticFile, useVideoConfig } from "remotion";
import { C, FONT, SCRIPT } from "../brand";
import { useEnter } from "../components/motion";

/** The gold logo appears on dark, rises, and the line comes in under it (about 5 s; `pace` 0.5 fits it in the reels' 3 s) */
export function Hook({ lead, script, pace = 1 }: { lead: string; script: string; pace?: number }) {
  const { width, height } = useVideoConfig();
  const tall = height > width;
  const logoIn = useEnter(4 * pace);
  const rise = useEnter(50 * pace);
  const leadIn = useEnter(64 * pace);
  const scriptIn = useEnter(82 * pace);
  const logo = (tall ? width * 0.62 : height * 0.46) * interpolate(rise, [0, 1], [1, 0.66]);
  const leadSize = tall ? 66 : 62;
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center" }}>
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 42%, rgba(207, 157, 87, 0.16), transparent 62%)" }} />
      <div style={{ display: "grid", justifyItems: "center", textAlign: "center", transform: `translateY(${interpolate(rise, [0, 1], [height * 0.13, 0])}px)` }}>
        <Img
          src={staticFile("brand/enero-marso-logo-gold.png")}
          style={{ height: logo, opacity: interpolate(logoIn, [0, 0.7], [0, 1], { extrapolateRight: "clamp" }), transform: `scale(${interpolate(logoIn, [0, 1], [0.95, 1])})` }}
        />
        <span style={{ marginTop: 44, maxWidth: tall ? width * 0.86 : undefined, opacity: leadIn, transform: `translateY(${(1 - leadIn) * 22}px)`, fontFamily: FONT, fontWeight: 600, fontSize: leadSize, lineHeight: 1.15, letterSpacing: "-0.01em", color: C.cream }}>
          {lead}
        </span>
        <span style={{ opacity: scriptIn, transform: `translateY(${(1 - scriptIn) * 22}px)`, fontFamily: SCRIPT, fontSize: leadSize * 1.8, lineHeight: 1.1, color: C.gold }}>{script}</span>
      </div>
    </AbsoluteFill>
  );
}
