import "server-only";
import { randomBytes } from "node:crypto";
import { and, inArray, isNull, like, lt, sql } from "drizzle-orm";
import { auditLog, db, orderMessages, orders } from "@/db";
import { retentionCutoff, SCRUBBED } from "./retention-rules";

/**
 * The privacy notice promises it: a year after an order, the customer's details are removed.
 * Items and totals stay for the cafe's books; the name, number, address, pin, notes, IP address,
 * payment reference and chat go, and the old order link stops opening. Runs daily (vercel.json).
 */
const BATCH = 500;

export async function anonymizeOldOrders(now = new Date()): Promise<{ orders: number; messages: number }> {
  const cutoff = retentionCutoff(now);
  let total = { orders: 0, messages: 0 };
  // In batches, so a big first run can't time out
  for (;;) {
    const old = await db.select({ id: orders.id }).from(orders).where(and(lt(orders.createdAt, cutoff), isNull(orders.anonymizedAt))).limit(BATCH);
    if (old.length === 0) break;
    const ids = old.map((o) => o.id);
    const [gone] = await db.batch([
      db.delete(orderMessages).where(inArray(orderMessages.orderId, ids)).returning({ id: orderMessages.id }),
      db
        .update(orders)
        // A random token nobody holds, so the old link no longer opens
        .set({ ...SCRUBBED, tokenHash: randomBytes(32).toString("hex"), anonymizedAt: now })
        .where(inArray(orders.id, ids)),
    ]);
    total = { orders: total.orders + ids.length, messages: total.messages + gone.length };
    if (old.length < BATCH) break;
  }
  // Staff logs keep who checked a payment, but not the customer's reference number
  await db
    .update(auditLog)
    .set({ detail: sql`${auditLog.detail} - 'ref'` })
    .where(and(like(auditLog.action, "order.payment%"), lt(auditLog.at, cutoff)));
  return total;
}
