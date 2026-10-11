/**
 * Opening hours: a weekly schedule per branch, plus special days (holidays, events) that
 * override it on one date. Pure, so the server, checkout and the "Open now" badge agree.
 * Managers edit both on Staff > Branch; the database keeps them (see lib/hours-store.ts).
 */

/** Minutes from midnight. A close earlier than the open runs past midnight (6 PM – 1 AM). */
export type Window = { open: number; close: number };
/** week[0] = Sunday … week[6] = Saturday; null = closed. special: "YYYY-MM-DD" → that day's hours (null = closed). */
export type Schedule = { week: (Window | null)[]; special: Record<string, Window | null> };
/** A moment in Manila: its date, weekday (0 = Sunday) and minute of the day */
export type Clock = { date: string; weekday: number; minute: number };

export const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** The order people read a week in: Monday first */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Manila's date, weekday and minute, whatever the device's own time zone */
export function manilaClock(at: Date = new Date()): Clock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, weekday: SHORT.indexOf(get("weekday")), minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** The calendar day before (or after) a "YYYY-MM-DD" date */
export function shiftDate(date: string, days: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** The hours that apply on a date: its special day if there is one, else the weekly schedule */
export function windowOn(s: Schedule, date: string, weekday: number): Window | null {
  return date in s.special ? s.special[date] : (s.week[weekday] ?? null);
}

/** Minutes until closing, or null when closed. Counts last night's hours that run past midnight. */
export function minutesToClose(s: Schedule, c: Clock): number | null {
  const today = windowOn(s, c.date, c.weekday);
  if (today && c.minute >= today.open) {
    if (today.close < today.open) return today.close + 24 * 60 - c.minute;
    if (c.minute < today.close) return today.close - c.minute;
  }
  const yesterday = windowOn(s, shiftDate(c.date, -1), (c.weekday + 6) % 7);
  if (yesterday && yesterday.close < yesterday.open && c.minute < yesterday.close) return yesterday.close - c.minute;
  return null;
}

export const isOpen = (s: Schedule, c: Clock) => minutesToClose(s, c) !== null;

/** Online orders stop this long before closing, so the last order can still be made */
export const ORDER_CUTOFF_MINUTES = 30;

export function takingOrders(s: Schedule, c: Clock, cutoff = ORDER_CUTOFF_MINUTES) {
  const left = minutesToClose(s, c);
  return left !== null && left > cutoff;
}

/** "6 PM", "9:30 AM", "12 AM" */
export function formatTime(minute: number) {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${h % 12 === 0 ? 12 : h % 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h < 12 ? "AM" : "PM"}`;
}
export const formatWindow = (w: Window | null) => (w ? `${formatTime(w.open)} – ${formatTime(w.close)}` : "Closed");

/** "HH:MM" from a time input, as minutes; null if it isn't a time */
export function parseTime(v: unknown): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v ?? "").trim());
  if (!m) return null;
  const minute = Number(m[1]) * 60 + Number(m[2]);
  return Number(m[1]) < 24 && Number(m[2]) < 60 ? minute : null;
}
export const toTimeInput = (minute: number) => `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

/** A day's hours are valid when both times are set and differ (a close before the open runs past midnight) */
export const validWindow = (w: Window) => w.open >= 0 && w.open < 1440 && w.close >= 0 && w.close < 1440 && w.open !== w.close;

/**
 * The week as people say it, e.g. "Tuesday – Sunday: 6 PM – 1 AM" and "Monday: Closed".
 * Days with the same hours are grouped; open hours come first, closed days last.
 */
export function describeWeek(week: (Window | null)[]): { days: string; time: string }[] {
  const groups = new Map<string, number[]>();
  for (const d of WEEK_ORDER) {
    const key = formatWindow(week[d] ?? null);
    groups.set(key, [...(groups.get(key) ?? []), d]);
  }
  if (groups.size === 1) return [{ days: "Every day", time: [...groups.keys()][0] }];
  return [...groups.entries()]
    .sort(([a], [b]) => Number(a === "Closed") - Number(b === "Closed"))
    .map(([time, days]) => ({ days: describeDays(days), time }));
}

function describeDays(days: number[]) {
  // Split into runs of consecutive days (Monday-first)
  const pos = days.map((d) => WEEK_ORDER.indexOf(d));
  const runs: number[][] = [];
  for (const p of pos) {
    const last = runs.at(-1);
    if (last && p === last.at(-1)! + 1) last.push(p);
    else runs.push([p]);
  }
  const name = (p: number, short: boolean) => (short ? SHORT : DAY_NAMES)[WEEK_ORDER[p]];
  const short = runs.length > 1;
  const run = (r: number[]) =>
    r.length === 1 ? name(r[0], short) : r.length === 2 ? `${name(r[0], short)} & ${name(r[1], short)}` : `${name(r[0], short)} – ${name(r.at(-1)!, short)}`;
  return runs.map(run).join(" & ");
}
