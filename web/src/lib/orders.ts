import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { after } from "next/server";
import { branches as branchDefs } from "@/data/branches";
import { blockedPhones, branches, db, orderItems, orderMessages, orders, paymentAccounts, staff, timeEntries, type Order, type OrderItem, type Staff } from "@/db";
import { cashNote, readTendered } from "./cash";
import { checkDelivery, deliveryFee, isLatLng, MAX_DELIVERY_FEE, plusCode, type DeliverySettings } from "./delivery";
import { orderEmailFrom } from "./email";
import { looksLikeEmail } from "./email-rules";
import type { Schedule } from "./hours";
import { loadSchedules } from "./hours-store";
import { isBranchId, peso, type BranchId } from "./menu";
import { loadMenus } from "./menu-store";
import { NOT_FOUND_REASONS, type Card } from "./chat-cards";
import { canMove, cleanPaymentRef, COULDNT_DELIVER_REASONS, statusNote, type OrderStatus } from "./order-rules";
import { hashOrderToken, newOrderCode, newOrderToken, tokenMatches } from "./order-token";
import { pickupAllowed } from "./pickup";
import { emailOrderLink } from "./order-email";
import { normalizePhone, priceCart, type CartLine } from "./pricing";
import { notifyBranch, notifyStaff } from "./push";
import { assignedPayload, newOrderPayload, paymentPayload } from "./push-rules";
import { clearSpotIfIdle } from "./rider-location";
import { announce, channels } from "./realtime";
import { canDeliver, canSeeOrder, isManager } from "./roles";
import { audit } from "./staff";

export type BranchOrderSettings = { ordersOpen: boolean; cutoff: number; schedule: Schedule; delivery: DeliverySettings };
export type OrderSettings = Record<BranchId, BranchOrderSettings>;

