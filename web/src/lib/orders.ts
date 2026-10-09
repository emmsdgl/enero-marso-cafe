import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray } from "drizzle-orm";
import { branches as branchDefs } from "@/data/branches";
import { branches, db, orderItems, orders, type Order, type OrderItem, type Staff } from "@/db";
import { isBranchId, type BranchId } from "./menu";
import { loadMenus } from "./menu-store";
import { canMove, type OrderStatus } from "./order-rules";
import { hashOrderToken, newOrderCode, newOrderToken, tokenMatches } from "./order-token";
import { pickupAllowed } from "./pickup";
import { normalizePhone, priceCart, type CartLine } from "./pricing";
import { announce, channels } from "./realtime";
import { audit, canActOnBranch } from "./staff";

export type OrderSettings = Record<BranchId, { ordersOpen: boolean; cutoff: number }>;

/** Whether each branch takes online orders right now, and how long before closing they stop */
export async function getOrderSettings(): Promise<OrderSettings> {
  const rows = await db.select({ id: branches.id, ordersOpen: branches.ordersOpen, cutoff: branches.orderCutoffMinutes }).from(branches);
  const of = (id: BranchId) => {
    const r = rows.find((x) => x.id === id);
    return { ordersOpen: r?.ordersOpen ?? false, cutoff: r?.cutoff ?? 30 };
  };
  return { main: of("main"), noir: of("noir") };
}

export type PlaceOrderInput = {
  branch: string;
  fulfillment: string;
  wantedAt: string | null;
  lines: CartLine[];
  name: string;
  phone: string;
  notes: string;
};
type Fail = { ok: false; error: string };

/** Limits that stop pranks and accidental double-taps without bothering real customers */
const PER_IP_PER_HOUR = 5;
const PER_PHONE_PER_HOUR = 3;

export async function placeOrder(input: PlaceOrderInput, ip: string): Promise<{ ok: true; code: string; token: string } | Fail> {
  if (!isBranchId(input?.branch)) return { ok: false, error: "Choose a branch." };
  const branch = branchDefs.find((b) => b.id === input.branch)!;
  const settings = (await getOrderSettings())[input.branch];
  if (!settings.ordersOpen) return { ok: false, error: `${branch.name} isn't taking online orders right now. Please call or drop by.` };
  if (input.fulfillment !== "pickup") return { ok: false, error: "Delivery opens soon. For now, please choose pickup." };

  const now = new Date();
  const wanted = input.wantedAt ? new Date(input.wantedAt) : null;
  if (wanted && Number.isNaN(wanted.getTime())) return { ok: false, error: "Choose a pickup time." };
  if (!pickupAllowed(branch, now, settings.cutoff, wanted)) {
    return { ok: false, error: "That pickup time isn't available any more. Please choose another." };
  }

  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  const phone = normalizePhone(String(input.phone ?? ""));
  const notes = String(input.notes ?? "").trim() || null;
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Enter your name, so we know whose order it is." };
  if (!phone) return { ok: false, error: "Enter a mobile number like 0917 123 4567, so we can reach you about your order." };
  if (notes && notes.length > 300) return { ok: false, error: "Keep the notes under 300 characters." };

  const hourAgo = new Date(now.getTime() - 3_600_000);
  const [[byIp], [byPhone]] = await Promise.all([
    db.select({ n: count() }).from(orders).where(and(eq(orders.createdIp, ip), gte(orders.createdAt, hourAgo))),
    db.select({ n: count() }).from(orders).where(and(eq(orders.customerPhone, phone), gte(orders.createdAt, hourAgo))),
  ]);
  if (byIp.n >= PER_IP_PER_HOUR || byPhone.n >= PER_PHONE_PER_HOUR) {
    return { ok: false, error: "You've placed several orders in the last hour. To add more, please call the branch." };
  }

  const priced = priceCart((await loadMenus())[input.branch], input.lines);
  if (!priced.ok) return priced;

  const id = randomUUID();
  const token = newOrderToken();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newOrderCode();
    try {
      await db.batch([
        db.insert(orders).values({
          id, code, branchId: input.branch, tokenHash: hashOrderToken(token), fulfillment: "pickup", wantedAt: wanted,
          customerName: name, customerPhone: phone, notes, subtotal: priced.subtotal, total: priced.subtotal, createdIp: ip,
        }),
        db.insert(orderItems).values(
          priced.lines.map((l, i) => ({
            orderId: id, itemId: l.itemId, name: l.name, size: l.size, upsized: l.upsized, addons: l.addons,
            unitPrice: l.unitPrice, qty: l.qty, lineTotal: l.lineTotal, sort: i,
          })),
        ),
      ]);
      await announce([channels.branch(input.branch)]);
      return { ok: true, code, token };
    } catch (e) {
      if (!isCodeClash(e)) throw e;
    }
  }
  return { ok: false, error: "Couldn't place the order. Please try again." };
}

