import { manilaClock, minutesToClose, type Branch } from "@/data/branches";

/** Kitchen time before the earliest pickup, and the spacing of the time choices */
export const PICKUP_LEAD_MINUTES = 20;
export const PICKUP_STEP_MINUTES = 15;

export type PickupWindow = {
  /** "As soon as possible" is offered only while the branch is open and before the cutoff */
  asap: boolean;
  /** Pickup times customers can choose, in 15-minute steps, today only */
  slots: Date[];
  /** Set when the branch is closed now but opens later today (pre-orders) */
  opensAt: Date | null;
};

const MIN = 60_000;

/**
 * When can a pickup order placed now be collected? Open now: as soon as possible, or a time
 * up to the cutoff before closing. Closed now but opening later today: a time after opening.
 */
export function pickupWindow(b: Pick<Branch, "week">, now: Date, cutoff: number): PickupWindow {
  const base = Math.floor(now.getTime() / MIN) * MIN; // Manila is a whole-hour offset, so minutes line up
  const { weekday, minute } = manilaClock(now);
  const slotsBetween = (firstMinuteOfDay: number, lastOffset: number) => {
    const out: Date[] = [];
    let offset = Math.ceil(firstMinuteOfDay / PICKUP_STEP_MINUTES) * PICKUP_STEP_MINUTES - minute;
    for (; offset <= lastOffset; offset += PICKUP_STEP_MINUTES) out.push(new Date(base + offset * MIN));
    return out;
  };

  const left = minutesToClose(b, weekday, minute);
  if (left !== null && left > cutoff) {
    return { asap: true, slots: slotsBetween(minute + PICKUP_LEAD_MINUTES, left - cutoff), opensAt: null };
  }

  // Closed (or past the cutoff): offer today's window if it hasn't started yet
  const today = b.week[weekday];
  if (today && today.open > minute) {
    const untilOpen = today.open - minute;
    const length = today.close > today.open ? today.close - today.open : today.close + 24 * 60 - today.open;
    const slots = slotsBetween(today.open + PICKUP_LEAD_MINUTES, untilOpen + length - cutoff);
    return { asap: false, slots, opensAt: new Date(base + untilOpen * MIN) };
  }
  return { asap: false, slots: [], opensAt: null };
}

/**
 * Server check for a chosen pickup time. A few minutes of slack, because the customer may have
 * picked the earliest time a little while before pressing "Place order".
 */
export function pickupAllowed(b: Pick<Branch, "week">, now: Date, cutoff: number, wanted: Date | null): boolean {
  const w = pickupWindow(b, new Date(now.getTime() - 10 * MIN), cutoff);
  if (wanted === null) return pickupWindow(b, now, cutoff).asap;
  return w.slots.some((s) => s.getTime() === wanted.getTime()) && wanted.getTime() > now.getTime();
}