/** Whether each branch takes online orders right now, its hours and when orders stop, and its delivery rules */
export async function getOrderSettings(): Promise<OrderSettings> {
  const [rows, schedules] = await Promise.all([db.select().from(branches), loadSchedules()]);
  const of = (id: BranchId): BranchOrderSettings => {
    const r = rows.find((x) => x.id === id);
    return {
      ordersOpen: r?.ordersOpen ?? false,
      cutoff: r?.orderCutoffMinutes ?? 30,
      schedule: schedules[id],
      delivery: {
        open: r?.deliveryOpen ?? false,
        store: r?.lat != null && r?.lng != null ? { lat: r.lat, lng: r.lng } : null,
        freeWithin: r?.freeDeliveryMeters ?? 0,
        maxDistance: r?.maxDeliveryMeters ?? 5000,
        minOrder: r?.deliveryMinOrder ?? 0,
        baseFee: r?.deliveryBaseFee ?? 49,
        baseMeters: r?.deliveryBaseMeters ?? 2000,
        perKm: r?.deliveryPerKm ?? 8,
        cash: r?.cashOnDelivery ?? false,
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
  /** Optional, and only offered once order email is set up: the order's link is emailed once */
  email?: string;
  notes: string;
  delivery?: DeliveryInput | null;
  /** Delivery only: "online" (GCash, Maya or bank, in the chat) or "cash" to the rider */
  pay?: string;
  /** Cash only: "exact", or the bill they'll pay with */
  tendered?: unknown;
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
  if (!pickupAllowed(settings.schedule, now, settings.cutoff, wanted)) return fail(`That ${fulfillment} time isn't available any more. Please choose another.`);

  const name = String(input.name ?? "").trim().replace(/\s+/g, " ");
  const phone = normalizePhone(String(input.phone ?? ""));
  const notes = String(input.notes ?? "").trim() || null;
  if (name.length < 2 || name.length > 60) return { ok: false, error: "Enter your name, so we know whose order it is." };
  if (!phone) return { ok: false, error: "Enter a mobile number like 0917 123 4567, so we can reach you about your order." };
  if (notes && notes.length > 300) return { ok: false, error: "Keep the notes under 300 characters." };
  const email = orderEmailFrom ? String(input.email ?? "").trim().toLowerCase() || null : null;
  if (email && !looksLikeEmail(email)) return fail("Check your email address, or leave it empty.");

  const hourAgo = new Date(now.getTime() - 3_600_000);
  const [[byIp], [byPhone], [blocked]] = await Promise.all([
    db.select({ n: count() }).from(orders).where(and(eq(orders.createdIp, ip), gte(orders.createdAt, hourAgo))),
    db.select({ n: count() }).from(orders).where(and(eq(orders.customerPhone, phone), gte(orders.createdAt, hourAgo))),
    // Managers block numbers after pranks or repeated no-shows (lib/blocklist.ts)
    db.select({ phone: blockedPhones.phone }).from(blockedPhones).where(eq(blockedPhones.phone, phone)).limit(1),
  ]);
  if (blocked) return fail("We can't take online orders from this number. Please call or visit the branch.");
  if (byIp.n >= PER_IP_PER_HOUR || byPhone.n >= PER_PHONE_PER_HOUR) {
    return { ok: false, error: "You've placed several orders in the last hour. To add more, please call the branch." };
  }

  const priced = priceCart((await loadMenus())[input.branch], input.lines);
  if (!priced.ok) return priced;

  // Delivery: the pin decides the distance and the fee here, never the browser's numbers
  let delivery: Partial<Order> = {};
  let total = priced.subtotal;
  if (fulfillment === "delivery") {
    const d = input.delivery;
    const pin = d && isLatLng(d) ? { lat: d.lat, lng: d.lng } : null;
    const check = checkDelivery(settings.delivery, pin, priced.subtotal);
    if (!check.ok) return fail(check.error);
    const address = oneLine(d!.address);
    const landmark = oneLine(d!.landmark) || null;
    if (address.length < 5 || address.length > 200) return fail("Enter the delivery address: house or unit number, street and barangay.");
    if (landmark && landmark.length > 200) return fail("Keep the landmark under 200 characters.");
    total = priced.subtotal + check.fee;
    let paying: Partial<Order> = { paymentMethod: "transfer" };
    if (input.pay === "cash") {
      if (!settings.delivery.cash) return fail(`${branch.name} isn't taking cash on delivery right now. Choose GCash, Maya or bank.`);
      const tendered = readTendered(input.tendered, total);
      if (!tendered.ok) return fail(tendered.error);
      paying = { paymentMethod: "cash", cashTendered: tendered.amount };
    } else if (input.pay !== "online") return fail("Choose how you'll pay.");
    delivery = { address, landmark, lat: pin!.lat, lng: pin!.lng, plusCode: plusCode(pin!), distanceMeters: check.distance, deliveryFee: check.fee, ...paying };
  }

  const id = randomUUID();
  const token = newOrderToken();
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newOrderCode();
    try {
      await db.batch([
        db.insert(orders).values({
          id, code, branchId: input.branch, tokenHash: hashOrderToken(token), fulfillment, wantedAt: wanted,
          customerName: name, customerPhone: phone, customerEmail: email, notes, subtotal: priced.subtotal, total, createdIp: ip,
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
      notifyBranch(input.branch, "order", newOrderPayload({
        id, code, branchId: input.branch, fulfillment, wantedAt: wanted, total,
        items: priced.lines.reduce((n, l) => n + l.qty, 0), distanceMeters: delivery.distanceMeters ?? null,
      }));
      // After the reply, so the customer never waits on it, and a failed email can't fail the order
      if (email) after(() => emailOrderLink({ id, code, branchId: input.branch, token, email, name, fulfillment }).catch(() => {}));
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

export async function withItems(list: Order[]): Promise<FullOrder[]> {
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

/** One order for the staff detail page; null if it doesn't exist or isn't theirs to see (another branch, another rider's) */
export async function getStaffOrder(me: Staff, orderId: string): Promise<FullOrder | null> {
  if (!isOrderId(orderId)) return null;
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!o || !canSeeOrder(me, o)) return null;
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
  if (!canSeeOrder(me, o)) return fail(me.role === "rider" ? "That delivery isn't yours." : "That order belongs to the other branch.");
  return { ok: true, order: o };
}

/** A chat line's kind and details, from its card */
const cardRow = (card?: Card) => (card ? { kind: card.kind, meta: Object.fromEntries(Object.entries(card).filter(([k]) => k !== "kind")) } : {});

/**
 * Writes a system line in the order's chat (as a card, when there is one), and tells both screens
 * to refresh. The text is what staff read, and what a page without the card shows.
 */
async function noteAndAnnounce(o: Order, body: string | null, card?: Card) {
  if (body) await db.insert(orderMessages).values({ orderId: o.id, sender: "system", body, ...cardRow(card) });
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
  if (o.fulfillment === "delivery" && from === "pending" && to === "accepted") return fail("Accept a delivery with its fee.");
  if (!canMove(o.fulfillment, from, to, o.paymentStatus, o.paymentMethod)) return fail("That step isn't possible for this order.");
  const why = reason?.trim();
  if (to === "cancelled" && (!why || why.length > 120)) return { ok: false, error: "Give a short reason for cancelling, so the customer knows why." };
  // "Couldn't deliver": a manager's call, with a reason from the list
  if (from === "out_for_delivery" && to === "cancelled") {
    if (!isManager(me)) return fail("Ask a manager: only they can call off a delivery that's out.");
    if (!COULDNT_DELIVER_REASONS.some((r) => r === why)) return fail("Choose why it couldn't be delivered.");
  }

  const now = new Date();
  const changes: Partial<Order> = { status: to, updatedAt: now };
  const stamp = STAMP[to];
  if (stamp) Object.assign(changes, { [stamp]: now });
  if (to === "accepted") changes.acceptedBy = me.id;
  if (to === "cancelled") changes.cancelReason = why!;
  // Staff marking a cash delivery delivered (the rider's phone died, say): the cash came in with it
  if (to === "done" && o.paymentMethod === "cash") Object.assign(changes, { paymentStatus: "verified", paymentVerifiedAt: now, paymentVerifiedBy: me.id });

  const done = await db.update(orders).set(changes).where(and(eq(orders.id, o.id), eq(orders.status, from))).returning({ id: orders.id });
  if (done.length === 0) return STALE;
  let note = statusNote(to, o.fulfillment, why, from) ?? "";
  // A cancelled delivery may already be paid: say so, so the refund isn't forgotten
  if (to === "cancelled" && o.paymentStatus === "verified") note += ` Your payment of ${peso(o.total)} will be refunded.`;
  if (to === "cancelled" && o.paymentStatus === "submitted") note += ` If you already paid, the cafe will refund ${peso(o.total)}.`;
  if (to === "cancelled") await audit(me.id, "order.cancel", { orderId: o.id, code: o.code, reason: why, payment: o.paymentStatus });
  // Delivered or called off from the counter: the rider's position stops being shown
  if (from === "out_for_delivery") await clearSpotIfIdle(o.riderId);
  await noteAndAnnounce(o, note || null, { kind: "step", status: to });
  return { ok: true };
}

/**
 * Delivery paid online, step 1: staff accept the order with its fee (worked out from the distance,
 * or one they give), and the customer is asked to pay. Until they send a payment, the fee can change.
 */
export async function quoteDelivery(me: Staff, orderId: string, feeInput: unknown): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.fulfillment !== "delivery") return fail("Only delivery orders have a delivery fee.");
  const requote = o.status === "awaiting_payment";
  if (requote && o.paymentStatus !== "unpaid") return fail("The customer already sent a payment, so the fee can't change now.");
  if (!requote && !canMove(o.fulfillment, o.status, "awaiting_payment", o.paymentStatus, o.paymentMethod)) return STALE;
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
    { kind: "quote", fee, total, requote },
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
  await noteAndAnnounce(o, `The customer sent payment reference ${ref} (paid to ${account.label}). The cafe is checking it.`, {
    kind: "pay_sent", ref, account: account.label, amount: o.total,
  });
  notifyBranch(o.branchId, "payment", paymentPayload(o, account.label));
  return { ok: true };
}

/**
 * Delivery, step 3: staff look for the payment in the cafe's GCash or bank app. Found: the order
 * is paid and accepted in one tap. Not found: the customer is asked to check and send it again,
 * with the reason staff picked, on a card that stands out on their page.
 */
export async function reviewPayment(me: Staff, orderId: string, received: boolean, reasonInput?: unknown): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.status !== "awaiting_payment" || o.paymentStatus !== "submitted") return STALE;
  const reason = NOT_FOUND_REASONS.find((r) => r === reasonInput) ?? null;
  if (!received && reasonInput !== undefined && !reason) return fail("Choose why the payment wasn't found.");
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
  // Keep the key "ref": the yearly clean-up removes it from these entries (lib/retention.ts)
  await audit(me.id, received ? "order.payment-ok" : "order.payment-not-found", { orderId: o.id, code: o.code, ref: o.gcashRef, total: o.total, ...(reason ? { reason } : {}) });
  await noteAndAnnounce(
    o,
    received
      ? "Payment received. The cafe accepted the order."
      : `The cafe couldn't find this payment${reason ? ` (${reason.toLowerCase()})` : " yet"}. Check the reference number and send it again, or message the cafe here.`,
    received ? { kind: "pay_ok", amount: o.total } : { kind: "pay_missing", amount: o.total, ref: o.gcashRef, reason },
  );
  return { ok: true };
}

/**
 * Delivery, step 4: the order leaves with our rider (chosen first), or, as a backup when our riders
 * are busy, with Lalamove and its tracking link. Lalamove can't collect cash for us.
 */
export async function sendOut(me: Staff, orderId: string, providerInput: unknown, trackingInput: unknown): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.fulfillment !== "delivery" || o.status !== "ready") return STALE;
  const provider = providerInput === "lalamove" || providerInput === "own_rider" ? providerInput : null;
  if (!provider) return fail("Choose who's delivering it.");
  if (provider === "own_rider" && !o.riderId) return fail("Choose who's taking it first.");
  if (provider === "lalamove" && o.paymentMethod === "cash") return fail("This order is paid in cash to our rider, so it can't go with Lalamove. Choose one of our riders.");
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
      ? `The order is on its way with our rider.${o.paymentMethod === "cash" ? ` ${cashNote(o.total, o.cashTendered)}` : ""}`
      : `The order is on its way with Lalamove.${link ? " Follow the rider with the tracking link on this page." : ""}`,
    { kind: "step", status: "out_for_delivery", provider },
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
  await db.insert(orderMessages).values({ orderId: o.id, sender: "system", body: "The customer cancelled the order.", ...cardRow({ kind: "step", status: "cancelled", byCustomer: true }) });
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

// ——— Our own riders ———

const feeError = () => fail(`Enter the delivery fee in whole pesos, from ₱0 to ${peso(MAX_DELIVERY_FEE)}.`);
const readFee = (input: unknown) => {
  const fee = Number(input);
  return String(input ?? "").trim() !== "" && Number.isInteger(fee) && fee >= 0 && fee <= MAX_DELIVERY_FEE ? fee : null;
};

/**
 * Accept a delivery in one tap. The fee was worked out from the distance at checkout (an order from
 * before then gets it worked out now); staff may give a different one. Paying online, the customer
 * is then asked to pay; paying cash, it's accepted and goes to the kitchen.
 */
export async function acceptDelivery(me: Staff, orderId: string, feeInput?: unknown): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.fulfillment !== "delivery" || o.status !== "pending") return STALE;
  let fee = feeInput === undefined || feeInput === null || feeInput === "" ? o.deliveryFee : readFee(feeInput);
  if (fee === null && (feeInput === undefined || feeInput === null || feeInput === "") && o.distanceMeters != null) {
    fee = deliveryFee((await getOrderSettings())[o.branchId as BranchId].delivery, o.distanceMeters);
  }
  if (fee === null) return feeError();
  if (o.paymentMethod !== "cash") return quoteDelivery(me, o.id, fee);

  const total = o.subtotal + fee;
  const now = new Date();
  const done = await db
    .update(orders)
    .set({ status: "accepted", deliveryFee: fee, total, quotedAt: now, acceptedAt: now, acceptedBy: me.id, updatedAt: now })
    .where(and(eq(orders.id, o.id), eq(orders.status, "pending")))
    .returning({ id: orders.id });
  if (done.length === 0) return STALE;
  await audit(me.id, "order.accept-cash", { orderId: o.id, code: o.code, fee, total });
  await noteAndAnnounce(o, `The cafe accepted the order. Delivery: ${fee === 0 ? "free" : peso(fee)}. ${cashNote(total, o.cashTendered)}`, { kind: "step", status: "accepted" });
  return { ok: true };
}

/**
 * A different fee after accepting: paying online, until they've sent the payment; paying cash, until
 * the order leaves (the rider collects the new total).
 */
export async function changeDeliveryFee(me: Staff, orderId: string, feeInput: unknown): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.paymentMethod !== "cash") return quoteDelivery(me, orderId, feeInput);
  if (!["accepted", "preparing", "ready"].includes(o.status)) return fail("The fee can't change once the order has left.");
  const fee = readFee(feeInput);
  if (fee === null) return feeError();
  const total = o.subtotal + fee;
  const done = await db
    .update(orders)
    .set({ deliveryFee: fee, total, updatedAt: new Date() })
    .where(and(eq(orders.id, o.id), eq(orders.status, o.status)))
    .returning({ id: orders.id });
  if (done.length === 0) return STALE;
  await audit(me.id, "order.quote", { orderId: o.id, code: o.code, fee, total });
  await noteAndAnnounce(o, `The cafe changed the delivery fee to ${fee === 0 ? "free" : peso(fee)}. ${cashNote(total, o.cashTendered)}`, { kind: "quote", fee, total, requote: true });
  return { ok: true };
}

