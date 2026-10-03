"use server";

import { eq } from "drizzle-orm";
import { db, staff } from "@/db";
import { toggleClock } from "@/lib/clock";
import { currentKiosk } from "@/lib/kiosk";
import { audit, clientIp, PIN_LOCK_MINUTES, PIN_MAX_TRIES, PIN_RULE, pinFailures, verifyPin } from "@/lib/staff";

export type KioskResult =
  | { ok: true; name: string; action: "in" | "out"; at: string; hours?: number }
  | { ok: false; error: string };

export async function kioskPunch(staffId: string, pin: string): Promise<KioskResult> {
  const kiosk = await currentKiosk();
  if (!kiosk) return { ok: false, error: "This tablet isn't set up for clocking in anymore. Ask a manager." };
  if (!PIN_RULE.test(pin)) return { ok: false, error: "Enter your 4 to 6 digit PIN." };

  const [member] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
  if (!member || !member.active || member.branchId !== kiosk.branchId) return { ok: false, error: "You're not on this branch's team." };

  // Lock a person out for a while after several wrong PINs
  const n = await pinFailures(member.id);
  if (n >= PIN_MAX_TRIES) return { ok: false, error: `Too many wrong PINs. Try again in ${PIN_LOCK_MINUTES} minutes, or ask a manager to reset it.` };

  if (!verifyPin(pin, member.pinHash)) {
    await audit(member.id, "pin.wrong", { via: "tablet", kioskId: kiosk.id });
    const left = PIN_MAX_TRIES - n - 1;
    return { ok: false, error: left > 0 ? `Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left.` : `Wrong PIN. Locked for ${PIN_LOCK_MINUTES} minutes.` };
  }

  const punch = await toggleClock(member, kiosk.branchId, "tablet", await clientIp());
  return { ok: true, name: member.name.split(" ")[0], action: punch.action, at: punch.at.toISOString(), hours: punch.hours };
}
