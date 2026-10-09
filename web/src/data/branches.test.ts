import { describe, expect, it } from "vitest";
import { branches, isOpen, manilaClock, minutesToClose, takingOrders } from "./branches";

const main = branches.find((b) => b.id === "main")!;
const noir = branches.find((b) => b.id === "noir")!;
const SUN = 0, MON = 1, TUE = 2, WED = 3;
const t = (h: number, m = 0) => h * 60 + m;

describe("opening hours", () => {
  it("opens the main cafe at 6 PM and keeps it open past midnight", () => {
    expect(isOpen(main, TUE, t(17, 59))).toBe(false);
    expect(isOpen(main, TUE, t(18))).toBe(true);
    expect(isOpen(main, WED, t(0, 59))).toBe(true);
    expect(isOpen(main, WED, t(1))).toBe(false);
  });

  it("treats Monday as closed, except for Sunday night's spill past midnight", () => {
    expect(isOpen(main, MON, t(0, 30))).toBe(true);
    expect(isOpen(main, MON, t(20))).toBe(false);
    expect(isOpen(main, TUE, t(0, 30))).toBe(false);
  });

  it("follows Cafe Noir's short Tuesday", () => {
    expect(isOpen(noir, TUE, t(0, 30))).toBe(true); // Monday night, still open
    expect(isOpen(noir, TUE, t(12))).toBe(false);
    expect(isOpen(noir, TUE, t(13))).toBe(true);
    expect(isOpen(noir, TUE, t(22))).toBe(false);
    expect(isOpen(noir, WED, t(0, 30))).toBe(false); // Tuesday closes at 10 PM, no spill
  });

  it("counts the minutes to closing across midnight", () => {
    expect(minutesToClose(main, SUN, t(23))).toBe(120);
    expect(minutesToClose(main, MON, t(0, 30))).toBe(30);
    expect(minutesToClose(noir, TUE, t(21))).toBe(60);
    expect(minutesToClose(main, MON, t(20))).toBeNull();
  });
});

describe("online order cutoff", () => {
  it("stops taking orders 30 minutes before closing", () => {
    expect(takingOrders(main, SUN, t(23))).toBe(true);
    expect(takingOrders(main, MON, t(0, 29))).toBe(true);
    expect(takingOrders(main, MON, t(0, 30))).toBe(false);
    expect(takingOrders(noir, TUE, t(21, 30))).toBe(false);
    expect(takingOrders(main, MON, t(20))).toBe(false);
  });
});

describe("Manila clock", () => {
  it("reads Philippine time whatever the server's time zone", () => {
    // Saturday 16:30 UTC is already Sunday 00:30 in Manila (UTC+8)
    expect(manilaClock(new Date("2026-10-10T16:30:00Z"))).toEqual({ weekday: SUN, minute: t(0, 30) });
    expect(manilaClock(new Date("2026-10-12T10:00:00Z"))).toEqual({ weekday: MON, minute: t(18) });
  });
});