const onShift = async (staffId: string) =>
  (await db.select({ id: timeEntries.id }).from(timeEntries).where(and(eq(timeEntries.staffId, staffId), isNull(timeEntries.clockOut))).limit(1)).length > 0;

/**
 * Who takes the delivery: a rider, or counter staff on shift at that branch. It can change until the
 * order leaves. The person gets a notification with the distance and what to collect.
 */
export async function assignRider(me: Staff, orderId: string, riderInput: unknown): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.fulfillment !== "delivery" || !["accepted", "preparing", "ready"].includes(o.status)) {
    return fail("Choose who's taking it once the order is accepted, until it leaves.");
  }
  const riderId = String(riderInput ?? "");
  if (!riderId) {
    await db.update(orders).set({ riderId: null, assignedAt: null, updatedAt: new Date() }).where(eq(orders.id, o.id));
    await announce([channels.branch(o.branchId)]);
    return { ok: true };
  }
  const [person] = isOrderId(riderId) ? await db.select().from(staff).where(eq(staff.id, riderId)).limit(1) : [];
  if (!person || !canDeliver(person, o.branchId, await onShift(person.id))) {
    return fail("They can't take it: choose a rider, or someone clocked in at this branch.");
  }
  const now = new Date();
  const done = await db
    .update(orders)
    .set({ riderId: person.id, assignedAt: now, updatedAt: now })
    .where(and(eq(orders.id, o.id), eq(orders.status, o.status)))
    .returning({ id: orders.id });
  if (done.length === 0) return STALE;
  await audit(me.id, "order.assign", { orderId: o.id, code: o.code, riderId: person.id });
  await announce([channels.branch(o.branchId), channels.order(o.id)]);
  if (person.id !== o.riderId) notifyStaff(person.id, assignedPayload(o));
  return { ok: true };
}

