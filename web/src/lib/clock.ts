import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db, timeEntries, type Staff } from "@/db";

export type Punch = { action: "in" | "out"; at: Date; hours?: number };

export async function openShift(staffId: string) {
  const [open] = await db
    .select()
    .from(timeEntries)
    .where(and(eq(timeEntries.staffId, staffId), isNull(timeEntries.clockOut)))
    .limit(1);
  return open ?? null;
}

/** Clocks the person out if they have a shift open, otherwise clocks them in at this branch */
export async function toggleClock(member: Staff, branchId: string, method: "tablet" | "wifi", ip: string): Promise<Punch> {
  const open = await openShift(member.id);
  const now = new Date();
  if (open) {
    await db
      .update(timeEntries)
      .set({ clockOut: now, outMethod: method, outIp: ip })
      .where(eq(timeEntries.id, open.id));
    return { action: "out", at: now, hours: (now.getTime() - open.clockIn.getTime()) / 3_600_000 };
  }
  await db.insert(timeEntries).values({ staffId: member.id, branchId, clockIn: now, inMethod: method, inIp: ip });
  return { action: "in", at: now };
}
