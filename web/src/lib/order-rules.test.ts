import { describe, expect, it } from "vitest";
import { CHAT_GRACE_MINUTES, STALE_HOURS, canMove, chatState, nextStatuses } from "./order-rules";

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