function isCodeClash(e: unknown) {
  const err = e as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  const c = err?.cause ?? err;
  return c?.code === "23505" && c?.constraint === "orders_code_unique";
}

export type FullOrder = Order & { items: OrderItem[] };

async function withItems(list: Order[]): Promise<FullOrder[]> {
  if (list.length === 0) return [];
  const items = await db.select().from(orderItems).where(inArray(orderItems.orderId, list.map((o) => o.id))).orderBy(asc(orderItems.sort));
  return list.map((o) => ({ ...o, items: items.filter((i) => i.orderId === o.id) }));
}

/** The customer's view: only with the token from their link */
export async function getCustomerOrder(code: string, token: string | undefined): Promise<FullOrder | null> {
  const [o] = await db.select().from(orders).where(eq(orders.code, code.toUpperCase())).limit(1);
  if (!o || !tokenMatches(token, o.tokenHash)) return null;
  return (await withItems([o]))[0];
}

/** The branch board: everything from the last 18 hours, so a night's orders stay in view */
export async function listBranchOrders(branchIds: string[]): Promise<FullOrder[]> {
  const since = new Date(Date.now() - 18 * 3_600_000);
  const list = await db.select().from(orders).where(and(inArray(orders.branchId, branchIds), gte(orders.createdAt, since))).orderBy(desc(orders.createdAt));
  return withItems(list);
}

const STAMP: Partial<Record<OrderStatus, keyof Order>> = {
  accepted: "acceptedAt",
  ready: "readyAt",
  out_for_delivery: "outAt",
  done: "doneAt",
  cancelled: "cancelledAt",
};

/** Staff move an order one step. Refuses if someone else moved it first. */
export async function moveOrder(me: Staff, orderId: string, from: OrderStatus, to: OrderStatus, reason?: string): Promise<{ ok: true } | Fail> {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return { ok: false, error: "That order no longer exists." };
  if (!canActOnBranch(me, o.branchId)) return { ok: false, error: "That order belongs to the other branch." };
  if (o.status !== from) return { ok: false, error: "Someone already updated this order. The board now shows the latest." };
  if (!canMove(o.fulfillment, from, to, o.paymentStatus)) return { ok: false, error: "That step isn't possible for this order." };
  const why = reason?.trim();
  if (to === "cancelled" && (!why || why.length > 120)) return { ok: false, error: "Give a short reason for cancelling, so the customer knows why." };

  const now = new Date();
  const changes: Partial<Order> = { status: to, updatedAt: now };
  const stamp = STAMP[to];
  if (stamp) Object.assign(changes, { [stamp]: now });
  if (to === "accepted") changes.acceptedBy = me.id;
  if (to === "cancelled") changes.cancelReason = why!;

  const done = await db.update(orders).set(changes).where(and(eq(orders.id, o.id), eq(orders.status, from))).returning({ id: orders.id });
  if (done.length === 0) return { ok: false, error: "Someone already updated this order. The board now shows the latest." };
  if (to === "cancelled") await audit(me.id, "order.cancel", { orderId: o.id, code: o.code, reason: why });
  await announce([channels.branch(o.branchId), channels.order(o.id)]);
  return { ok: true };
}

/** The customer can take back an order nobody has accepted yet */
export async function cancelByCustomer(code: string, token: string): Promise<{ ok: true } | Fail> {
  const o = await getCustomerOrder(code, token);
  if (!o) return { ok: false, error: "We couldn't find that order." };
  if (o.status !== "pending") return { ok: false, error: "The cafe has already accepted your order, so please call them to change it." };
  const now = new Date();
  const done = await db
    .update(orders)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now, cancelReason: "Cancelled by the customer" })
    .where(and(eq(orders.id, o.id), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  if (done.length === 0) return { ok: false, error: "The cafe has already accepted your order, so please call them to change it." };
  await announce([channels.branch(o.branchId), channels.order(o.id)]);
  return { ok: true };
}
