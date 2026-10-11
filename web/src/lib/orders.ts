import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray } from "drizzle-orm";
import { branches as branchDefs } from "@/data/branches";
import { branches, db, orderItems, orderMessages, orders, paymentAccounts, type Order, type OrderItem, type Staff } from "@/db";
import { checkDelivery, isLatLng, MAX_DELIVERY_FEE, plusCode, type DeliverySettings } from "./delivery";
import { isBranchId, peso, type BranchId } from "./menu";
import { loadMenus } from "./menu-store";
import { canMove, cleanPaymentRef, statusNote, type OrderStatus } from "./order-rules";
import { hashOrderToken, newOrderCode, newOrderToken, tokenMatches } from "./order-token";
import { pickupAllowed } from "./pickup";
import { normalizePhone, priceCart, type CartLine } from "./pricing";
import { announce, channels } from "./realtime";
import { audit, canActOnBranch } from "./staff";

export type BranchOrderSettings = { ordersOpen: boolean; cutoff: number; delivery: DeliverySettings };
export type OrderSettings = Record<BranchId, BranchOrderSettings>;

/** Whether each branch takes online orders right now, when they stop, and its delivery rules */
export async function getOrderSettings(): Promise<OrderSettings> {
  const rows = await db.select().from(branches);
  const of = (id: BranchId): BranchOrderSettings => {
    const r = rows.find((x) => x.id === id);
    return {
      ordersOpen: r?.ordersOpen ?? false,
      cutoff: r?.orderCutoffMinutes ?? 30,
      delivery: {
        open: r?.deliveryOpen ?? false,
        store: r?.lat != null && r?.lng != null ? { lat: r.lat, lng: r.lng } : null,
        freeWithin: r?.freeDeliveryMeters ?? 0,
        maxDistance: r?.maxDeliveryMeters ?? 5000,
        minOrder: r?.deliveryMinOrder ?? 0,
      },
    };
  };
  return { main: of("main"), noir: of("noir") };
}

export type DeliveryInput = { lat: number; lng: number; address: string; landmark: string };
export type PlaceOrderInput = {
  branch: string;
  fulfillment: string;
  wantedAt: string | null;
  lines: CartLine[];
  name: string;
  phone: string;
  notes: string;
  delivery?: DeliveryInput | null;
};
type Fail = { ok: false; error: string };
const fail = (error: string): Fail => ({ ok: false, error });
const STALE = fail("Someone already updated this order. The board now shows the latest.");
const oneLine = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");

/** Limits that stop pranks and accidental double-taps without bothering real customers */
const PER_IP_PER_HOUR = 5;
const PER_PHONE_PER_HOUR = 3;

