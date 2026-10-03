import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, kiosks } from "@/db";
import { hashKioskToken, KIOSK_COOKIE } from "@/lib/staff";

/** The tablet this request comes from, if it's a registered (not removed) clock-in tablet */
export async function currentKiosk() {
  const token = (await cookies()).get(KIOSK_COOKIE)?.value;
  if (!token) return null;
  const [k] = await db
    .select()
    .from(kiosks)
    .where(and(eq(kiosks.tokenHash, hashKioskToken(token)), isNull(kiosks.revokedAt)))
    .limit(1);
  return k ?? null;
}
