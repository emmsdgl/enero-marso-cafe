"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, staff } from "@/db";
import { auth } from "@/lib/auth/server";
import { audit } from "@/lib/staff";

export type FormState = { error?: string; email?: string } | undefined;

const clean = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const lower = (v: FormDataEntryValue | null) => clean(v).toLowerCase();

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const email = lower(form.get("email"));
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };

  const { data, error } = await auth.signIn.email({ email, password });
  if (error || !data?.user) return { error: "That email and password don't match. Try again or ask the admin to reset it.", email };

  const [me] = await db.select().from(staff).where(eq(staff.authUserId, data.user.id)).limit(1);
  if (!me || !me.active) {
    await auth.signOut();
    return { error: "This account doesn't have staff access. Ask the admin to add you.", email };
  }
  redirect("/staff");
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
  await auth.signOut();
  redirect("/login");
}
