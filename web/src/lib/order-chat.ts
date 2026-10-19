import "server-only";
import { and, asc, count, eq, gte, inArray, or, sql } from "drizzle-orm";
import { db, orderMessages, orders, staff, type Staff } from "@/db";
import type { CardKind } from "./chat-cards";
import { chatState, cleanMessage, CUSTOMER_ALERT_KINDS, type Fulfillment, type OrderStatus, type Sender } from "./order-rules";
import { tokenMatches } from "./order-token";
import { getCustomerOrder, getStaffOrder, isOrderId } from "./orders";
import { notifyBranch } from "./push";
import { messagePayload } from "./push-rules";
import { announce, channels } from "./realtime";
import { canActOnBranch } from "./staff";

/**
 * The per-order chat. The order's own times decide whether it's open (see chatState), so a
 * closed chat needs no background job, and every write checks again on the server.
 */
export type ChatMessage = { id: string; sender: Sender; body: string; kind: string; meta: Record<string, unknown> | null; createdAt: Date; staffName: string | null };
type Fail = { ok: false; error: string };

/** Keeps one excited (or scripted) customer from flooding a branch's board */
const CUSTOMER_PER_MINUTE = 5;
const CUSTOMER_PER_ORDER = 40;

export async function listMessages(orderId: string): Promise<ChatMessage[]> {
  return db
    .select({
      id: orderMessages.id, sender: orderMessages.sender, body: orderMessages.body, kind: orderMessages.kind, meta: orderMessages.meta,
      createdAt: orderMessages.createdAt, staffName: staff.name,
    })
    .from(orderMessages)
    .leftJoin(staff, eq(staff.id, orderMessages.staffId))
    .where(eq(orderMessages.orderId, orderId))
    .orderBy(asc(orderMessages.createdAt));
}

export async function postCustomerMessage(code: string, token: string, body: unknown): Promise<{ ok: true } | Fail> {
  const o = await getCustomerOrder(code, token);
  if (!o) return { ok: false, error: "We couldn't find that order." };
  const msg = cleanMessage(body);
  if (!msg.ok) return msg;
  if (!chatState(o).open) return { ok: false, error: "This chat has closed. For anything else, please message us on Facebook." };

  const fromCustomer = and(eq(orderMessages.orderId, o.id), eq(orderMessages.sender, "customer"));
  const [[recent], [total]] = await Promise.all([
    // The database's own clock: messages are stamped by it, and a minute is too short to trust two clocks
    db.select({ n: count() }).from(orderMessages).where(and(fromCustomer, gte(orderMessages.createdAt, sql`now() - interval '1 minute'`))),
    db.select({ n: count() }).from(orderMessages).where(fromCustomer),
  ]);
  if (recent.n >= CUSTOMER_PER_MINUTE) return { ok: false, error: "That's a lot of messages at once. Give the cafe a minute to reply." };
  if (total.n >= CUSTOMER_PER_ORDER) return { ok: false, error: "This chat is full. Please call the branch instead." };

  await db.batch([
    db.insert(orderMessages).values({ orderId: o.id, sender: "customer", body: msg.text }),
    // Writing counts as reading: everything before this message has been seen
    db.update(orders).set({ customerLastReadAt: sql`now()` }).where(eq(orders.id, o.id)),
  ]);
  await announce([channels.branch(o.branchId), channels.order(o.id)]);
  notifyBranch(o.branchId, "message", messagePayload(o, msg.text));
  return { ok: true };
}

export async function postStaffMessage(me: Staff, orderId: string, body: unknown): Promise<{ ok: true } | Fail> {
  const o = await getStaffOrder(me, orderId);
  if (!o) return { ok: false, error: "That order isn't on your branch's board." };
  const msg = cleanMessage(body);
  if (!msg.ok) return msg;
  if (!chatState(o).open) return { ok: false, error: "This chat has closed, so the customer won't see new messages. Call them instead." };

  await db.batch([
    db.insert(orderMessages).values({ orderId: o.id, sender: "staff", staffId: me.id, body: msg.text }),
    db.update(orders).set({ staffLastReadAt: sql`now()` }).where(eq(orders.id, o.id)),
  ]);
  await announce([channels.order(o.id), channels.branch(o.branchId)]);
  return { ok: true };
}

