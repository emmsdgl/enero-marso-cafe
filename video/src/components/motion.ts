import { spring, useCurrentFrame, useVideoConfig } from "remotion";

/** 0 → 1 from frame `at`, with a calm spring (no bounce) */
export function useEnter(at: number, damping = 200, durationInFrames?: number) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - at, fps, config: { damping }, durationInFrames });
}

/** 0 → 1 → 0: in at `at`, out at `out` */
export function useInOut(at: number, out: number, damping = 200) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inn = spring({ frame: frame - at, fps, config: { damping } });
  const leave = spring({ frame: frame - out, fps, config: { damping } });
  return Math.max(0, inn - leave);
}
