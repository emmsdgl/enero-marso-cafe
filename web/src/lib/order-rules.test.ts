import { describe, expect, it } from "vitest";
import { CHAT_GRACE_MINUTES, MESSAGE_MAX, STALE_HOURS, canMove, chatState, cleanMessage, cleanPaymentRef, nextStatuses, statusLabel, statusNote, unreadCount } from "./order-rules";

const at = (iso: string) => new Date(iso);

describe("order status flow", () => {
  it("walks a pickup order from pending to done", () => {
    expect(canMove("pickup", "pending", "accepted")).toBe(true);
    expect(canMove("pickup", "accepted", "preparing")).toBe(true);
    expect(canMove("pickup", "preparing", "ready")).toBe(true);
    expect(canMove("pickup", "ready", "done")).toBe(true);
  });

  it("never sends a pickup order out for delivery or asks it for payment first", () => {
    expect(canMove("pickup", "ready", "out_for_delivery")).toBe(false);
    expect(canMove("pickup", "pending", "awaiting_payment")).toBe(false);
  });

  it("quotes a delivery order and only accepts it once the GCash payment is verified", () => {
    expect(canMove("delivery", "pending", "accepted", "verified")).toBe(false);
    expect(canMove("delivery", "pending", "awaiting_payment")).toBe(true);
    expect(canMove("delivery", "awaiting_payment", "accepted", "unpaid")).toBe(false);
    expect(canMove("delivery", "awaiting_payment", "accepted", "submitted")).toBe(false);
    expect(canMove("delivery", "awaiting_payment", "accepted", "verified")).toBe(true);
  });

  it("sends a delivery order out before it is done", () => {
    expect(canMove("delivery", "ready", "done")).toBe(false);
    expect(canMove("delivery", "ready", "out_for_delivery")).toBe(true);
    expect(canMove("delivery", "out_for_delivery", "done")).toBe(true);
  });

  it("allows cancelling only before preparing starts", () => {
    expect(canMove("pickup", "pending", "cancelled")).toBe(true);
    expect(canMove("pickup", "accepted", "cancelled")).toBe(true);
    expect(canMove("delivery", "awaiting_payment", "cancelled")).toBe(true);
    expect(canMove("pickup", "preparing", "cancelled")).toBe(false);
    expect(canMove("delivery", "out_for_delivery", "cancelled")).toBe(false);
  });

  it("has no way out of done or cancelled, and no skipping steps", () => {
    expect(nextStatuses("pickup", "done")).toEqual([]);
    expect(nextStatuses("delivery", "cancelled")).toEqual([]);
    expect(canMove("pickup", "pending", "ready")).toBe(false);
    expect(canMove("pickup", "done", "pending")).toBe(false);
  });
});

describe("per-order chat", () => {
  const created = at("2026-10-10T11:00:00Z");

  it("is open while the order is in progress", () => {
    const s = chatState({ status: "preparing", createdAt: created, doneAt: null, cancelledAt: null }, at("2026-10-10T11:20:00Z"));
    expect(s).toMatchObject({ open: true, reason: "active" });
  });

  it(`stays open for ${CHAT_GRACE_MINUTES} minutes after the order is done, then closes`, () => {
    const doneAt = at("2026-10-10T12:00:00Z");
    const order = { status: "done" as const, createdAt: created, doneAt, cancelledAt: null };
    expect(chatState(order, at("2026-10-10T12:29:59Z")).open).toBe(true);
    const closed = chatState(order, at("2026-10-10T12:30:00Z"));
    expect(closed).toMatchObject({ open: false, reason: "done" });
    expect(closed.closesAt.toISOString()).toBe("2026-10-10T12:30:00.000Z");
  });

  it("closes immediately when the order is cancelled", () => {
    const s = chatState({ status: "cancelled", createdAt: created, doneAt: null, cancelledAt: at("2026-10-10T11:05:00Z") }, at("2026-10-10T11:05:01Z"));
    expect(s).toMatchObject({ open: false, reason: "cancelled" });
  });

  it(`closes an order nobody finished after ${STALE_HOURS} hours`, () => {
    const order = { status: "ready" as const, createdAt: created, doneAt: null, cancelledAt: null };
    expect(chatState(order, at("2026-10-10T22:59:00Z")).open).toBe(true);
    expect(chatState(order, at("2026-10-10T23:00:00Z"))).toMatchObject({ open: false, reason: "stale" });
  });
});

describe("chat messages", () => {
  it("trims, drops hidden characters and squeezes blank lines", () => {
    expect(cleanMessage("  Can I add a latte?  \r\n\r\n\r\n\r\nThanks \u202Eevil\u0007 ")).toEqual({ ok: true, text: "Can I add a latte?\n\nThanks evil" });
  });

  it("refuses empty, blank and over-long messages", () => {
    expect(cleanMessage("")).toMatchObject({ ok: false });
    expect(cleanMessage(" \n\t ")).toMatchObject({ ok: false });
    expect(cleanMessage(undefined)).toMatchObject({ ok: false });
    expect(cleanMessage("a".repeat(MESSAGE_MAX))).toMatchObject({ ok: true });
    expect(cleanMessage("a".repeat(MESSAGE_MAX + 1))).toMatchObject({ ok: false });
  });

  it("writes a line for each step, naming who cancelled and why", () => {
    expect(statusNote("ready", "pickup")).toBe("The order is ready for pickup.");
    expect(statusNote("done", "pickup")).toContain(`${CHAT_GRACE_MINUTES} minutes`);
    expect(statusNote("cancelled", "pickup", "An item ran out")).toBe("The cafe cancelled the order: An item ran out");
    expect(statusNote("pending", "pickup")).toBeNull();
  });

  it("counts only the other side's messages since this side last looked", () => {
    const msgs = [
      { sender: "customer" as const, createdAt: at("2026-10-10T11:01:00Z") },
      { sender: "system" as const, createdAt: at("2026-10-10T11:02:00Z") },
      { sender: "staff" as const, createdAt: at("2026-10-10T11:03:00Z") },
      { sender: "customer" as const, createdAt: at("2026-10-10T11:04:00Z") },
    ];
    expect(unreadCount(msgs, "staff", null)).toBe(2);
    expect(unreadCount(msgs, "staff", at("2026-10-10T11:01:00Z"))).toBe(1);
    expect(unreadCount(msgs, "customer", null)).toBe(1);
    expect(unreadCount(msgs, "customer", at("2026-10-10T11:03:00Z"))).toBe(0);
  });
});

describe("delivery payments", () => {
  it("tidies reference numbers the way receipts print them", () => {
    expect(cleanPaymentRef("1234 567 890123")).toBe("1234567890123");
    expect(cleanPaymentRef("ab-12cd34")).toBe("AB12CD34");
  });

  it("refuses things that can't be a reference", () => {
    expect(cleanPaymentRef("123")).toBeNull();
    expect(cleanPaymentRef("paid na po")).toBeNull();
    expect(cleanPaymentRef("1".repeat(21))).toBeNull();
    expect(cleanPaymentRef(undefined)).toBeNull();
  });

  it("calls a finished delivery order delivered", () => {
    expect(statusLabel("done", "delivery")).toBe("Delivered");
    expect(statusLabel("done", "pickup")).toBe("Picked up");
  });
});
