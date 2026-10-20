"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { branchNetworks, branches, db, kiosks, paymentAccounts, pushSubscriptions, staff, timeEntries } from "@/db";
import { auth } from "@/lib/auth/server";
import { toggleClock } from "@/lib/clock";
import {
  BASE_DISTANCE_OPTIONS, feeSummary, FREE_DELIVERY_OPTIONS, formatDistance, inPhilippines, isLatLng, MAX_DELIVERY_FEE, MAX_DELIVERY_OPTIONS, MAX_PER_KM, MIN_ORDER_OPTIONS,
} from "@/lib/delivery";
import { removeSpecialDay, saveSpecialDay, saveWeek } from "@/lib/hours-store";
import { peso } from "@/lib/menu";
import { savePaymentAccount, setPaymentAccountActive } from "@/lib/payments";
import { endPinSession } from "@/lib/pin-session";
import { ALL_ROLES, ROLES, usesPin, type Role } from "@/lib/roles";
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
  const me = await requireStaff(["employee", "manager", "rider"]);
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
  const role = s(form.get("role")) as Role;
  const branchId = role === "admin" ? null : s(form.get("branch"));
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a name and a valid email." };
  if (!ROLES.includes(role)) return { error: "Choose a role." };
  if (branchId && !BRANCHES.includes(branchId)) return { error: "Choose a branch." };
  if (role !== "admin" && !branchId) return { error: "Everyone but the admin needs a branch." };

  const [dupe] = await db.select({ id: staff.id, removedAt: staff.removedAt }).from(staff).where(eq(sql`lower(${staff.email})`, email)).limit(1);
  if (dupe?.removedAt) return { error: "That email belongs to a past team member. Restore them from Past team members below." };
  if (dupe) return { error: "Someone with that email is already on the team." };

  const [row] = await db.insert(staff).values({ name, email, role, branchId }).returning({ id: staff.id });
  await audit(me.id, "staff.add", { staffId: row.id, name, email, role, branchId });
  revalidatePath("/staff/team");
  return { ok: `${name} added. They can now set up their account at /login/setup with ${email}.` };
}

/**
 * Takes someone off the team. A person with no history yet (say, added by mistake) is deleted
 * outright. Anyone with history keeps it: their hours stay for payroll, and their name stays on
 * orders they handled. They lose access at once, their phones stop getting notifications, an
 * open shift is closed, and they move to Past team members, where the admin can restore them.
 */
export async function removeStaff(id: string): Promise<ActionState> {
  const me = await requireStaff(["admin"]);
  const [p] = await db.select().from(staff).where(eq(staff.id, String(id))).limit(1);
  if (!p || p.removedAt) return { error: "That person isn't on the team any more." };
  if (p.id === me.id) return { error: "You can't remove yourself." };
  if (p.role === "admin") return { error: "Admins can't be removed here. Change their role first." };

  const now = new Date();
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.staffId, p.id));
  await db
    .update(timeEntries)
    .set({ clockOut: now, outMethod: "manual", note: "Closed when removed from the team", editedBy: me.id, editedAt: now })
    .where(and(eq(timeEntries.staffId, p.id), isNull(timeEntries.clockOut)));
  let deleted = true;
  try {
    await db.delete(staff).where(eq(staff.id, p.id));
  } catch (e) {
    // Still referenced (time records, orders, messages): keep the row, end the access
    const c = (e as { cause?: { code?: string }; code?: string }).cause ?? (e as { code?: string });
    if (c?.code !== "23503") throw e;
    deleted = false;
    await db.update(staff).set({ active: false, pinHash: null, removedAt: now }).where(eq(staff.id, p.id));
  }
  await audit(me.id, deleted ? "staff.delete" : "staff.remove", { staffId: p.id, name: p.name, email: p.email, role: p.role, branchId: p.branchId });
  revalidatePath("/staff/team");
  return { ok: deleted ? `${p.name} was deleted.` : `${p.name} was removed. They can't sign in or clock in; their hours stay in Hours.` };
}

/** Brings a past team member back, with the same login. They set a new PIN. */
export async function restoreStaff(id: string): Promise<ActionState> {
  const me = await requireStaff(["admin"]);
  const [p] = await db.select().from(staff).where(eq(staff.id, String(id))).limit(1);
  if (!p?.removedAt) return { error: "That person is already on the team." };
  await db.update(staff).set({ active: true, removedAt: null }).where(eq(staff.id, p.id));
  await audit(me.id, "staff.restore", { staffId: p.id, name: p.name });
  revalidatePath("/staff/team");
  return { ok: `${p.name} is back on the team. They'll need to set a new PIN.` };
}