/** Staff opened the chat: clears its badge on every board at the branch */
export async function markStaffRead(me: Staff, orderId: string) {
  if (!isOrderId(orderId)) return;
  const [o] = await db.select({ id: orders.id, branchId: orders.branchId }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || !canActOnBranch(me, o.branchId)) return;
  await db.update(orders).set({ staffLastReadAt: sql`now()` }).where(eq(orders.id, o.id));
  await announce([channels.branch(o.branchId)]);
}

export async function markCustomerRead(code: string, token: string) {
  const [o] = await db.select({ id: orders.id, tokenHash: orders.tokenHash }).from(orders).where(eq(orders.code, code.toUpperCase())).limit(1);
  if (!o || !tokenMatches(token, o.tokenHash)) return;
  await db.update(orders).set({ customerLastReadAt: sql`now()` }).where(eq(orders.id, o.id));
}

/**
 * Messages from (customer or staff) newer than the other side's last look, per order, oldest first.
 * The customer is also told about alert lines, like a payment the cafe couldn't find (unreadCount).
 */
async function unreadFrom(sender: "customer" | "staff", orderIds: string[]) {
  if (orderIds.length === 0) return [];
  const lastRead = sender === "customer" ? orders.staffLastReadAt : orders.customerLastReadAt;
  const from =
    sender === "staff"
      ? or(eq(orderMessages.sender, "staff"), and(eq(orderMessages.sender, "system"), inArray(orderMessages.kind, CUSTOMER_ALERT_KINDS as CardKind[])))
      : eq(orderMessages.sender, sender);
  return db
    .select({ orderId: orderMessages.orderId, body: orderMessages.body, kind: orderMessages.kind })
    .from(orderMessages)
    .innerJoin(orders, eq(orders.id, orderMessages.orderId))
    .where(and(inArray(orderMessages.orderId, orderIds), from, sql`${orderMessages.createdAt} > coalesce(${lastRead}, '-infinity'::timestamptz)`))
    .orderBy(asc(orderMessages.createdAt));
}

export type Unread = { count: number; last: string };

/** For the board: how many customer messages each order has that no one at the branch has opened */
export async function staffUnread(orderIds: string[]): Promise<Record<string, Unread>> {
  const out: Record<string, Unread> = {};
  for (const m of await unreadFrom("customer", orderIds)) {
    const u = (out[m.orderId] ??= { count: 0, last: "" });
    u.count += 1;
    u.last = m.body;
  }
  return out;
}

export type Glance =
  | { code: string; found: false }
  | {
      code: string; found: true; status: OrderStatus; fulfillment: Fulfillment; unread: number; chatOpen: boolean; chatClosesAt: string;
      /** Something the customer has to act on, besides a message: the cafe couldn't find their payment */
      alert: "pay_missing" | null;
    };

/**
 * For the "order in progress" bar on the customer's phone: status and new messages for the
 * orders it remembers. Each needs its own token, so a guessed code shows nothing.
 */
export async function glanceOrders(list: { code: string; token: string }[]): Promise<Glance[]> {
  if (list.length === 0) return [];
  const rows = await db
    .select({
      id: orders.id, code: orders.code, tokenHash: orders.tokenHash, status: orders.status, fulfillment: orders.fulfillment,
      createdAt: orders.createdAt, doneAt: orders.doneAt, cancelledAt: orders.cancelledAt,
    })
    .from(orders)
    .where(inArray(orders.code, list.map((l) => l.code.toUpperCase())));
  const mine = list.map((l) => rows.find((r) => r.code === l.code.toUpperCase() && tokenMatches(l.token, r.tokenHash)));
  const unread = await unreadFrom("staff", mine.flatMap((o) => (o ? [o.id] : [])));
  return list.map((l, i) => {
    const o = mine[i];
    if (!o) return { code: l.code, found: false };
    const chat = chatState(o);
    const mineUnread = unread.filter((m) => m.orderId === o.id);
    return {
      code: o.code, found: true, status: o.status, fulfillment: o.fulfillment,
      unread: mineUnread.length, chatOpen: chat.open, chatClosesAt: chat.closesAt.toISOString(),
      alert: o.status === "awaiting_payment" && mineUnread.some((m) => m.kind === "pay_missing") ? "pay_missing" : null,
    };
  });
}
