"use server";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, staff, type Staff } from "@/db";
import { auth } from "@/lib/auth/server";
import { currentKiosk } from "@/lib/kiosk";
import { endPinSession, startPinSession } from "@/lib/pin-session";
import {
  audit, onBranchNetwork, PIN_LOCK_MINUTES, PIN_MAX_TRIES, PIN_RULE, pinFailures, verifyPin,
} from "@/lib/staff";

export type FormState = { error?: string; email?: string } | undefined;

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const lower = (v: FormDataEntryValue | null) => clean(v).toLowerCase();

/**
 * One sign-in for everyone: "Name or email" plus "Password or PIN".
 * A PIN (4–6 digits) only works for employees, and only on the branch Wi-Fi or the counter tablet.
 * Managers and the admin always use their password.
 */
export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const who = clean(form.get("who"));
  const secret = String(form.get("secret") ?? "");
  if (!who || !secret) return { error: "Enter your name or email, and your password or PIN.", email: who };

  const found = await findStaff(who);
  if (found === "ambiguous") return { error: `More than one person is called "${who}". Use your full name or email.`, email: who };

  // ——— PIN ———
  if (PIN_RULE.test(secret)) {
    if (!found || !found.active) return { error: "We couldn't find that name or email on the team.", email: who };
    if (found.role !== "employee") return { error: "Managers and the admin sign in with their password.", email: who };
    if (!(await atBranch(found.branchId!))) {
      return { error: "PIN sign-in only works on the cafe Wi-Fi or the counter tablet. Use your password here.", email: who };
    }
    const fails = await pinFailures(found.id);
    if (fails >= PIN_MAX_TRIES) return { error: `Too many wrong PINs. Try again in ${PIN_LOCK_MINUTES} minutes, or use your password.`, email: who };
    if (!verifyPin(secret, found.pinHash)) {
      await audit(found.id, "pin.wrong", { via: "sign-in" });
      const left = PIN_MAX_TRIES - fails - 1;
      return { error: left > 0 ? `That PIN isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : `That PIN isn't right. PIN sign-in is locked for ${PIN_LOCK_MINUTES} minutes.`, email: who };
    }
    await startPinSession(found.id);
    await audit(found.id, "sign-in.pin");
    redirect("/staff");
  }

  // ——— Password ———
  const email = found ? found.email : who.toLowerCase();
  const { data, error } = await auth.signIn.email({ email, password: secret });
  if (error || !data?.user) return { error: "That name or email and password don't match. Try again, or ask the admin for help.", email: who };

  const [me] = await db.select().from(staff).where(eq(staff.authUserId, data.user.id)).limit(1);
  if (!me || !me.active) {
    await auth.signOut();
    return { error: "This account doesn't have staff access. Ask the admin to add you.", email: who };
  }
  await endPinSession();
  redirect("/staff");
}

/** Match an email, a full name, or a first name that only one active, set-up person has */
async function findStaff(who: string): Promise<Staff | null | "ambiguous"> {
  const q = who.trim().toLowerCase().replace(/\s+/g, " ");
  if (q.includes("@")) {
    const [row] = await db.select().from(staff).where(eq(sql`lower(${staff.email})`, q)).limit(1);
    return row ?? null;
  }
  const people = (await db.select().from(staff).where(and(eq(staff.active, true), isNotNull(staff.authUserId))))
    .map((p) => ({ p, full: p.name.trim().toLowerCase().replace(/\s+/g, " ") }));
  const exact = people.filter((x) => x.full === q);
  if (exact.length) return exact.length === 1 ? exact[0].p : "ambiguous";
  // first name, ignoring a courtesy title like "Mr." or "Ms."
  const untitled = (full: string) => full.replace(/^(mr|mrs|ms|miss|sir|ma'am)\.?\s+/, "");
  const bare = untitled(q);
  if (bare.includes(" ")) {
    const named = people.filter((x) => untitled(x.full) === bare);
    return named.length === 1 ? named[0].p : named.length ? "ambiguous" : null;
  }
  const byFirst = people.filter((x) => untitled(x.full).split(" ")[0] === bare);
  if (byFirst.length) return byFirst.length === 1 ? byFirst[0].p : "ambiguous";
  return null;
}

/** On this employee's branch: the registered Wi-Fi, or the branch's counter tablet */
async function atBranch(branchId: string) {
  if ((await onBranchNetwork(branchId)).ok) return true;
  const kiosk = await currentKiosk();
  return kiosk?.branchId === branchId;
}

/** Invited staff create their password. Works only for an email the admin added that has no login yet. */
export async function setUpAccount(_: FormState, form: FormData): Promise<FormState> {
  const email = lower(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters for your password.", email };

  const [invite] = await db
    .select()
    .from(staff)
    .where(and(eq(sql`lower(${staff.email})`, email), isNull(staff.authUserId), eq(staff.active, true)))
    .limit(1);
  if (!invite) return { error: "There's no pending invite for this email. Check the spelling, or ask the admin to add you.", email };

  const { data, error } = await auth.signUp.email({ email, password, name: invite.name });
  if (error || !data?.user) return { error: error?.message ?? "Couldn't create your account. Try again.", email };

  await db.update(staff).set({ authUserId: data.user.id }).where(eq(staff.id, invite.id));
  await audit(invite.id, "account.setup", { email });
  redirect("/staff?welcome=1");
}

/** First run only: creates the owner's admin account. Locked once any admin exists. */
export async function setUpOwner(_: FormState, form: FormData): Promise<FormState> {
  const name = clean(form.get("name"));
  const email = lower(form.get("email"));
  const password = String(form.get("password") ?? "");
  const code = clean(form.get("code"));

  const [existing] = await db.select({ id: staff.id }).from(staff).where(eq(staff.role, "admin")).limit(1);
  if (existing) return { error: "Setup is already done. Sign in instead." };
  if (!process.env.SETUP_CODE || code !== process.env.SETUP_CODE) return { error: "That setup code isn't right.", email };
  if (!name || !email) return { error: "Enter your name and email.", email };
  if (password.length < 8) return { error: "Use at least 8 characters for your password.", email };

  const { data, error } = await auth.signUp.email({ email, password, name });
  if (error || !data?.user) return { error: error?.message ?? "Couldn't create the account. Try again.", email };

  const [owner] = await db
    .insert(staff)
    .values({ email, name, role: "admin", authUserId: data.user.id })
    .returning({ id: staff.id });
  await audit(owner.id, "account.owner-setup", { email });
  redirect("/staff?welcome=1");
}

export async function signOut() {
  await endPinSession();
  // Only a password sign-in has a Neon session to end; don't let a failure there keep anyone signed in
  const { data: session } = await auth.getSession();
  if (session?.user) await auth.signOut().catch(() => {});
  redirect("/login");
}
