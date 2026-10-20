"use server";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, staff, type Staff } from "@/db";
import { auth } from "@/lib/auth/server";
import { staffEmailFrom } from "@/lib/email";
import { looksLikeEmail, RESET_CODE_MINUTES } from "@/lib/email-rules";
import { inviteFor } from "@/lib/invites";
import { currentKiosk } from "@/lib/kiosk";
import { resetWithCode, sendResetCode } from "@/lib/password-reset";
import { endPinSession, startPinSession } from "@/lib/pin-session";
import { homeFor, usesPin } from "@/lib/roles";
import {
  audit, onBranchNetwork, PIN_LOCK_MINUTES, PIN_MAX_TRIES, PIN_RULE, pinFailures, verifyPin,
} from "@/lib/staff";

export type FormState = { error?: string; email?: string } | undefined;

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const lower = (v: FormDataEntryValue | null) => clean(v).toLowerCase();
/** Where to go after signing in: a staff page on this site (like Branch setup for the tablet), else their home */
const staffPath = (v: FormDataEntryValue | null, home: string) => {
  const path = clean(v);
  return /^\/staff(\/[\w-]+)*([?#][\w=&%-]*)?$/.test(path) ? path : home;
};

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
    if (!usesPin(found.role)) return { error: "Managers and the admin sign in with their password.", email: who };
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
    redirect(staffPath(form.get("next"), homeFor(found)));
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
  redirect(staffPath(form.get("next"), homeFor(me)));
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

/**
 * Invited staff create their password. With a setup link (?invite=…) the link says who they are; an
 * emailed link also proves the email is theirs. Without one, they type the email the admin added,
 * which only works while email isn't set up: after that, everyone sets up through their link.
 */
export async function setUpAccount(_: FormState, form: FormData): Promise<FormState> {
  const token = clean(form.get("invite"));
  const password = String(form.get("password") ?? "");
  let invite: Staff | null;
  let email: string;
  if (token) {
    invite = await inviteFor(token);
    if (!invite) return { error: "This setup link has expired, or a newer one replaced it. Ask the admin for a new invite." };
    email = invite.email.toLowerCase();
  } else {
    if (staffEmailFrom) return { error: "Use the setup link from your invite email. No email? Ask the admin to send it again." };
    email = lower(form.get("email"));
    [invite] = await db
      .select()
      .from(staff)
      .where(and(eq(sql`lower(${staff.email})`, email), isNull(staff.authUserId), eq(staff.active, true), isNull(staff.removedAt)))
      .limit(1);
    if (!invite) return { error: "There's no pending invite for this email. Check the spelling, or ask the admin to add you.", email };
  }
  if (password.length < 8) return { error: "Use at least 8 characters for your password.", email };
  if (password.length > 128) return { error: "Use at most 128 characters for your password.", email };

  const { data, error } = await auth.signUp.email({ email, password, name: invite.name });
  if (error || !data?.user) return { error: error?.message ?? "Couldn't create your account. Try again.", email };

  const emailed = Boolean(token && invite.inviteSentAt);
  await db
    .update(staff)
    .set({ authUserId: data.user.id, inviteHash: null, inviteExpiresAt: null, ...(emailed ? { emailVerifiedAt: new Date() } : {}) })
    .where(eq(staff.id, invite.id));
  await audit(invite.id, "account.setup", { email, via: token ? (emailed ? "emailed link" : "copied link") : "typed email" });
  redirect(`${homeFor(invite)}?welcome=1`);
}

export type ResetState = { step: "email" | "code"; email: string; error?: string; notice?: string } | undefined;

/**
 * Forgot password, in two steps on one page. "email": send a 6-digit code (the answer is the same
 * whether or not the email is on the team). "code": the code plus a new password.
 */
export async function resetPassword(_: ResetState, form: FormData): Promise<ResetState> {
  const email = lower(form.get("email"));
  const step = clean(form.get("step"));
  if (step === "restart") return { step: "email", email: "" };
  if (step === "code") {
    const code = clean(form.get("code")).replace(/\s+/g, "");
    const password = String(form.get("password") ?? "");
    if (!/^\d{6}$/.test(code)) return { step: "code", email, error: "Enter the 6-digit code from the email." };
    if (password.length < 8) return { step: "code", email, error: "Use at least 8 characters for your new password." };
    if (password.length > 128) return { step: "code", email, error: "Use at most 128 characters for your new password." };
    const outcome = await resetWithCode(email, code, password);
    if (outcome === "ok") redirect("/login?reset=1");
    const error = {
      wrong: "That code isn’t right, or it has expired. Check the newest email, or send a new code.",
      "too-many": "Too many wrong tries, so that code has stopped working. Send a new code.",
      weak: "Use 8 to 128 characters for your new password.",
      failed: "Couldn’t change your password just now. Try again in a minute.",
    }[outcome];
    return { step: "code", email, error };
  }
  if (!looksLikeEmail(email)) return { step: "email", email, error: "Enter the email you sign in with." };
  await sendResetCode(email);
  return {
    step: "code",
    email,
    notice: `If ${email} is on the team, a 6-digit code is on its way. It works for ${RESET_CODE_MINUTES} minutes.`,
  };
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
