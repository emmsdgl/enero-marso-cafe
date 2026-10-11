import "server-only";
import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { branchHours, branchSpecialDays, db, type Staff } from "@/db";
import { DAY_NAMES, describeWeek, formatWindow, manilaClock, parseTime, shiftDate, validWindow, type Schedule, type Window } from "./hours";
import type { BranchId } from "./menu";
import { audit, canActOnBranch } from "./staff";

/**
 * Opening hours in the database: each branch's week, and its special days. Managers (their
 * branch) and the admin change them on Staff > Branch; every change is logged.
 */
export type Schedules = Record<BranchId, Schedule>;
export type SpecialDay = { day: string; window: Window | null; note: string | null };
type Fail = { ok: false; error: string };

const toWindow = (opensAt: number | null, closesAt: number | null): Window | null =>
  opensAt == null || closesAt == null ? null : { open: opensAt, close: closesAt };

/** Every branch's week, plus special days from yesterday (hours past midnight) to two months ahead */
export async function loadSchedules(): Promise<Schedules> {
  const today = manilaClock().date;
  const [week, special] = await Promise.all([
    db.select().from(branchHours),
    db.select().from(branchSpecialDays).where(and(gte(branchSpecialDays.day, shiftDate(today, -1)), lte(branchSpecialDays.day, shiftDate(today, 62)))),
  ]);
  const of = (id: BranchId): Schedule => ({
    week: Array.from({ length: 7 }, (_, d) => {
      const row = week.find((w) => w.branchId === id && w.weekday === d);
      return row ? toWindow(row.opensAt, row.closesAt) : null;
    }),
    special: Object.fromEntries(special.filter((s) => s.branchId === id).map((s) => [s.day, toWindow(s.opensAt, s.closesAt)])),
  });
  return { main: of("main"), noir: of("noir") };
}

/** Special days from today on, for the settings page */
export async function upcomingSpecialDays(branchIds: string[]): Promise<Record<string, SpecialDay[]>> {
  if (branchIds.length === 0) return {};
  const rows = await db
    .select()
    .from(branchSpecialDays)
    .where(and(inArray(branchSpecialDays.branchId, branchIds), gte(branchSpecialDays.day, manilaClock().date)))
    .orderBy(asc(branchSpecialDays.day));
  const out: Record<string, SpecialDay[]> = {};
  for (const r of rows) (out[r.branchId] ??= []).push({ day: r.day, window: toWindow(r.opensAt, r.closesAt), note: r.note });
  return out;
}

export type DayInput = { closed: boolean; open: string; close: string };

/** Reads one day from the form: closed, or two different times. The error names the day. */
function readDay(label: string, d: DayInput): { ok: true; window: Window | null } | Fail {
  if (d.closed) return { ok: true, window: null };
  const open = parseTime(d.open);
  const close = parseTime(d.close);
  if (open === null || close === null) return { ok: false, error: `${label}: set both times, or mark it closed.` };
  const window = { open, close };
  if (!validWindow(window)) return { ok: false, error: `${label}: opening and closing can't be the same time.` };
  return { ok: true, window };
}

/** Saves the whole week (index 0 = Sunday) */
export async function saveWeek(me: Staff, branchId: string, days: DayInput[]): Promise<{ ok: true; message: string } | Fail> {
  if (!canActOnBranch(me, branchId)) return { ok: false, error: "You can't change that branch." };
  if (days.length !== 7) return { ok: false, error: "Something went wrong with the form. Reload and try again." };
  const week: (Window | null)[] = [];
  for (let d = 0; d < 7; d++) {
    const r = readDay(DAY_NAMES[d], days[d]);
    if (!r.ok) return r;
    week.push(r.window);
  }
  if (week.every((w) => w === null)) return { ok: false, error: "That closes the branch every day. Pause online orders instead, or set at least one day." };

  const before = await db.select().from(branchHours).where(eq(branchHours.branchId, branchId));
  const now = new Date();
  await db
    .insert(branchHours)
    .values(week.map((w, weekday) => ({ branchId, weekday, opensAt: w?.open ?? null, closesAt: w?.close ?? null, updatedAt: now, updatedBy: me.id })))
    .onConflictDoUpdate({
      target: [branchHours.branchId, branchHours.weekday],
      set: { opensAt: sql`excluded.opens_at`, closesAt: sql`excluded.closes_at`, updatedAt: now, updatedBy: me.id },
    });
  const describe = (ws: (Window | null)[]) => describeWeek(ws).map((r) => `${r.days}: ${r.time}`).join("; ");
  const beforeWeek = Array.from({ length: 7 }, (_, d) => {
    const row = before.find((b) => b.weekday === d);
    return row ? toWindow(row.opensAt, row.closesAt) : null;
  });
  await audit(me.id, "hours.week", { branchId, before: describe(beforeWeek), after: describe(week) });
  return { ok: true, message: `Saved. ${describe(week)}.` };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A holiday closure or different hours on one date (replaces any earlier entry for that date) */
export async function saveSpecialDay(
  me: Staff,
  branchId: string,
  input: DayInput & { day: string; note: string },
): Promise<{ ok: true; message: string } | Fail> {
  if (!canActOnBranch(me, branchId)) return { ok: false, error: "You can't change that branch." };
  const today = manilaClock().date;
  if (!DATE.test(input.day) || shiftDate(input.day, 0) !== input.day) return { ok: false, error: "Choose the date." };
  if (input.day < today) return { ok: false, error: "That date has passed. Choose today or a later date." };
  if (input.day > shiftDate(today, 366)) return { ok: false, error: "Choose a date within the next year." };
  const r = readDay("That day", input);
  if (!r.ok) return r;
  const note = input.note.trim().slice(0, 60) || null;
  const values = { branchId, day: input.day, opensAt: r.window?.open ?? null, closesAt: r.window?.close ?? null, note, createdBy: me.id };
  await db
    .insert(branchSpecialDays)
    .values(values)
    .onConflictDoUpdate({ target: [branchSpecialDays.branchId, branchSpecialDays.day], set: { opensAt: values.opensAt, closesAt: values.closesAt, note, createdBy: me.id } });
  await audit(me.id, "hours.special", { branchId, day: input.day, hours: formatWindow(r.window), note });
  return { ok: true, message: `Saved: ${formatWindow(r.window)} on ${input.day}.` };
}

export async function removeSpecialDay(me: Staff, branchId: string, day: string): Promise<{ ok: true; message: string } | Fail> {
  if (!canActOnBranch(me, branchId) || !DATE.test(day)) return { ok: false, error: "You can't change that branch." };
  await db.delete(branchSpecialDays).where(and(eq(branchSpecialDays.branchId, branchId), eq(branchSpecialDays.day, day)));
  await audit(me.id, "hours.special-remove", { branchId, day });
  return { ok: true, message: "Back to the usual hours that day." };
}
