import { describe, expect, it } from "vitest";
import { livePayCard, readCard } from "./chat-cards";

describe("reading a chat line's card", () => {
  it("reads each kind from its stored details", () => {
    expect(readCard("step", { status: "ready" })).toEqual({ kind: "step", status: "ready" });
    expect(readCard("step", { status: "out_for_delivery", provider: "own_rider" })).toEqual({ kind: "step", status: "out_for_delivery", provider: "own_rider" });
    expect(readCard("step", { status: "cancelled", byCustomer: true })).toEqual({ kind: "step", status: "cancelled", byCustomer: true });
    expect(readCard("quote", { fee: 50, total: 495, requote: true })).toEqual({ kind: "quote", fee: 50, total: 495, requote: true });
    expect(readCard("pay_sent", { ref: "1234567890", account: "GCash", amount: 495 })).toEqual({ kind: "pay_sent", ref: "1234567890", account: "GCash", amount: 495 });
    expect(readCard("pay_ok", { amount: 495 })).toEqual({ kind: "pay_ok", amount: 495 });
    expect(readCard("pay_missing", { amount: 495, ref: "1234567890", reason: "The amount doesn't match" })).toEqual({
      kind: "pay_missing", amount: 495, ref: "1234567890", reason: "The amount doesn't match",
    });
  });

  it("plain text, unknown kinds and broken details show as text", () => {
    expect(readCard("text", null)).toBeNull();
    expect(readCard(null, null)).toBeNull();
    expect(readCard("confetti", {})).toBeNull();
    expect(readCard("step", { status: "teleported" })).toBeNull();
    expect(readCard("quote", { fee: "50" })).toBeNull();
    expect(readCard("pay_sent", { ref: "1", amount: 1 })).toBeNull();
    expect(readCard("step", { status: "ready", provider: "drone" })).toEqual({ kind: "step", status: "ready" });
  });
});

describe("which card carries the pay form", () => {
  const waiting = { status: "awaiting_payment" as const, paymentStatus: "unpaid" as const };
  const lines = (...kinds: (string | null)[]) => kinds.map((kind, i) => ({ id: `m${i}`, kind }));

  it("the latest fee or not-found card, while a payment is still due", () => {
    expect(livePayCard(lines("step", "quote"), waiting)).toBe("m1");
    expect(livePayCard(lines("quote", "quote"), waiting)).toBe("m1");
    expect(livePayCard(lines("quote", "pay_sent", "pay_missing", "text"), waiting)).toBe("m2");
  });

  it("an order quoted before cards existed gets one added", () => {
    expect(livePayCard(lines("text", "text"), waiting)).toBe("add");
  });

  it("nothing to pay once it's sent, paid or not yet confirmed", () => {
    expect(livePayCard(lines("quote", "pay_sent"), { status: "awaiting_payment", paymentStatus: "submitted" })).toBeNull();
    expect(livePayCard(lines("quote", "pay_ok"), { status: "accepted", paymentStatus: "verified" })).toBeNull();
    expect(livePayCard(lines(), { status: "pending", paymentStatus: "unpaid" })).toBeNull();
  });
});
