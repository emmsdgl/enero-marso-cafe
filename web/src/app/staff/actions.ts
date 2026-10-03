"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { branchNetworks, db, kiosks, staff, timeEntries } from "@/db";
import { auth } from "@/lib/auth/server";
import { toggleClock } from "@/lib/clock";
import {
  audit, canActOnBranch, clientIp, hashKioskToken, hashPin, KIOSK_COOKIE, newKioskToken, onBranchNetwork, PIN_RULE, requireStaff,
} from "@/lib/staff";

export type ActionState = { ok?: string; error?: string } | undefined;
const s = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const BRANCHES = ["main", "noir"];

/** datetime-local values are Manila wall-clock time */
const fromManila = (v: string) => (v ? new Date(`${v}:00+08:00`) : null);

// ——— Clock in/out from a personal device on the branch Wi-Fi ———
export async function clockViaWifi(): Promise<ActionState> {
  const me = await requireStaff(["employee", "manager"]);
  const net = await onBranchNetwork(me.branchId!);
  if (!net.ok) return { error: "You're not on the branch Wi-Fi. Connect to it, or use the clock-in tablet." };
  const punch = await toggleClock(me, me.branchId!, "wifi", net.ip);
  revalidatePath("/staff");
  return { ok: punch.action === "in" ? "Clocked in." : "Clocked out." };
}

// ——— Team (admin manages accounts; managers reset PINs in their branch) ———
export async function addStaff(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin"]);
  const name = s(form.get("name"));
  const email = s(form.get("email")).toLowerCase();
  const role = s(form.get("role")) as "employee" | "manager" | "admin";
  const branchId = role === "admin" ? null : s(form.get("branch"));
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a name and a valid email." };
  if (!["employee", "manager", "admin"].includes(role)) return { error: "Choose a role." };
  if (branchId && !BRANCHES.includes(branchId)) return { error: "Choose a branch." };
  if (role !== "admin" && !branchId) return { error: "Employees and managers need a branch." };

  const [dupe] = await db.select({ id: staff.id }).from(staff).where(eq(sql`lower(${staff.email})`, email)).limit(1);
  if (dupe) return { error: "Someone with that email is already on the team." };

  const [row] = await db.insert(staff).values({ name, email, role, branchId }).returning({ id: staff.id });
  await audit(me.id, "staff.add", { staffId: row.id, name, email, role, branchId });
  revalidatePath("/staff/team");
  return { ok: `${name} added. They can now set up their account at /login/setup with ${email}.` };
}

export async function updateStaff(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin"]);
  const id = s(form.get("id"));
  const role = s(form.get("role")) as "employee" | "manager" | "admin";
  const branchId = role === "admin" ? null : s(form.get("branch"));
  const active = form.get("active") === "on";
  if (id === me.id && (role !== "admin" || !active)) return { error: "You can't remove your own admin access." };
  if (role !== "admin" && !BRANCHES.includes(branchId ?? "")) return { error: "Employees and managers need a branch." };
  await db.update(staff).set({ role, branchId, active }).where(eq(staff.id, id));
  await audit(me.id, "staff.update", { staffId: id, role, branchId, active });
  revalidatePath("/staff/team");
  return { ok: "Saved." };
}

export async function clearPin(staffId: string): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const [target] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
  if (!target) return { error: "Not found." };
  if (me.role === "manager" && (target.branchId !== me.branchId || target.role !== "employee")) return { error: "You can only reset PINs for employees in your branch." };
  await db.update(staff).set({ pinHash: null }).where(eq(staff.id, staffId));
  await audit(me.id, "staff.pin-clear", { staffId });
  revalidatePath("/staff/team");
  return { ok: `${target.name}'s PIN was cleared. They can set a new one in My account.` };
}

// ——— My account ———
export async function setMyPin(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff();
  const pin = s(form.get("pin"));
  if (!PIN_RULE.test(pin)) return { error: "Use 4 to 6 digits." };
  if (pin !== s(form.get("confirm"))) return { error: "The two PINs don't match." };
  await db.update(staff).set({ pinHash: hashPin(pin) }).where(eq(staff.id, me.id));
  await audit(me.id, "staff.pin-set");
  revalidatePath("/staff", "layout");
  return { ok: "Your clock-in PIN is set." };
}

export async function changeMyPassword(_: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff();
  const currentPassword = String(form.get("current") ?? "");
  const newPassword = String(form.get("next") ?? "");
  if (newPassword.length < 8) return { error: "Use at least 8 characters." };
  const { error } = await auth.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
  if (error) return { error: "Your current password isn't right." };
  return { ok: "Password changed. Other devices were signed out." };
}

