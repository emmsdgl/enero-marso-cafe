import "server-only";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auditLog, branchNetworks, db, staff, type Role, type Staff } from "@/db";
import { auth } from "@/lib/auth/server";

/** The signed-in person's staff record, or null (not signed in, not staff, or deactivated) */
export async function getCurrentStaff(): Promise<Staff | null> {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user) return null;
  const [row] = await db.select().from(staff).where(eq(staff.authUserId, user.id)).limit(1);
  return row && row.active ? row : null;
}

/** Use at the top of every staff page and action. Redirects anyone without the right role. */
export async function requireStaff(roles?: Role[]): Promise<Staff> {
  const me = await getCurrentStaff();
  if (!me) redirect("/login?reason=no-access");
  if (roles && !roles.includes(me.role)) redirect("/staff?reason=forbidden");
  return me;
}

/** Managers and employees act on their own branch; the admin can act on either */
export function canActOnBranch(me: Staff, branchId: string) {
  return me.role === "admin" || me.branchId === branchId;
}

export async function audit(actorId: string | null, action: string, detail?: Record<string, unknown>) {
  await db.insert(auditLog).values({ actorId, action, detail: detail ?? null });
}

/** The visitor's public IP as seen by the server (Vercel sets x-forwarded-for) */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || "unknown";
}

/** Is this request coming from one of the branch's registered internet connections? */
export async function onBranchNetwork(branchId: string): Promise<{ ok: boolean; ip: string }> {
  const ip = await clientIp();
  const [hit] = await db
    .select({ id: branchNetworks.id })
    .from(branchNetworks)
    .where(and(eq(branchNetworks.branchId, branchId), eq(branchNetworks.ip, ip)))
    .limit(1);
  return { ok: !!hit, ip };
}

// ——— PINs (scrypt, salted) ———
export function hashPin(pin: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(pin, salt, 32).toString("hex")}`;
}
export function verifyPin(pin: string, stored: string | null) {
  if (!stored) return false;
  const [salt, hash] = stored.split(":");
  const test = scryptSync(pin, Buffer.from(salt, "hex"), 32);
  return timingSafeEqual(test, Buffer.from(hash, "hex"));
}
export const PIN_RULE = /^\d{4,6}$/;

// ——— Clock-in tablet tokens: random secret in an httpOnly cookie, only an HMAC of it in the database ———
export function newKioskToken() {
  return randomBytes(32).toString("base64url");
}
export function hashKioskToken(token: string) {
  return createHmac("sha256", process.env.KIOSK_SECRET!).update(token).digest("hex");
}
export const KIOSK_COOKIE = "em_kiosk";

/** Manila wall-clock formatting for times shown to staff */
export const manila = {
  time: (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }),
  date: (d: Date) => d.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric" }),
};

export function hoursBetween(a: Date, b: Date) {
  return Math.max(0, (b.getTime() - a.getTime()) / 3_600_000);
}
