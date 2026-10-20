import "server-only";
import { and, asc, count, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { db, orders, staff, timeEntries, type Staff } from "@/db";
import { withItems, type FullOrder } from "./orders";
import { canDeliver } from "./roles";

/** A delivery that's someone's to take: accepted, until it's delivered or called off */
const ACTIVE = ["accepted", "preparing", "ready", "out_for_delivery"] as const;

/** How many deliveries this person has on now (the Deliveries link in the menu) */
export async function myDeliveryCount(staffId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(orders)
    .where(and(eq(orders.riderId, staffId), inArray(orders.status, [...ACTIVE])));
  return n;
}

export type RiderChoice = { id: string; name: string; role: Staff["role"]; onShift: boolean; load: number };

/**
 * Who can take a branch's deliveries now: its riders, and counter staff who are clocked in there.
 * On shift first, then whoever has the fewest deliveries on.
 */
export async function riderChoices(branchIds: string[]): Promise<Record<string, RiderChoice[]>> {
  if (branchIds.length === 0) return {};
  const people = await db
    .select({ id: staff.id, name: staff.name, role: staff.role, branchId: staff.branchId, active: staff.active })
    .from(staff)
    .where(and(inArray(staff.branchId, branchIds), eq(staff.active, true), isNull(staff.removedAt), inArray(staff.role, ["rider", "employee", "manager"])));
  if (people.length === 0) return {};
  const ids = people.map((p) => p.id);
  const [shifts, loads] = await Promise.all([
    db.select({ staffId: timeEntries.staffId }).from(timeEntries).where(and(inArray(timeEntries.staffId, ids), isNull(timeEntries.clockOut))),
    db
      .select({ riderId: orders.riderId, n: count() })
      .from(orders)
      .where(and(inArray(orders.riderId, ids), inArray(orders.status, [...ACTIVE])))
      .groupBy(orders.riderId),
  ]);
  const on = new Set(shifts.map((s) => s.staffId));
  const out: Record<string, RiderChoice[]> = {};
  for (const b of branchIds) {
    out[b] = people
      .filter((p) => canDeliver(p, b, on.has(p.id)))
      .map((p) => ({ id: p.id, name: p.name, role: p.role, onShift: on.has(p.id), load: loads.find((l) => l.riderId === p.id)?.n ?? 0 }))
      .sort((a, b) => Number(b.onShift) - Number(a.onShift) || a.load - b.load || a.name.localeCompare(b.name));
  }
  return out;
}

/**
 * The rider's screen: their deliveries on now, then today's finished ones (for the cash they hold).
 * "Today" is the last 18 hours, like the board, so a late shift stays on one screen.
 */
export async function myDeliveries(me: Staff): Promise<{ active: FullOrder[]; finished: FullOrder[] }> {
  const since = new Date(Date.now() - 18 * 3_600_000);
  const list = await db
    .select()
    .from(orders)
    .where(and(eq(orders.riderId, me.id), or(inArray(orders.status, [...ACTIVE]), and(eq(orders.status, "done"), gte(orders.doneAt, since)))))
    .orderBy(asc(orders.assignedAt), desc(orders.doneAt));
  const full = await withItems(list);
  return { active: full.filter((o) => o.status !== "done"), finished: full.filter((o) => o.status === "done") };
}
