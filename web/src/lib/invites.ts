import "server-only";
import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, staff, type Staff } from "@/db";
import { branches } from "@/data/branches";
import { sendEmail, simpleHtml, staffEmailFrom } from "./email";
import { INVITE_DAYS, STAFF_EMAILS_PER_DAY } from "./email-rules";
import { staffEmailsToday } from "./password-reset";
import { siteUrl } from "./site";
import { audit, manila } from "./staff";

/**
 * Personal setup links for new staff: /login/setup?invite=…, good for 7 days. Only a hash is kept,
 * and making a new link ends the old one. Emailed when email is set up; the admin can also copy it
 * and send it another way. Once email is on, setting up needs one of these links.
 */
const hashInvite = (token: string) => createHash("sha256").update(token).digest("hex");
const invitePath = (token: string) => `/login/setup?invite=${token}`;

async function newInvite(p: Staff) {
  const token = randomBytes(24).toString("base64url");
  const expires = new Date(Date.now() + INVITE_DAYS * 86_400_000);
  await db.update(staff).set({ inviteHash: hashInvite(token), inviteExpiresAt: expires, inviteSentAt: null }).where(eq(staff.id, p.id));
  return { token, expires };
}

export async function emailInvite(p: Staff, by: Staff): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!staffEmailFrom) return { ok: false, error: "Email isn't set up yet. Copy the setup link instead." };
  if (p.authUserId) return { ok: false, error: `${p.name} has already set up their account.` };
  if ((await staffEmailsToday()) >= STAFF_EMAILS_PER_DAY) {
    return { ok: false, error: "Today’s staff emails have run out. Copy the setup link instead, or send it tomorrow." };
  }
  const { token, expires } = await newInvite(p);
  const url = `${siteUrl()}${invitePath(token)}`;
  const first = p.name.trim().split(/\s+/)[0];
  const where = p.branchId ? branches.find((b) => b.id === p.branchId)!.name : "Enero Marso Cafe and Cafe Noir";
  const until = manila.date(expires);
  const sent = await sendEmail({
    from: staffEmailFrom,
    to: p.email,
    subject: "Set up your Enero Marso staff account",
    text: [
      `Hi ${first},`,
      `${by.name} added you to the team at ${where}. Choose your password here:`,
      url,
      `The link is just for you and works until ${until}. If you weren't expecting this, you can ignore this email.`,
    ].join("\n\n"),
    html: simpleHtml({
      paragraphs: [`Hi ${first},`, `${by.name} added you to the team at ${where}. Choose your password to set up your staff account.`],
      button: { label: "Set up my account", url },
      after: [`The link is just for you and works until ${until}. If you weren't expecting this, you can ignore this email.`],
    }),
    idempotencyKey: `invite-${hashInvite(token).slice(0, 40)}`,
  });
  if (!sent.ok) {
    // Nobody has this link, so drop it: the Team page shows them as not invited yet
    await db.update(staff).set({ inviteHash: null, inviteExpiresAt: null }).where(eq(staff.id, p.id));
    await audit(by.id, "staff.invite-failed", { staffId: p.id, error: sent.error.slice(0, 200) });
    return { ok: false, error: `The invite email to ${p.email} didn’t go out. Check the address, or copy the setup link instead.` };
  }
  await db.update(staff).set({ inviteSentAt: new Date() }).where(eq(staff.id, p.id));
  await audit(by.id, "staff.invite-sent", { staffId: p.id });
  return { ok: true };
}

/** A fresh link for the admin to send another way (a text, Messenger). It doesn't prove the email is theirs. */
export async function inviteLink(p: Staff, by: Staff): Promise<{ path: string } | { error: string }> {
  if (p.authUserId) return { error: `${p.name} has already set up their account.` };
  const { token } = await newInvite(p);
  await audit(by.id, "staff.invite-link", { staffId: p.id });
  return { path: invitePath(token) };
}

/** The person a setup link belongs to, while it's still good */
export async function inviteFor(token: string) {
  if (!/^[\w-]{20,64}$/.test(token)) return null;
  const [p] = await db
    .select()
    .from(staff)
    .where(and(eq(staff.inviteHash, hashInvite(token)), gt(staff.inviteExpiresAt, new Date()), eq(staff.active, true), isNull(staff.removedAt), isNull(staff.authUserId)))
    .limit(1);
  return p ?? null;
}
