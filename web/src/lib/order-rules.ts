/**
 * Online order lifecycle and the per-order chat rules. Pure functions: the server enforces them,
 * the screens use them to decide which buttons to show, and the tests pin them down.
 *
 * Pickup:   pending → accepted → preparing → ready → done
 * Delivery: pending → awaiting_payment → accepted → preparing → ready → out_for_delivery → done
 * Either can be cancelled until preparing starts.
 */
export const ORDER_STATUSES = [
  "pending",
  "awaiting_payment",
  "accepted",
  "preparing",
  "ready",
  "out_for_delivery",
  "done",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type Fulfillment = "pickup" | "delivery";
export type PaymentStatus = "unpaid" | "submitted" | "verified" | "refunded";

/** The chat stays open this long after the order is done, for "missing item" messages */
export const CHAT_GRACE_MINUTES = 30;
/** An order nobody finished after this long counts as closed (forgotten on the board) */
export const STALE_HOURS = 12;

const FLOW: Record<Fulfillment, Partial<Record<OrderStatus, OrderStatus[]>>> = {
  pickup: {
    pending: ["accepted", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["ready"],
    ready: ["done"],
  },
  delivery: {
    // The fee is quoted first; the customer pays order + fee by GCash before anything is made
    pending: ["awaiting_payment", "cancelled"],
    awaiting_payment: ["accepted", "cancelled"],
    accepted: ["preparing", "cancelled"],
    preparing: ["ready"],
    ready: ["out_for_delivery"],
    out_for_delivery: ["done"],
  },
};

/** The statuses staff can move this order to next */
export function nextStatuses(fulfillment: Fulfillment, from: OrderStatus): OrderStatus[] {
  return FLOW[fulfillment][from] ?? [];
}

/** Can the order move from → to? A delivery order is only accepted once its GCash payment is verified. */
export function canMove(fulfillment: Fulfillment, from: OrderStatus, to: OrderStatus, payment: PaymentStatus = "unpaid") {
  if (!nextStatuses(fulfillment, from).includes(to)) return false;
  if (fulfillment === "delivery" && to === "accepted") return payment === "verified";
  return true;
}

export type ChatClock = { status: OrderStatus; createdAt: Date; doneAt: Date | null; cancelledAt: Date | null };
export type ChatState = { open: boolean; closesAt: Date; reason: "active" | "done" | "cancelled" | "stale" };

/**
 * Whether the order's chat takes messages. Nothing closes it in the background: the rule is
 * worked out from the order's times whenever someone reads or writes, so it can't be missed.
 */
export function chatState(o: ChatClock, now: Date = new Date()): ChatState {
  if (o.status === "cancelled") return { open: false, closesAt: o.cancelledAt ?? now, reason: "cancelled" };
  if (o.status === "done") {
    const closesAt = new Date((o.doneAt ?? now).getTime() + CHAT_GRACE_MINUTES * 60_000);
    return { open: now < closesAt, closesAt, reason: "done" };
  }
  const closesAt = new Date(o.createdAt.getTime() + STALE_HOURS * 3_600_000);
  return now < closesAt ? { open: true, closesAt, reason: "active" } : { open: false, closesAt, reason: "stale" };
}