export async function updateStaff(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin"]);
  const id = s(form.get("id"));
  const role = s(form.get("role")) as Role;
  const branchId = role === "admin" ? null : s(form.get("branch"));
  const active = form.get("active") === "on";
  if (!ROLES.includes(role)) return { error: "Choose a role." };
  if (id === me.id && (role !== "admin" || !active)) return { error: "You can't remove your own admin access." };
  if (role !== "admin" && !BRANCHES.includes(branchId ?? "")) return { error: "Everyone but the admin needs a branch." };
  await db.update(staff).set({ role, branchId, active }).where(eq(staff.id, id));
  await audit(me.id, "staff.update", { staffId: id, role, branchId, active });
  revalidatePath("/staff/team");
  return { ok: "Saved." };
}

export async function clearPin(staffId: string): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const [target] = await db.select().from(staff).where(eq(staff.id, staffId)).limit(1);
  if (!target) return { error: "Not found." };
  if (me.role === "manager" && (target.branchId !== me.branchId || !usesPin(target.role))) return { error: "You can only reset PINs for employees and riders in your branch." };
  await db.update(staff).set({ pinHash: null }).where(eq(staff.id, staffId));
  await audit(me.id, "staff.pin-clear", { staffId });
  revalidatePath("/staff/team");
  return { ok: `${target.name}'s PIN was cleared. They can set a new one in My account.` };
}

// ——— My account ———
export async function setMyPin(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(ALL_ROLES);
  const pin = s(form.get("pin"));
  if (!PIN_RULE.test(pin)) return { error: "Use 4 to 6 digits." };
  if (pin !== s(form.get("confirm"))) return { error: "The two PINs don't match." };
  await db.update(staff).set({ pinHash: hashPin(pin) }).where(eq(staff.id, me.id));
  await audit(me.id, "staff.pin-set");
  revalidatePath("/staff", "layout");
  return { ok: "Your clock-in PIN is set." };
}

export async function changeMyPassword(_: ActionState, form: FormData): Promise<ActionState> {
  await requireStaff(ALL_ROLES);
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
  // A shared tablet shouldn't stay signed in as a manager: sign out here, straight to the clock-in screen
  await endPinSession();
  await auth.signOut().catch(() => {});
  redirect("/kiosk");
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
  const soon = Date.now() + 5 * 60_000;
  if (clockIn.getTime() > soon || (clockOut && clockOut.getTime() > soon)) return { error: "That time hasn't happened yet. Check the date." };

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

// ——— Online orders: managers (their branch) and the admin ———
export async function setOrdersOpen(branchId: string, open: boolean): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  if (!BRANCHES.includes(branchId) || !canActOnBranch(me, branchId)) return { error: "You can't change that branch." };
  await db.update(branches).set({ ordersOpen: open }).where(eq(branches.id, branchId));
  await audit(me.id, open ? "orders.start" : "orders.pause", { branchId });
  revalidatePath("/staff/branch");
  revalidatePath("/staff/orders");
  return { ok: open ? "Online orders are on." : "Online orders are paused." };
}

const CUTOFFS: Record<number, string> = { 30: "30 minutes", 45: "45 minutes", 60: "1 hour" };

export async function saveOrderCutoff(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const branchId = s(form.get("branch"));
  const minutes = Number(form.get("cutoff"));
  if (!BRANCHES.includes(branchId) || !canActOnBranch(me, branchId)) return { error: "You can't change that branch." };
  if (!CUTOFFS[minutes]) return { error: "Choose 30 minutes, 45 minutes or 1 hour." };
  await db.update(branches).set({ orderCutoffMinutes: minutes }).where(eq(branches.id, branchId));
  await audit(me.id, "orders.cutoff", { branchId, minutes });
  revalidatePath("/staff/branch");
  return { ok: `Online orders now stop ${CUTOFFS[minutes]} before closing.` };
}

// ——— Delivery: managers (their branch) and the admin ———
const mayChange = (me: Awaited<ReturnType<typeof requireStaff>>, branchId: string) => BRANCHES.includes(branchId) && canActOnBranch(me, branchId);

/** The branch's pin: distances and free delivery are measured from here */
export async function saveStorePin(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const branchId = s(form.get("branch"));
  const pin = { lat: Number(form.get("lat")), lng: Number(form.get("lng")) };
  if (!mayChange(me, branchId)) return { error: "You can't change that branch." };
  if (!s(form.get("lat")) || !isLatLng(pin) || !inPhilippines(pin)) return { error: "Set the pin on the branch first: drag it on the map, or use your location while you're there." };
  await db.update(branches).set({ lat: pin.lat, lng: pin.lng }).where(eq(branches.id, branchId));
  await audit(me.id, "delivery.pin", { branchId, ...pin });
  revalidatePath("/staff/branch");
  return { ok: "Branch location saved." };
}

