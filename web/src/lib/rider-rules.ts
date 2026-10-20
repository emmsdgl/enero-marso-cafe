import { distanceMeters, formatDistance, inPhilippines, isLatLng, type LatLng } from "./delivery";

/**
 * The rider's live position on the customer's page. Pure, so it's tested.
 * The phone sends about every 15 s while the rider's screen is on; the customer's page asks every
 * 15 s. A position under a minute old is live; up to 15 minutes it shows as paused (a locked phone,
 * a dead spot); older than that it's gone.
 */
export const SEND_EVERY_MS = 15_000;
export const MIN_GAP_MS = 8_000; // the server ignores anything sooner (a phone sending too often)
export const LIVE_MS = 60_000;
export const PAUSED_MS = 15 * 60_000;
export const MAX_ACCURACY = 2000; // meters: a fix vaguer than this tells the customer nothing

export type Spot = LatLng & { accuracy: number };
export type SpotState = { state: "live" | "paused"; ageMs: number } | { state: "gone" };

export function spotState(ageMs: number | null): SpotState {
  if (ageMs === null || !Number.isFinite(ageMs) || ageMs > PAUSED_MS) return { state: "gone" };
  const age = Math.max(0, ageMs);
  return { state: age <= LIVE_MS ? "live" : "paused", ageMs: age };
}

/**
 * Whether the phone sends this fix: every 15 s or so, a little sooner if the rider has moved a
 * good way, never faster than the server takes.
 */
export function shouldSend(last: { at: number; lat: number; lng: number } | null, next: LatLng, now: number): boolean {
  if (!last) return true;
  const gap = now - last.at;
  if (gap >= SEND_EVERY_MS) return true;
  return gap >= MIN_GAP_MS && distanceMeters(last, next) >= 150;
}

/** A fix from the phone: somewhere in the Philippines, and precise enough to be worth showing */
export function readSpot(input: unknown): Spot | null {
  const p = input as Partial<Spot> | null;
  if (!p || !isLatLng(p) || !inPhilippines(p)) return null;
  const accuracy = Math.round(Number((input as { accuracy?: unknown }).accuracy));
  if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > MAX_ACCURACY) return null;
  return { lat: p.lat, lng: p.lng, accuracy };
}

/** "12 s ago", "4 min ago" */
export function ago(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return s < 60 ? `${s} s ago` : `${Math.round(s / 60)} min ago`;
}

/** The line under the map: how far, and how fresh */
export function spotLine(spot: LatLng, ageMs: number, destination: LatLng | null): string {
  const s = spotState(ageMs);
  if (s.state === "gone") return "Waiting for the rider’s location…";
  if (s.state === "paused") return `Location paused · last seen ${ago(s.ageMs)}`;
  const far = destination ? `About ${formatDistance(distanceMeters(spot, destination))} away · ` : "";
  return `${far}updated ${ago(s.ageMs)}`;
}