export async function placeOrder(input: PlaceOrderInput, ip: string): Promise<{ ok: true; code: string; token: string } | Fail> {
  if (!isBranchId(input?.branch)) return { ok: false, error: "Choose a branch." };
  const branch = branchDefs.find((b) => b.id === input.branch)!;
  const settings = (await getOrderSettings())[input.branch];
  if (!settings.ordersOpen) return { ok: false, error: `${branch.name} isn't taking online orders right now. Please call or drop by.` };
  if (input.fulfillment !== "pickup" && input.fulfillment !== "delivery") return fail("Choose pickup or delivery.");
  const fulfillment = input.fulfillment;

  // Delivery uses the same times as pickup: as soon as possible, later today, or from opening
  const now = new Date();
  const wanted = input.wantedAt ? new Date(input.wantedAt) : null;
  if (wanted && Number.isNaN(wanted.getTime())) return fail(`Choose a ${fulfillment} time.`);
  if (!pickupAllowed(branch, now, settings.cutoff, wanted)) return fail(`That ${fulfillment} time isn't available any more. Please choose another.`);

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

  // Delivery: the pin decides distance and free delivery here, never the browser's numbers
  let delivery: Partial<Order> = {};
  if (fulfillment === "delivery") {
    const d = input.delivery;
    const pin = d && isLatLng(d) ? { lat: d.lat, lng: d.lng } : null;
    const check = checkDelivery(settings.delivery, pin, priced.subtotal);
    if (!check.ok) return fail(check.error);
    const address = oneLine(d!.address);
    const landmark = oneLine(d!.landmark) || null;
    if (address.length < 5 || address.length > 200) return fail("Enter the delivery address: house or unit number, street and barangay.");
    if (landmark && landmark.length > 200) return fail("Keep the landmark under 200 characters.");
    delivery = { address, landmark, lat: pin!.lat, lng: pin!.lng, plusCode: plusCode(pin!), distanceMeters: check.distance, paymentMethod: "transfer" };
  }

  const id = randomUUID();
  const token = newOrderToken();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newOrderCode();
    try {
      await db.batch([
        db.insert(orders).values({
          id, code, branchId: input.branch, tokenHash: hashOrderToken(token), fulfillment, wantedAt: wanted,
          customerName: name, customerPhone: phone, notes, subtotal: priced.subtotal, total: priced.subtotal, createdIp: ip,
          ...delivery,
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

/** Order ids come from URLs; anything that isn't a UUID would only make the database complain */
export const isOrderId = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** One order for the staff detail page; null if it doesn't exist or belongs to the other branch */
export async function getStaffOrder(me: Staff, orderId: string): Promise<FullOrder | null> {
  if (!isOrderId(orderId)) return null;
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || !canActOnBranch(me, o.branchId)) return null;
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

/** An order this staff member may act on */
async function staffOrder(me: Staff, orderId: string): Promise<{ ok: true; order: Order } | Fail> {
  if (!isOrderId(orderId)) return fail("That order no longer exists.");
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o) return fail("That order no longer exists.");
  if (!canActOnBranch(me, o.branchId)) return fail("That order belongs to the other branch.");
  return { ok: true, order: o };
}

/** Writes a system line in the order's chat, and tells both screens to refresh */
async function noteAndAnnounce(o: Order, body: string | null) {
  if (body) await db.insert(orderMessages).values({ orderId: o.id, sender: "system", body });
  await announce([channels.branch(o.branchId), channels.order(o.id)]);
}

/** Staff move an order one step. Refuses if someone else moved it first. */
export async function moveOrder(me: Staff, orderId: string, from: OrderStatus, to: OrderStatus, reason?: string): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.status !== from) return STALE;
  // Delivery's money steps carry a fee, a payment check or a rider; they have their own actions
  if (to === "awaiting_payment" || to === "out_for_delivery") return fail("That step isn't possible for this order.");
  if (!canMove(o.fulfillment, from, to, o.paymentStatus)) return fail("That step isn't possible for this order.");
  const why = reason?.trim();
  if (to === "cancelled" && (!why || why.length > 120)) return { ok: false, error: "Give a short reason for cancelling, so the customer knows why." };

  const now = new Date();
  const changes: Partial<Order> = { status: to, updatedAt: now };
  const stamp = STAMP[to];
  if (stamp) Object.assign(changes, { [stamp]: now });
  if (to === "accepted") changes.acceptedBy = me.id;
  if (to === "cancelled") changes.cancelReason = why!;

  const done = await db.update(orders).set(changes).where(and(eq(orders.id, o.id), eq(orders.status, from))).returning({ id: orders.id });
  if (done.length === 0) return STALE;
  let note = statusNote(to, o.fulfillment, why) ?? "";
  // A cancelled delivery may already be paid: say so, so the refund isn't forgotten
  if (to === "cancelled" && o.paymentStatus === "verified") note += ` Your payment of ${peso(o.total)} will be refunded.`;
  if (to === "cancelled" && o.paymentStatus === "submitted") note += ` If you already paid, the cafe will refund ${peso(o.total)}.`;
  if (to === "cancelled") await audit(me.id, "order.cancel", { orderId: o.id, code: o.code, reason: why, payment: o.paymentStatus });
  await noteAndAnnounce(o, note || null);
  return { ok: true };
}

/**
 * Delivery, step 1: staff check the pin and the items, then confirm the order with its fee.
 * ₱0 is suggested inside the free radius, but the rider may still charge, so staff decide.
 * Until the customer sends a payment, staff can change the fee.
 */
export async function quoteDelivery(me: Staff, orderId: string, feeInput: unknown): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.fulfillment !== "delivery") return fail("Only delivery orders have a delivery fee.");
  const requote = o.status === "awaiting_payment";
  if (requote && o.paymentStatus !== "unpaid") return fail("The customer already sent a payment, so the fee can't change now.");
  if (!requote && !canMove(o.fulfillment, o.status, "awaiting_payment")) return STALE;
  const fee = Number(feeInput);
  if (String(feeInput ?? "").trim() === "" || !Number.isInteger(fee) || fee < 0 || fee > MAX_DELIVERY_FEE) {
    return fail(`Enter the delivery fee in whole pesos, from ₱0 to ${peso(MAX_DELIVERY_FEE)}.`);
  }

  const total = o.subtotal + fee;
  const now = new Date();
  const done = await db
    .update(orders)
    .set({ status: "awaiting_payment", deliveryFee: fee, total, quotedAt: now, updatedAt: now })
    .where(and(eq(orders.id, o.id), eq(orders.status, o.status), eq(orders.paymentStatus, "unpaid")))
    .returning({ id: orders.id });
  if (done.length === 0) return STALE;
  await audit(me.id, "order.quote", { orderId: o.id, code: o.code, fee, total });
  const feeWords = fee === 0 ? "free" : peso(fee);
  await noteAndAnnounce(
    o,
    requote
      ? `The cafe changed the delivery fee to ${feeWords}. Total to pay: ${peso(total)}.`
      : `The cafe confirmed the order. Delivery: ${feeWords}. Total to pay: ${peso(total)}.`,
  );
  return { ok: true };
}

/** Delivery, step 2: the customer paid by QR or to the number, and types the receipt's reference */
export async function submitPayment(code: string, token: string, accountId: unknown, refInput: unknown): Promise<{ ok: true } | Fail> {
  const o = await getCustomerOrder(code, token);
  if (!o) return fail("We couldn't find that order.");
  if (o.status !== "awaiting_payment") return fail(o.status === "pending" ? "Wait for the cafe to confirm the delivery fee first." : "This order doesn't need a payment now.");
  if (o.paymentStatus !== "unpaid") return fail(o.paymentStatus === "submitted" ? "You've already sent your payment. The cafe is checking it." : "This order is already paid.");
  const ref = cleanPaymentRef(refInput);
  if (!ref) return fail("Type the reference number from your payment receipt. It's mostly numbers, like 1234 567 890123.");
  const id = String(accountId ?? "");
  const [account] = isOrderId(id)
    ? await db.select().from(paymentAccounts).where(and(eq(paymentAccounts.id, id), eq(paymentAccounts.branchId, o.branchId), eq(paymentAccounts.active, true))).limit(1)
    : [];
  if (!account) return fail("Choose the account you paid to.");

  const now = new Date();
  const done = await db
    .update(orders)
    .set({ paymentStatus: "submitted", gcashRef: ref, paymentAccountId: account.id, paymentSubmittedAt: now, updatedAt: now })
    .where(and(eq(orders.id, o.id), eq(orders.status, "awaiting_payment"), eq(orders.paymentStatus, "unpaid")))
    .returning({ id: orders.id });
  if (done.length === 0) return fail("Your order changed in the meantime. Check the page and try again.");
  await noteAndAnnounce(o, `The customer sent payment reference ${ref} (paid to ${account.label}). The cafe is checking it.`);
  return { ok: true };
}

/**
 * Delivery, step 3: staff look for the payment in the cafe's GCash or bank app. Found: the order
 * is paid and accepted in one tap. Not found: the customer is asked to check and send it again.
 */
export async function reviewPayment(me: Staff, orderId: string, received: boolean): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.status !== "awaiting_payment" || o.paymentStatus !== "submitted") return STALE;
  const now = new Date();
  const where = and(eq(orders.id, o.id), eq(orders.status, "awaiting_payment"), eq(orders.paymentStatus, "submitted"));
  const done = received
    ? await db
        .update(orders)
        .set({ status: "accepted", paymentStatus: "verified", paymentVerifiedAt: now, paymentVerifiedBy: me.id, acceptedAt: now, acceptedBy: me.id, updatedAt: now })
        .where(where)
        .returning({ id: orders.id })
    : await db
        .update(orders)
        .set({ paymentStatus: "unpaid", gcashRef: null, paymentAccountId: null, paymentSubmittedAt: null, updatedAt: now })
        .where(where)
        .returning({ id: orders.id });
  if (done.length === 0) return STALE;
  await audit(me.id, received ? "order.payment-ok" : "order.payment-not-found", { orderId: o.id, code: o.code, ref: o.gcashRef, total: o.total });
  await noteAndAnnounce(
    o,
    received
      ? "Payment received. The cafe accepted the order."
      : "The cafe couldn't find this payment yet. Check the reference number and send it again, or message the cafe here.",
  );
  return { ok: true };
}