export async function saveDeliveryRules(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const branchId = s(form.get("branch"));
  const free = Number(form.get("free"));
  const max = Number(form.get("max"));
  const min = Number(form.get("min"));
  const baseFee = Number(s(form.get("baseFee")));
  const baseMeters = Number(form.get("baseMeters"));
  const perKm = Number(s(form.get("perKm")));
  const cash = form.get("cash") === "on";
  if (!mayChange(me, branchId)) return { error: "You can't change that branch." };
  const ok = (list: readonly number[], v: number) => list.includes(v);
  if (!ok(FREE_DELIVERY_OPTIONS, free) || !ok(MAX_DELIVERY_OPTIONS, max) || !ok(MIN_ORDER_OPTIONS, min) || !ok(BASE_DISTANCE_OPTIONS, baseMeters)) {
    return { error: "Choose from the lists." };
  }
  if (free > max) return { error: "The free delivery area can't be bigger than the delivery limit." };
  if (!Number.isInteger(baseFee) || baseFee < 0 || baseFee > MAX_DELIVERY_FEE) return { error: `Enter a base fee from ₱0 to ${peso(MAX_DELIVERY_FEE)}.` };
  if (!Number.isInteger(perKm) || perKm < 0 || perKm > MAX_PER_KM) return { error: `Enter a price per km from ₱0 to ${peso(MAX_PER_KM)}.` };
  await db
    .update(branches)
    .set({ freeDeliveryMeters: free, maxDeliveryMeters: max, deliveryMinOrder: min, deliveryBaseFee: baseFee, deliveryBaseMeters: baseMeters, deliveryPerKm: perKm, cashOnDelivery: cash })
    .where(eq(branches.id, branchId));
  await audit(me.id, "delivery.rules", { branchId, free, max, min, baseFee, baseMeters, perKm, cash });
  revalidatePath("/staff/branch");
  return {
    ok: `Saved. ${feeSummary({ freeWithin: free, baseFee, baseMeters, perKm })}, up to ${formatDistance(max)}${min ? `, from ${peso(min)}` : ""}.${cash ? " Cash on delivery is on." : ""}`,
  };
}

/** Delivery needs the branch's pin and somewhere for customers to pay */
export async function setDeliveryOpen(branchId: string, open: boolean): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  if (!mayChange(me, branchId)) return { error: "You can't change that branch." };
  if (open) {
    const [b] = await db.select({ lat: branches.lat }).from(branches).where(eq(branches.id, branchId));
    const [acct] = await db.select({ id: paymentAccounts.id }).from(paymentAccounts).where(and(eq(paymentAccounts.branchId, branchId), eq(paymentAccounts.active, true))).limit(1);
    if (b?.lat == null) return { error: "Save the branch location first." };
    if (!acct) return { error: "Add a payment account first, so customers can pay for deliveries." };
  }
  await db.update(branches).set({ deliveryOpen: open }).where(eq(branches.id, branchId));
  await audit(me.id, open ? "delivery.start" : "delivery.pause", { branchId });
  revalidatePath("/staff/branch");
  return { ok: open ? "Delivery is on." : "Delivery is paused." };
}

export async function savePaymentAccountAction(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const file = form.get("qr");
  const r = await savePaymentAccount(me, {
    id: s(form.get("id")) || null,
    branchId: s(form.get("branch")),
    kind: s(form.get("kind")),
    label: s(form.get("label")),
    accountName: s(form.get("accountName")),
    accountNumber: s(form.get("accountNumber")),
    qrImage: file instanceof File && file.size > 0 ? file : null,
    removeQr: form.get("removeQr") === "on",
  });
  revalidatePath("/staff/branch");
  return r.ok ? { ok: r.message } : { error: r.error };
}

export async function setPaymentAccountActiveAction(id: string, active: boolean): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const r = await setPaymentAccountActive(me, String(id), active);
  revalidatePath("/staff/branch");
  return r.ok ? { ok: r.message } : { error: r.error };
}

// ——— Opening hours: managers (their branch) and the admin ———
export async function saveWeeklyHours(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const branchId = s(form.get("branch"));
  if (!BRANCHES.includes(branchId)) return { error: "You can't change that branch." };
  const days = Array.from({ length: 7 }, (_, d) => ({ closed: form.get(`closed-${d}`) === "on", open: s(form.get(`open-${d}`)), close: s(form.get(`close-${d}`)) }));
  const r = await saveWeek(me, branchId, days);
  revalidatePath("/staff/branch");
  revalidatePath("/store");
  return r.ok ? { ok: r.message } : { error: r.error };
}

export async function saveSpecialDayAction(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const branchId = s(form.get("branch"));
  if (!BRANCHES.includes(branchId)) return { error: "You can't change that branch." };
  const r = await saveSpecialDay(me, branchId, {
    day: s(form.get("day")), closed: form.get("closed") === "on", open: s(form.get("open")), close: s(form.get("close")), note: s(form.get("note")),
  });
  revalidatePath("/staff/branch");
  revalidatePath("/store");
  return r.ok ? { ok: r.message } : { error: r.error };
}

export async function removeSpecialDayAction(branchId: string, day: string): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  if (!BRANCHES.includes(branchId)) return { error: "You can't change that branch." };
  const r = await removeSpecialDay(me, branchId, String(day));
  revalidatePath("/staff/branch");
  revalidatePath("/store");
  return r.ok ? { ok: r.message } : { error: r.error };
}
