/**
 * The cards in an order's chat. Each step of the order (accepted, ready, paid…) is a line in the
 * chat with a kind and a few details, so the customer's page can draw it as a card to tap open.
 * The line's text is kept too: it's what the staff page shows, and what an older page falls back to.
 */
import { ORDER_STATUSES, type OrderStatus, type PaymentStatus } from "./order-rules";

export const CARD_KINDS = ["text", "step", "quote", "pay_sent", "pay_ok", "pay_missing"] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export type Card =
  | { kind: "step"; status: OrderStatus; provider?: "lalamove" | "own_rider"; byCustomer?: boolean }
  | { kind: "quote"; fee: number; total: number; requote: boolean }
  | { kind: "pay_sent"; ref: string; account: string; amount: number }
  | { kind: "pay_ok"; amount: number }
  | { kind: "pay_missing"; amount: number; ref: string | null; reason: string | null };

/** Why staff couldn't find a payment: the customer reads it on the card, so it says what to check */
export const NOT_FOUND_REASONS = ["We can't find it yet", "The amount doesn't match", "It went to a different account"] as const;

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === "string" ? v : null);

/** A stored line's card, or null when it's plain text or its details don't make sense (it then shows as text) */
export function readCard(kind: string | null | undefined, meta: unknown): Card | null {
  const m = (meta && typeof meta === "object" ? meta : {}) as Record<string, unknown>;
  switch (kind) {
    case "step": {
      const status = m.status as OrderStatus;
      if (!ORDER_STATUSES.includes(status)) return null;
      const provider = m.provider === "lalamove" || m.provider === "own_rider" ? m.provider : undefined;
      return { kind: "step", status, ...(provider ? { provider } : {}), ...(m.byCustomer === true ? { byCustomer: true } : {}) };
    }
    case "quote": {
      const fee = num(m.fee), total = num(m.total);
      return fee === null || total === null ? null : { kind: "quote", fee, total, requote: m.requote === true };
    }
    case "pay_sent": {
      const ref = str(m.ref), account = str(m.account), amount = num(m.amount);
      return ref && account && amount !== null ? { kind: "pay_sent", ref, account, amount } : null;
    }
    case "pay_ok": {
      const amount = num(m.amount);
      return amount === null ? null : { kind: "pay_ok", amount };
    }
    case "pay_missing": {
      const amount = num(m.amount);
      return amount === null ? null : { kind: "pay_missing", amount, ref: str(m.ref), reason: str(m.reason) };
    }
    default:
      return null;
  }
}

/**
 * Which line carries the pay form: the latest fee or "not found" card, and only while the order is
 * waiting for an unpaid payment. "add" means there's none to use (an order quoted before cards
 * existed), so the page adds one at the end. null: nothing to pay right now.
 */
export function livePayCard(lines: { id: string; kind: string | null }[], order: { status: OrderStatus; paymentStatus: PaymentStatus }): string | "add" | null {
  if (order.status !== "awaiting_payment" || order.paymentStatus !== "unpaid") return null;
  const last = lines.findLast((l) => l.kind === "quote" || l.kind === "pay_missing" || l.kind === "pay_sent");
  return last && last.kind !== "pay_sent" ? last.id : "add";
}
