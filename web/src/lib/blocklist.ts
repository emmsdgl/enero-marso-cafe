import "server-only";
import { desc, eq } from "drizzle-orm";
import { blockedPhones, db, orders, staff, type Staff } from "@/db";
import { BLOCK_REASONS } from "./order-rules";
import { isOrderId } from "./orders";
import { audit, canActOnBranch } from "./staff";

/**
 * Numbers that can't order online: prank orders and repeated no-shows cost the cafe real
 * drinks. Managers and the admin block a number from an order's page; it applies to both
 * branches, and they can unblock it from there or from Staff > Branch.
 */
type Fail = { ok: false; error: string };
const managersOnly = (me: Staff) => me.role === "manager" || me.role === "admin";

export async function blockedEntry(phone: string) {
  const [row] = await db.select().from(blockedPhones).where(eq(blockedPhones.phone, phone)).limit(1);
  return row ?? null;
}

export async function listBlocked() {
  return db
    .select({ phone: blockedPhones.phone, reason: blockedPhones.reason, createdAt: blockedPhones.createdAt, by: staff.name })
    .from(blockedPhones)
    .leftJoin(staff, eq(staff.id, blockedPhones.blockedBy))
    .orderBy(desc(blockedPhones.createdAt));
}

/** Blocks the number on this order */
export async function blockOrderPhone(me: Staff, orderId: string, reason: string): Promise<{ ok: true } | Fail> {
  if (!managersOnly(me)) return { ok: false, error: "Only managers can block a number." };
  if (!(BLOCK_REASONS as readonly string[]).includes(reason)) return { ok: false, error: "Choose a reason." };
  if (!isOrderId(orderId)) return { ok: false, error: "That order no longer exists." };
  const [o] = await db.select({ code: orders.code, phone: orders.customerPhone, branchId: orders.branchId }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || !canActOnBranch(me, o.branchId)) return { ok: false, error: "That order isn't on your branch's board." };
  if (!o.phone) return { ok: false, error: "This order no longer has a number." };
  await db.insert(blockedPhones).values({ phone: o.phone, reason, blockedBy: me.id }).onConflictDoNothing();
  await audit(me.id, "phone.block", { code: o.code, reason });
  return { ok: true };
}

export async function unblockPhone(me: Staff, phone: string): Promise<{ ok: true } | Fail> {
  if (!managersOnly(me)) return { ok: false, error: "Only managers can unblock a number." };
  await db.delete(blockedPhones).where(eq(blockedPhones.phone, phone));
  await audit(me.id, "phone.unblock", {});
  return { ok: true };
}
