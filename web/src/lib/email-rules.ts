/**
 * Limits for the emails the site sends. Resend's free plan sends at most 100 a day and then nothing
 * until the next day, so order emails get 60 and staff emails (password codes, invites) keep 40:
 * a busy day of orders can never stop someone resetting their password.
 */
export const ORDER_EMAILS_PER_DAY = 60;
export const STAFF_EMAILS_PER_DAY = 40;

/** Password reset codes: Neon Auth's code works for 5 minutes and allows 3 wrong tries */
export const RESET_CODE_MINUTES = 5;
export const RESET_CODES_PER_PERSON = 3;
export const RESET_WINDOW_MINUTES = 30;

/** Audit actions that each cost one staff email */
export const STAFF_EMAIL_ACTIONS = ["password.code-sent", "staff.invite-sent"] as const;

/** Good enough to try sending to: one @, a dot in the domain, no spaces, not absurdly long */
export function looksLikeEmail(v: string) {
  return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Whether to send someone a reset code, given how many they've had lately and the day's staff emails */
export function resetDecision(personRecent: number, staffToday: number): "send" | "person-limit" | "day-limit" {
  if (personRecent >= RESET_CODES_PER_PERSON) return "person-limit";
  if (staffToday >= STAFF_EMAILS_PER_DAY) return "day-limit";
  return "send";
}

/** What Neon Auth's answer to "reset with this code" means for the person typing it */
export function resetOutcome(status: number, code?: string): "ok" | "wrong" | "too-many" | "weak" | "failed" {
  if (status >= 200 && status < 300) return "ok";
  if (code === "TOO_MANY_ATTEMPTS") return "too-many";
  if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") return "weak";
  if (code === "INVALID_OTP" || code === "OTP_EXPIRED" || status === 400) return "wrong";
  return "failed";
}

/** A staff member's personal setup link works this long */
export const INVITE_DAYS = 7;

type InviteFields = { authUserId: string | null; inviteHash: string | null; inviteExpiresAt: Date | null; inviteSentAt: Date | null };

/** Where someone's setup link stands, for the Team page */
export function inviteState(p: InviteFields, now: Date): "set-up" | "none" | "emailed" | "copied" | "expired" {
  if (p.authUserId) return "set-up";
  if (!p.inviteHash || !p.inviteExpiresAt) return "none";
  if (p.inviteExpiresAt <= now) return "expired";
  return p.inviteSentAt ? "emailed" : "copied";
}
