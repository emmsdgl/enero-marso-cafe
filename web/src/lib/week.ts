/** Manila-time week helpers. Weeks run Monday to Sunday. */
const MANILA_OFFSET = 8 * 3_600_000;

/** "YYYY-MM-DD" of the Monday (Manila) for a given instant */
export function mondayOf(d: Date): string {
  const local = new Date(d.getTime() + MANILA_OFFSET);
  const dow = (local.getUTCDay() + 6) % 7; // Monday = 0
  local.setUTCDate(local.getUTCDate() - dow);
  return local.toISOString().slice(0, 10);
}

/** Start (inclusive) and end (exclusive) instants of the Manila week beginning on `monday` */
export function weekRange(monday: string): { start: Date; end: Date } {
  const start = new Date(`${monday}T00:00:00+08:00`);
  return { start, end: new Date(start.getTime() + 7 * 86_400_000) };
}

export function shiftWeek(monday: string, weeks: number): string {
  const d = new Date(`${monday}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function validMonday(v: string | undefined, fallback: string): string {
  return v && /^\d{4}-\d{2}-\d{2}$/.test(v) && mondayOf(new Date(`${v}T12:00:00+08:00`)) === v ? v : fallback;
}

/** Value for <input type="datetime-local"> in Manila time */
export function toManilaInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d.getTime() + MANILA_OFFSET).toISOString().slice(0, 16);
}

export function weekLabel(monday: string): string {
  const { start, end } = weekRange(monday);
  const f = (x: Date) => x.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
  return `${f(start)} – ${f(new Date(end.getTime() - 1))}`;
}
