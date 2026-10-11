import "server-only";
import type { BoardContext } from "@/components/staff/OrderBoard";
import type { Order } from "@/db";
import { getOrderSettings, paymentRefClashes } from "@/lib/orders";
import { listPaymentAccounts } from "@/lib/payments";

/** What order cards need besides the orders: free delivery radius, account names, reused references */
export async function boardContext(list: Order[], branchIds: string[]): Promise<BoardContext> {
  const [settings, accounts, clashes] = await Promise.all([getOrderSettings(), listPaymentAccounts(branchIds), paymentRefClashes(list)]);
  return {
    freeWithin: Object.fromEntries(Object.entries(settings).map(([id, s]) => [id, s.delivery.freeWithin])),
    accounts: Object.fromEntries(accounts.map((a) => [a.id, a.label])),
    clashes,
  };
}
