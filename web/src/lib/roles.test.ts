import { describe, expect, it } from "vitest";
import { canDeliver, canSeeOrder, clocksIn, COUNTER, homeFor, hoursScope, isManager, usesPin } from "./roles";

const rider = { id: "r1", role: "rider" as const, branchId: "main" };
const barista = { id: "b1", role: "employee" as const, branchId: "main" };
const manager = { id: "m1", role: "manager" as const, branchId: "noir" };
const owner = { id: "o1", role: "admin" as const, branchId: null };

describe("roles", () => {
  it("keeps riders off the counter", () => {
    expect(COUNTER).not.toContain("rider");
    expect(homeFor(rider)).toBe("/staff/deliveries");
    expect(homeFor(barista)).toBe("/staff");
  });

  it("knows the managers", () => {
    expect([rider, barista, manager, owner].map(isManager)).toEqual([false, false, true, true]);
  });

  it("gives PINs to employees and riders, and clocks everyone in but the owner", () => {
    expect(["employee", "rider", "manager", "admin"].map((r) => usesPin(r as never))).toEqual([true, true, false, false]);
    expect(["employee", "rider", "manager", "admin"].map((r) => clocksIn(r as never))).toEqual([true, true, true, false]);
  });

  it("shows riders and employees only their own hours", () => {
    expect([rider, barista, manager, owner].map(hoursScope)).toEqual(["own", "own", "branch", "all"]);
  });

  it("shows a rider only the orders given to them", () => {
    expect(canSeeOrder(rider, { branchId: "main", riderId: "r1" })).toBe(true);
    expect(canSeeOrder(rider, { branchId: "main", riderId: "someone" })).toBe(false);
    expect(canSeeOrder(rider, { branchId: "main", riderId: null })).toBe(false);
    expect(canSeeOrder(barista, { branchId: "main", riderId: null })).toBe(true);
    expect(canSeeOrder(barista, { branchId: "noir", riderId: null })).toBe(false);
    expect(canSeeOrder(owner, { branchId: "noir", riderId: null })).toBe(true);
  });

  it("sends out riders, or counter staff who are on shift, from their own branch", () => {
    expect(canDeliver({ ...rider, active: true }, "main", false)).toBe(true);
    expect(canDeliver({ ...barista, active: true }, "main", true)).toBe(true);
    expect(canDeliver({ ...barista, active: true }, "main", false)).toBe(false);
    expect(canDeliver({ ...rider, active: true }, "noir", false)).toBe(false);
    expect(canDeliver({ ...rider, active: false }, "main", false)).toBe(false);
    expect(canDeliver({ ...owner, active: true }, "main", true)).toBe(false);
  });
});