/** Delivery, step 4: the order leaves with a Lalamove rider (and its tracking link) or with our staff */
export async function sendOut(me: Staff, orderId: string, providerInput: unknown, trackingInput: unknown): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.fulfillment !== "delivery" || o.status !== "ready") return STALE;
  const provider = providerInput === "lalamove" || providerInput === "own_rider" ? providerInput : null;
  if (!provider) return fail("Choose who's delivering it.");
  const link = String(trackingInput ?? "").trim() || null;
  if (link) {
    let ok = false;
    try {
      ok = new URL(link).protocol === "https:" && link.length <= 500;
    } catch {}
    if (!ok) return fail("Paste the whole tracking link from Lalamove (it starts with https://), or leave it empty.");
  }
  const now = new Date();
  const done = await db
    .update(orders)
    .set({ status: "out_for_delivery", outAt: now, deliveryProvider: provider, trackingUrl: provider === "lalamove" ? link : null, updatedAt: now })
    .where(and(eq(orders.id, o.id), eq(orders.status, "ready")))
    .returning({ id: orders.id });
  if (done.length === 0) return STALE;
  await noteAndAnnounce(
    o,
    provider === "own_rider"
      ? "The order is on its way with our staff."
      : `The order is on its way with Lalamove.${link ? " Follow the rider with the tracking link on this page." : ""}`,
  );
  return { ok: true };
}

