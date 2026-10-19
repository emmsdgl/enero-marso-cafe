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

/** What staff call each status on the board (see statusLabel for delivered orders) */
export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "New",
  awaiting_payment: "Awaiting payment",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  done: "Picked up",
  cancelled: "Cancelled",
};

export const statusLabel = (status: OrderStatus, fulfillment: Fulfillment) =>
  status === "done" && fulfillment === "delivery" ? "Delivered" : STATUS_LABEL[status];

/**
 * The reference number from a payment receipt, tidied: GCash prints "1234 567 890123", banks
 * mix letters and digits. Null when it can't be a reference.
 */
export function cleanPaymentRef(input: unknown): string | null {
  const ref = String(input ?? "").toUpperCase().replace(/[\s-]/g, "");
  // Every receipt's reference has digits; "PAID NA PO" doesn't
  return /^[A-Z0-9]{6,20}$/.test(ref) && (ref.match(/\d/g)?.length ?? 0) >= 4 ? ref : null;
}

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

export type Sender = "customer" | "staff" | "system";

/** Longest chat message, about three text messages' worth */
export const MESSAGE_MAX = 500;

/**
 * Tidies a chat message before it's stored: no control characters or hidden text-direction
 * tricks, no trailing spaces, at most one blank line in a row.
 */
export function cleanMessage(input: unknown): { ok: true; text: string } | { ok: false; error: string } {
  if (typeof input !== "string") return { ok: false, error: "Type a message first." };
  const text = input
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!text) return { ok: false, error: "Type a message first." };
  if (text.length > MESSAGE_MAX) return { ok: false, error: `Keep messages under ${MESSAGE_MAX} characters.` };
  return { ok: true, text };
}

/** The line the chat shows when an order moves on. Both sides read it, so it says who did what. */
export function statusNote(to: OrderStatus, fulfillment: Fulfillment, reason?: string | null): string | null {
  switch (to) {
    case "accepted":
      return "The cafe accepted the order.";
    case "preparing":
      return "The order is being prepared.";
    case "ready":
      return fulfillment === "pickup" ? "The order is ready for pickup." : "The order is ready and waiting for the rider.";
    case "out_for_delivery":
      return "The order is on its way.";
    case "done":
      return `${fulfillment === "pickup" ? "Picked up" : "Delivered"}. This chat stays open for ${CHAT_GRACE_MINUTES} minutes in case anything's missing.`;
    case "cancelled":
      return reason ? `The cafe cancelled the order: ${reason}` : "The order was cancelled.";
    default:
      return null;
  }
}

/** Chat lines the customer is told about like a message (see lib/chat-cards.ts): a payment the cafe couldn't find */
export const CUSTOMER_ALERT_KINDS = ["pay_missing"];

/**
 * Messages from the other side that arrived after this side last looked. System lines don't
 * count, except the alerts above for the customer.
 */
export function unreadCount(messages: { sender: Sender; createdAt: Date; kind?: string | null }[], side: "customer" | "staff", lastReadAt: Date | null) {
  const from: Sender = side === "staff" ? "customer" : "staff";
  const counts = (m: { sender: Sender; kind?: string | null }) =>
    m.sender === from || (side === "customer" && m.sender === "system" && CUSTOMER_ALERT_KINDS.includes(m.kind ?? ""));
  return messages.filter((m) => counts(m) && (!lastReadAt || m.createdAt > lastReadAt)).length;
}

/** Why a manager blocked a number from ordering online (lib/blocklist.ts) */
export const BLOCK_REASONS = ["Didn't pick up the order", "Prank or fake order", "Abusive messages"] as const;
