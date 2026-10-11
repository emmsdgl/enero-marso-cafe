import { describe, expect, it } from "vitest";
import { defaultOnShiftOnly, deviceName, messagePayload, newOrderPayload, paymentPayload, recipients, type Device } from "./push-rules";

const device = (over: Partial<Device> & { staffId: string }): Device => ({
  role: "employee", branchId: "main", active: true, orders: true, messages: true, onShiftOnly: true, ...over,
});

describe("who gets a notification", () => {
  const ana = device({ staffId: "ana" }); // employee, main, on shift only
  const ben = device({ staffId: "ben", onShiftOnly: false }); // employee who wants them always
  const mgr = device({ staffId: "mgr", role: "manager", onShiftOnly: false });
  const noir = device({ staffId: "noir", branchId: "noir", onShiftOnly: false });
  const admin = device({ staffId: "admin", role: "admin", branchId: null, onShiftOnly: false });
  const gone = device({ staffId: "gone", active: false, onShiftOnly: false });
  const quiet = device({ staffId: "quiet", messages: false, onShiftOnly: false });
  const all = [ana, ben, mgr, noir, admin, gone, quiet];
  const ids = (list: Device[]) => list.map((d) => d.staffId).sort();

  it("buzzes the branch's staff and the admin, not the other branch or deactivated staff", () => {
    expect(ids(recipients(all, "main", "order", new Set()))).toEqual(["admin", "ben", "mgr", "quiet"]);
    expect(ids(recipients(all, "noir", "order", new Set()))).toEqual(["admin", "noir"]);
  });

  it("reaches on-shift-only staff only while they're clocked in", () => {
    expect(ids(recipients([ana], "main", "order", new Set()))).toEqual([]);
    expect(ids(recipients([ana], "main", "order", new Set(["ana"])))).toEqual(["ana"]);
  });

  it("respects each device's choice of orders and messages", () => {
    expect(ids(recipients(all, "main", "message", new Set()))).toEqual(["admin", "ben", "mgr"]);
    expect(ids(recipients([device({ staffId: "x", orders: false, onShiftOnly: false })], "main", "payment", new Set()))).toEqual([]);
  });

  it("starts employees on shift-only, managers and the admin on always", () => {
    expect(defaultOnShiftOnly("employee")).toBe(true);
    expect(defaultOnShiftOnly("manager")).toBe(false);
    expect(defaultOnShiftOnly("admin")).toBe(false);
  });
});

describe("what the notification says", () => {
  it("describes a new order without the customer's name or number", () => {
    const p = newOrderPayload({ id: "o1", code: "EM-7KQ4P2", branchId: "noir", fulfillment: "delivery", wantedAt: null, items: 3, total: 245, distanceMeters: 280 });
    expect(p).toEqual({
      kind: "order", title: "New order EM-7KQ4P2", body: "Cafe Noir · Delivery 280 m ASAP · 3 items · ₱245", url: "/staff/orders/o1", tag: "order-EM-7KQ4P2",
    });
    const later = newOrderPayload({ id: "o2", code: "EM-2", branchId: "main", fulfillment: "pickup", wantedAt: new Date("2026-10-13T11:30:00Z"), items: 1, total: 90, distanceMeters: null });
    expect(later.body).toBe("Cafe · Pickup for 7:30 PM · 1 item · ₱90");
  });

  it("asks staff to check a payment, and shortens long messages for the lock screen", () => {
    expect(paymentPayload({ id: "o1", code: "EM-1", branchId: "main", total: 145 }, "GCash").body).toBe("Cafe · ₱145 to GCash. Check it in the app, then accept.");
    const long = messagePayload({ id: "o1", code: "EM-1" }, `Hi!   ${"a".repeat(200)}`);
    expect(long.body).toHaveLength(90);
    expect(long.body.startsWith("Hi! a")).toBe(true);
    expect(long.tag).toBe("message-EM-1");
  });

  it("names devices so people can tell them apart", () => {
    expect(deviceName("Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36")).toBe("Chrome on Android");
    expect(deviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1")).toBe("Safari on iPhone");
    expect(deviceName("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0")).toBe("Edge on Windows");
  });
});