/** Reference numbers that also appear on another order: a reused receipt deserves a second look */
export async function paymentRefClashes(list: Order[]): Promise<Record<string, string[]>> {
  const refs = [...new Set(list.flatMap((o) => (o.gcashRef ? [o.gcashRef] : [])))];
  if (refs.length === 0) return {};
  const rows = await db.select({ id: orders.id, code: orders.code, ref: orders.gcashRef }).from(orders).where(inArray(orders.gcashRef, refs));
  const out: Record<string, string[]> = {};
  for (const o of list) {
    const others = rows.filter((r) => r.ref === o.gcashRef && r.id !== o.id).map((r) => r.code);
    if (o.gcashRef && others.length) out[o.id] = others;
  }
  return out;
}

/** The customer can take back an order nobody has accepted yet, or a delivery they haven't paid for */
export async function cancelByCustomer(code: string, token: string): Promise<{ ok: true } | Fail> {
  const o = await getCustomerOrder(code, token);
  if (!o) return { ok: false, error: "We couldn't find that order." };
  const accepted = fail("The cafe has already accepted your order, so please call them to change it.");
  if (o.paymentStatus !== "unpaid") return fail("You've sent a payment for this order, so please message the cafe here to cancel it.");
  if (o.status !== "pending" && o.status !== "awaiting_payment") return accepted;
  const now = new Date();
  const done = await db
    .update(orders)
    .set({ status: "cancelled", cancelledAt: now, updatedAt: now, cancelReason: "Cancelled by the customer" })
    .where(and(eq(orders.id, o.id), eq(orders.status, o.status), eq(orders.paymentStatus, "unpaid")))
    .returning({ id: orders.id });
  if (done.length === 0) return accepted;
  await db.insert(orderMessages).values({ orderId: o.id, sender: "system", body: "The customer cancelled the order." });
  await announce([channels.branch(o.branchId), channels.order(o.id)]);
  return { ok: true };
}

/**
 * The customer lost their link, or it reached someone it shouldn't have: staff make a new one.
 * The old link stops working at once. The new one is shown to staff once, to text to the customer.
 */
export async function reissueOrderLink(me: Staff, orderId: string): Promise<{ ok: true; path: string } | Fail> {
  const o = await getStaffOrder(me, orderId);
  if (!o) return { ok: false, error: "That order isn't on your branch's board." };
  const token = newOrderToken();
  await db.batch([
    db.update(orders).set({ tokenHash: hashOrderToken(token), updatedAt: new Date() }).where(eq(orders.id, o.id)),
    db.insert(orderMessages).values({ orderId: o.id, sender: "system", body: "The cafe made a new link to this order. Older links no longer work." }),
  ]);
  await audit(me.id, "order.relink", { orderId: o.id, code: o.code });
  // The old link's page refreshes and finds it no longer opens
  await announce([channels.order(o.id)]);
  return { ok: true, path: `/order/${o.code}?t=${encodeURIComponent(token)}` };
}