// ——— Branch setup: Wi-Fi networks and clock-in tablets ———
export async function registerNetwork(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const branchId = s(form.get("branch"));
  const label = s(form.get("label")) || "Cafe Wi-Fi";
  if (!BRANCHES.includes(branchId) || !canActOnBranch(me, branchId)) return { error: "You can't change that branch." };
  const ip = await clientIp();
  if (ip === "unknown") return { error: "Couldn't detect this connection. Try again." };
  await db.insert(branchNetworks).values({ branchId, ip, label, createdBy: me.id }).onConflictDoNothing();
  await audit(me.id, "network.add", { branchId, ip, label });
  revalidatePath("/staff/branch");
  return { ok: `This connection (${ip}) now counts as ${label}.` };
}

export async function removeNetwork(id: string): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const [n] = await db.select().from(branchNetworks).where(eq(branchNetworks.id, id)).limit(1);
  if (!n || !canActOnBranch(me, n.branchId)) return { error: "You can't change that branch." };
  await db.delete(branchNetworks).where(eq(branchNetworks.id, id));
  await audit(me.id, "network.remove", { branchId: n.branchId, ip: n.ip });
  revalidatePath("/staff/branch");
  return { ok: "Removed." };
}

export async function registerKiosk(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const branchId = s(form.get("branch"));
  const label = s(form.get("label")) || "Counter tablet";
  if (!BRANCHES.includes(branchId) || !canActOnBranch(me, branchId)) return { error: "You can't change that branch." };
  const token = newKioskToken();
  await db.insert(kiosks).values({ branchId, label, tokenHash: hashKioskToken(token), createdBy: me.id });
  (await cookies()).set(KIOSK_COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 400,
  });
  await audit(me.id, "kiosk.add", { branchId, label });
  revalidatePath("/staff/branch");
  return { ok: "This device is now the clock-in tablet. Open /kiosk on it and leave it there." };
}

export async function revokeKiosk(id: string): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const [k] = await db.select().from(kiosks).where(eq(kiosks.id, id)).limit(1);
  if (!k || !canActOnBranch(me, k.branchId)) return { error: "You can't change that branch." };
  await db.update(kiosks).set({ revokedAt: new Date() }).where(eq(kiosks.id, id));
  await audit(me.id, "kiosk.revoke", { branchId: k.branchId, label: k.label });
  revalidatePath("/staff/branch");
  return { ok: `${k.label} can no longer clock people in.` };
}

// ——— Time records: managers fix missed or wrong punches ———
export async function saveEntry(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const id = s(form.get("id"));
  const clockIn = fromManila(s(form.get("clockIn")));
  const clockOut = fromManila(s(form.get("clockOut")));
  const note = s(form.get("note")) || null;
  if (!clockIn) return { error: "Clock-in time is required." };
  if (clockOut && clockOut <= clockIn) return { error: "Clock-out must be after clock-in." };
  if (clockOut && clockOut.getTime() - clockIn.getTime() > 20 * 3_600_000) return { error: "That shift is over 20 hours. Check the dates." };

  if (id) {
    const [e] = await db.select().from(timeEntries).where(eq(timeEntries.id, id)).limit(1);
    if (!e || !canActOnBranch(me, e.branchId)) return { error: "You can't edit that record." };
    await db.update(timeEntries).set({ clockIn, clockOut, note, editedBy: me.id, editedAt: new Date(), outMethod: clockOut && !e.clockOut ? "manual" : e.outMethod }).where(eq(timeEntries.id, id));
    await audit(me.id, "time.edit", { entryId: id, before: { in: e.clockIn, out: e.clockOut }, after: { in: clockIn, out: clockOut }, note });
  } else {
    const staffId = s(form.get("staffId"));
    const [who] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
    if (!who?.branchId || !canActOnBranch(me, who.branchId)) return { error: "Choose someone from your branch." };
    if (!clockOut) {
      const [open] = await db.select({ id: timeEntries.id }).from(timeEntries).where(and(eq(timeEntries.staffId, staffId), isNull(timeEntries.clockOut))).limit(1);
      if (open) return { error: `${who.name} already has a shift open. Close that one first.` };
    }
    const [row] = await db.insert(timeEntries).values({
      staffId, branchId: who.branchId, clockIn, clockOut, note, inMethod: "manual", outMethod: clockOut ? "manual" : null, editedBy: me.id, editedAt: new Date(),
    }).returning({ id: timeEntries.id });
    await audit(me.id, "time.add", { entryId: row.id, staffId, in: clockIn, out: clockOut, note });
  }
  revalidatePath("/staff/time");
  revalidatePath("/staff");
  return { ok: "Saved." };
}
