"use server";

import { and, count, eq, gte } from "drizzle-orm";
import { auditLog, db, staff } from "@/db";
import { toggleClock } from "@/lib/clock";
import { currentKiosk } from "@/lib/kiosk";
import { audit, clientIp, PIN_RULE, verifyPin } from "@/lib/staff";

export type KioskResult =
  | { ok: true; name: string; action: "in" | "out"; at: string; hours?: number }
  | { ok: false; error: string };

const MAX_TRIES = 5;
const LOCK_MINUTES = 10;

export async function kioskPunch(staffId: string, pin: string): Promise<KioskResult> {
  const kiosk = await currentKiosk();
  if (!kiosk) return { ok: false, error: "This tablet isn't set up for clocking in anymore. Ask a manager." };
  if (!PIN_RULE.test(pin)) return { ok: false, error: "Enter your 4 to 6 digit PIN." };

  const [member] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
  if (!member || !member.active || member.branchId !== kiosk.branchId) return { ok: false, error: "You're not on this branch's team." };

  // Lock a person out for a while after several wrong PINs
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const [{ n }] = await db
    .select({ n: count() })
    .from(auditLog)
    .where(and(eq(auditLog.actorId, member.id), eq(auditLog.action, "kiosk.pin-wrong"), gte(auditLog.at, since)));
  if (n >= MAX_TRIES) return { ok: false, error: `Too many wrong PINs. Try again in ${LOCK_MINUTES} minutes, or ask a manager to reset it.` };

  if (!verifyPin(pin, member.pinHash)) {
    await audit(member.id, "kiosk.pin-wrong", { kioskId: kiosk.id });
    const left = MAX_TRIES - n - 1;
    return { ok: false, error: left > 0 ? `Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left.` : `Wrong PIN. Locked for ${LOCK_MINUTES} minutes.` };
  }

  const punch = await toggleClock(member, kiosk.branchId, "tablet", await clientIp());
  return { ok: true, name: member.name.split(" ")[0], action: punch.action, at: punch.at.toISOString(), hours: punch.hours };
}
