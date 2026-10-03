import "server-only";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db, staff, timeEntries, type Staff } from "@/db";
import { weekRange } from "./week";

/** Time records one person may see for a week: own (employee), branch (manager), chosen branch or all (admin) */
export async function weekEntries(me: Staff, monday: string, branchFilter?: string) {
  const { start, end } = weekRange(monday);
  const scope =
    me.role === "employee"
      ? eq(timeEntries.staffId, me.id)
      : me.role === "manager"
        ? eq(timeEntries.branchId, me.branchId!)
        : branchFilter && branchFilter !== "all"
          ? eq(timeEntries.branchId, branchFilter)
          : undefined;
  return db
    .select({
      id: timeEntries.id,
      staffId: timeEntries.staffId,
      name: staff.name,
      branchId: timeEntries.branchId,
      clockIn: timeEntries.clockIn,
      clockOut: timeEntries.clockOut,
      inMethod: timeEntries.inMethod,
      outMethod: timeEntries.outMethod,
      note: timeEntries.note,
      editedAt: timeEntries.editedAt,
    })
    .from(timeEntries)
    .innerJoin(staff, eq(staff.id, timeEntries.staffId))
    .where(and(gte(timeEntries.clockIn, start), lt(timeEntries.clockIn, end), scope))
    .orderBy(desc(timeEntries.clockIn));
}

export type WeekEntry = Awaited<ReturnType<typeof weekEntries>>[number];
