import "server-only";
import { inArray } from "drizzle-orm";
import type { BoardContext } from "@/components/staff/OrderBoard";
import { db, staff, type Order } from "@/db";
import { getOrderSettings, paymentRefClashes } from "@/lib/orders";
import { listPaymentAccounts } from "@/lib/payments";
import { riderChoices } from "@/lib/riders";

/**
 * What order cards need besides the orders: free delivery radius, account names, reused references,
 * who can take each branch's deliveries, and the names of those already taking one.
 */
export async function boardContext(list: Order[], branchIds: string[], manager: boolean): Promise<BoardContext> {
  const riderIds = [...new Set(list.flatMap((o) => (o.riderId ? [o.riderId] : [])))];
  const [settings, accounts, clashes, riders, names] = await Promise.all([
    getOrderSettings(),
    listPaymentAccounts(branchIds),
    paymentRefClashes(list),
    riderChoices(branchIds),
    riderIds.length ? db.select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, riderIds)) : [],
  ]);
  return {
    freeWithin: Object.fromEntries(Object.entries(settings).map(([id, s]) => [id, s.delivery.freeWithin])),
    accounts: Object.fromEntries(accounts.map((a) => [a.id, a.label])),
    clashes,
    riders,
    riderNames: Object.fromEntries(names.map((n) => [n.id, n.name])),
    manager,
  };
}