/**
 * The rider's two taps: "On my way" when they leave with it (it must be ready), and "Delivered" at
 * the door. A cash order is only delivered once they confirm they got the cash, which also marks
 * it paid (by them).
 */
export async function riderStep(me: Staff, orderId: string, step: unknown, cashCollected?: unknown): Promise<{ ok: true } | Fail> {
  const found = await staffOrder(me, orderId);
  if (!found.ok) return found;
  const o = found.order;
  if (o.riderId !== me.id) return fail("That delivery isn't yours.");
  const now = new Date();
  if (step === "out") {
    if (o.status !== "ready") return fail(o.status === "out_for_delivery" ? "It's already on its way." : "Wait until the cafe marks it ready.");
    const done = await db
      .update(orders)
      .set({ status: "out_for_delivery", outAt: now, deliveryProvider: "own_rider", trackingUrl: null, updatedAt: now })
      .where(and(eq(orders.id, o.id), eq(orders.status, "ready")))
      .returning({ id: orders.id });
    if (done.length === 0) return STALE;
    await noteAndAnnounce(o, `The order is on its way with our rider.${o.paymentMethod === "cash" ? ` ${cashNote(o.total, o.cashTendered)}` : ""}`, {
      kind: "step", status: "out_for_delivery", provider: "own_rider",
    });
    return { ok: true };
  }
  if (step === "delivered") {
    if (o.status !== "out_for_delivery") return fail("Tap “On my way” when you leave with it first.");
    const cash = o.paymentMethod === "cash";
    if (cash && cashCollected !== true) return fail(`Confirm you got ${peso(o.total)} in cash first.`);
    const done = await db
      .update(orders)
      .set({
        status: "done", doneAt: now, updatedAt: now,
        ...(cash ? { paymentStatus: "verified" as const, paymentVerifiedAt: now, paymentVerifiedBy: me.id } : {}),
      })
      .where(and(eq(orders.id, o.id), eq(orders.status, "out_for_delivery")))
      .returning({ id: orders.id });
    if (done.length === 0) return STALE;
    await audit(me.id, "order.delivered", { orderId: o.id, code: o.code, ...(cash ? { cash: o.total } : {}) });
    await clearSpotIfIdle(me.id);
    await noteAndAnnounce(o, statusNote("done", "delivery"), { kind: "step", status: "done" });
    return { ok: true };
  }
  return fail("That step isn't possible for this order.");
}
