import { branches } from "@/data/branches";
import type { Payload } from "./push-rules";
import type { Role } from "./roles";

/**
 * Push-to-talk (Staff > Talk and the counter tablet). Pure, so it's tested.
 * Each branch has one channel. The admin (the owner) is on every channel at any time; everyone
 * else is on their own branch's channel while they're clocked in; the counter tablet is always on
 * its branch's. One person talks at a time on a channel, for at most a minute per press.
 */
export const TALK_MAX_MS = 60_000;
export const FLOOR_GRACE_MS = 5_000; // the server holds the channel a little past the button's limit
export const PRESENCE_TTL_MS = 75_000; // a device that hasn't checked in for this long has left
export const HEARTBEAT_MS = 30_000;
export const CLIP_MIN_MS = 600; // shorter presses are taps, not talk: they aren't kept
export const CLIP_MAX_BYTES = 1_500_000;
export const CLIP_KEEP_DAYS = 7;
export const MIC_IDLE_MS = 30_000; // the microphone switches off this long after the last press


/** The channels someone may be on: every branch for the admin, their own branch while clocked in */
export function talkChannels(p: { role: Role; branchId: string | null }, clockedIn: boolean, all: readonly string[]): string[] {
  if (p.role === "admin") return [...all];
  return clockedIn && p.branchId ? [p.branchId] : [];
}

/** The admin picks one branch or both; anything not allowed is ignored, and nothing picked means all */
export function pickChannels(allowed: readonly string[], wanted: unknown): string[] {
  const asked = new Set(Array.isArray(wanted) ? wanted.filter((w): w is string => typeof w === "string") : []);
  const picked = allowed.filter((a) => asked.has(a));
  return picked.length ? picked : [...allowed];
}

export const shortBranch = (id: string) => branches.find((b) => b.id === id)?.name.replace("Enero Marso ", "") ?? id;
export const counterName = (branchId: string) => `Counter, ${shortBranch(branchId)}`;
export const channelsLabel = (ids: readonly string[]) => (ids.length > 1 ? "both branches" : ids.map(shortBranch).join(""));

/** "0:07", "1:00" */
export function clipLength(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** "Ana", "Ana and Ben", "Ana, Ben and Carlo" */
export function nameList(names: readonly string[]) {
  const n = [...new Set(names)];
  return n.length <= 1 ? (n[0] ?? "") : `${n.slice(0, -1).join(", ")} and ${n.at(-1)}`;
}

// The formats phones and computers record in (Safari: MP4/AAC; Chrome and Firefox: WebM or Ogg/Opus)
const CLIP_TYPE = /^audio\/(mp4|webm|ogg|aac)(;\s*codecs="?[\w.,\s-]+"?)?$/;

/** A recording someone sent: a known audio format, long enough to be talk, small enough to keep */
export function readClip(input: { mime: unknown; ms: unknown; bytes: number }): { mime: string; ms: number } | { error: string } {
  const mime = String(input.mime ?? "").trim().toLowerCase();
  const ms = Math.round(Number(input.ms));
  if (!CLIP_TYPE.test(mime)) return { error: "This browser recorded in a format we can't keep." };
  if (!Number.isFinite(ms) || ms < CLIP_MIN_MS) return { error: "Too short to keep." };
  if (input.bytes <= 0 || input.bytes > CLIP_MAX_BYTES) return { error: "That recording is too big to keep." };
  return { mime, ms: Math.min(ms, TALK_MAX_MS + FLOOR_GRACE_MS) };
}

/** Who holds the channel. `until` is in milliseconds; an expired hold means the channel is free. */
export type Floor = { branchId: string; sessionId: string; name: string; until: number };

/** Someone else talking on any of these channels right now, if anyone */
export function otherTalker(floor: readonly Floor[], channels: readonly string[], mySession: string | null, now: number): Floor | null {
  return floor.find((f) => channels.includes(f.branchId) && f.until > now && f.sessionId !== mySession) ?? null;
}

/** A device that can get a "missed talk" notification */
export type TalkDevice = { staffId: string; role: Role; branchId: string | null; active: boolean; talk: boolean; onShiftOnly: boolean };

/**
 * Who hears about a saved clip they weren't listening to: staff of its branch who are clocked in,
 * and the admin (unless they chose "only while I'm clocked in"). Never the person who spoke, and
 * never someone who heard it live.
 */
export function missedTalkRecipients<D extends TalkDevice>(
  devices: readonly D[],
  clip: { branches: readonly string[]; speakerId: string | null },
  onShift: ReadonlySet<string>,
  live: ReadonlySet<string>,
): D[] {
  return devices.filter(
    (d) =>
      d.active &&
      d.talk &&
      d.staffId !== clip.speakerId &&
      !live.has(d.staffId) &&
      (d.role === "admin"
        ? !d.onShiftOnly || onShift.has(d.staffId)
        : d.branchId !== null && clip.branches.includes(d.branchId) && onShift.has(d.staffId)),
  );
}

/** The lock screen says who and how long, nothing of what was said. Newer ones replace older ones. */
export function missedTalkPayload(clip: { id: string; name: string; ms: number; branches: readonly string[] }): Payload {
  return {
    kind: "talk",
    title: `Missed talk from ${clip.name}`,
    body: `${clipLength(clip.ms)} · ${clip.branches.map(shortBranch).join(" and ")}. Tap to play it.`,
    url: `/staff/talk#clip-${clip.id}`,
    tag: "talk",
  };
}
