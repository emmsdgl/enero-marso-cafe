import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Short sign-in for employees who used their PIN at the branch.
 * Neon Auth only signs people in with a password, so this is a separate signed cookie:
 * staff id + expiry, HMAC-signed. It never grants manager or admin access (checked where it's read).
 */
export const PIN_SESSION_COOKIE = "em_pin_session";
const HOURS = 12;

const key = () => createHmac("sha256", process.env.KIOSK_SECRET!).update("pin-session").digest();
const sign = (body: string) => createHmac("sha256", key()).update(body).digest("base64url");

export async function startPinSession(staffId: string) {
  const exp = Date.now() + HOURS * 3_600_000;
  const body = Buffer.from(JSON.stringify({ sid: staffId, exp })).toString("base64url");
  (await cookies()).set(PIN_SESSION_COOKIE, `${body}.${sign(body)}`, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: HOURS * 3600,
  });
}

/** The staff id in a valid, unexpired PIN session cookie, or null */
export async function readPinSession(): Promise<string | null> {
  const raw = (await cookies()).get(PIN_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const { sid, exp } = JSON.parse(Buffer.from(body, "base64url").toString());
    return typeof sid === "string" && typeof exp === "number" && exp > Date.now() ? sid : null;
  } catch {
    return null;
  }
}

export async function endPinSession() {
  (await cookies()).delete(PIN_SESSION_COOKIE);
}
