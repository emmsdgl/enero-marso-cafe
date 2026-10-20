import "server-only";
import { and, count, eq, gte, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { auditLog, db, staff } from "@/db";
import { auth } from "./auth/server";
import { RESET_WINDOW_MINUTES, resetDecision, resetOutcome, STAFF_EMAIL_ACTIONS } from "./email-rules";
import { siteUrl } from "./site";
import { audit } from "./staff";

/** Someone on the team who has finished setting up their account, by email */
export async function teamMemberByEmail(email: string) {
  const [me] = await db
    .select()
    .from(staff)
    .where(and(eq(sql`lower(${staff.email})`, email.toLowerCase()), eq(staff.active, true), isNull(staff.removedAt), isNotNull(staff.authUserId)))
    .limit(1);
  return me ?? null;
}

/** Staff emails sent in the last 24 hours (reset codes and invites share one daily allowance) */
export async function staffEmailsToday() {
  const [row] = await db
    .select({ n: count() })
    .from(auditLog)
    .where(and(inArray(auditLog.action, [...STAFF_EMAIL_ACTIONS]), gte(auditLog.at, new Date(Date.now() - 24 * 3600_000))));
  return row?.n ?? 0;
}

/**
 * Emails a 6-digit reset code if this is someone on the team, within the limits. Says nothing about
 * whether the email was found: the page shows the same thing either way.
 */
export async function sendResetCode(email: string) {
  const me = await teamMemberByEmail(email);
  if (!me) return;
  const [recent] = await db
    .select({ n: count() })
    .from(auditLog)
    .where(and(eq(auditLog.actorId, me.id), eq(auditLog.action, "password.code-sent"), gte(auditLog.at, new Date(Date.now() - RESET_WINDOW_MINUTES * 60_000))));
  const decision = resetDecision(recent?.n ?? 0, await staffEmailsToday());
  if (decision !== "send") {
    await audit(me.id, "password.code-limited", { why: decision });
    return;
  }
  const { error } = await auth.emailOtp.sendVerificationOtp({ email: me.email, type: "forget-password" });
  await audit(me.id, error ? "password.code-failed" : "password.code-sent", error ? { status: error.status ?? null } : undefined);
}

/**
 * Sets a new password with the emailed code. This calls Neon Auth directly because the SDK's own
 * emailOtp.resetPassword (0.5.0-beta) posts to "email-otp/passcode", which Neon Auth answers with 404.
 * Same request the SDK makes for its other calls: JSON, with the page's origin (a trusted domain).
 */
export async function resetWithCode(email: string, otp: string, password: string) {
  const h = await headers();
  const origin = h.get("origin") || h.get("referer")?.split("/").slice(0, 3).join("/") || siteUrl();
  const base = process.env.NEON_AUTH_BASE_URL!;
  const res = await fetch(new URL("email-otp/reset-password", base.endsWith("/") ? base : `${base}/`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, "x-neon-auth-proxy": "nextjs" },
    body: JSON.stringify({ email: email.toLowerCase(), otp, password }),
    cache: "no-store",
  }).catch(() => null);
  if (!res) return "failed" as const;
  const body = res.ok ? null : ((await res.json().catch(() => null)) as { code?: string } | null);
  const outcome = resetOutcome(res.status, body?.code);
  if (outcome === "ok") {
    const me = await teamMemberByEmail(email);
    if (me) await audit(me.id, "password.reset");
  }
  return outcome;
}
