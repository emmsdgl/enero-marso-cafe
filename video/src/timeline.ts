/**
 * How long each scene runs, in seconds: change timing here. The videos and the voice-over both read this file.
 * (scripts/voice.mjs loads it straight into Node, so it imports nothing.)
 */
export const FPS = 30;
export const BLEND = 15; // frames each scene cross-fades into the next
export const SCREEN_BLEND = 10; // frames each phone screen cross-fades into the next, inside a reel

export const pitch = { hook: 5, problem: 6, pin: 5, order: 12, staff: 6, pay: 8, chat: 12, closes: 8, pickup: 6, outro: 9 };

// A reel: the hook, the phone (its screens play one after another inside it), then the end card
export const reelPickup = { hook: 3, screens: { order: 9, chat: 6, ready: 6 }, cta: 4 };
export const reelDelivery = { hook: 3, screens: { order: 9, pay: 6, out: 7, done: 5 }, cta: 4 };

export const sec = (seconds: number) => Math.round(seconds * FPS);

/** Total frames when each part cross-fades into the next over `blend` frames */
export const seriesLength = (lens: number[], blend: number) => lens.reduce((n, len) => n + len, 0) - blend * (lens.length - 1);

/** The frame each part starts on, counting the overlaps */
export const seriesStarts = (lens: number[], blend: number) => lens.map((_, i) => lens.slice(0, i).reduce((n, len) => n + len - blend, 0));

export type Timeline = { length: number; lens: Record<string, number>; starts: Record<string, number> };

/** The pitch: every scene's length and start frame, by name */
export function pitchTimeline(): Timeline {
  const ids = Object.keys(pitch) as (keyof typeof pitch)[];
  const lens = ids.map((id) => sec(pitch[id]));
  const starts = seriesStarts(lens, BLEND);
  return { length: seriesLength(lens, BLEND), lens: byId(ids, lens), starts: byId(ids, starts) };
}

/** A reel: the hook, each phone screen and the end card, by name. `phone` is the phone part's own length. */
export function reelTimeline(reel: { hook: number; screens: Record<string, number>; cta: number }): Timeline & { phone: number } {
  const ids = Object.keys(reel.screens);
  const screenLens = ids.map((id) => sec(reel.screens[id]));
  const phone = seriesLength(screenLens, SCREEN_BLEND);
  const parts = [sec(reel.hook), phone, sec(reel.cta)];
  const [hookAt, phoneAt, ctaAt] = seriesStarts(parts, BLEND);
  const screenStarts = seriesStarts(screenLens, SCREEN_BLEND).map((f) => phoneAt + f);
  return {
    length: seriesLength(parts, BLEND),
    phone,
    lens: { hook: parts[0], ...byId(ids, screenLens), cta: parts[2] },
    starts: { hook: hookAt, ...byId(ids, screenStarts), cta: ctaAt },
  };
}

const byId = (ids: string[], values: number[]) => Object.fromEntries(ids.map((id, i) => [id, values[i]]));
