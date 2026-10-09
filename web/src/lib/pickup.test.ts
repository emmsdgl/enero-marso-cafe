import { describe, expect, it } from "vitest";
import { branches } from "@/data/branches";
import { pickupAllowed, pickupWindow } from "./pickup";

const main = branches.find((b) => b.id === "main")!;
const noir = branches.find((b) => b.id === "noir")!;
/** A Manila wall-clock time on a given date, e.g. manila("2026-10-13", "19:07") — 13 Oct 2026 is a Tuesday */
const manila = (date: string, time: string) => new Date(`${date}T${time}:00+08:00`);
const hm = (d: Date) => d.toLocaleTimeString("en-GB", { timeZone: "Asia/Manila", hour: "2-digit", minute: "2-digit" });

describe("pickup times", () => {
  it("offers ASAP and 15-minute times from 20 minutes out until the cutoff", () => {
    const w = pickupWindow(main, manila("2026-10-13", "19:07"), 30);
    expect(w.asap).toBe(true);
    expect(hm(w.slots[0])).toBe("19:30"); // 19:07 + 20 min, rounded up to the quarter hour
    expect(hm(w.slots.at(-1)!)).toBe("00:30"); // closes 1 AM, 30-minute cutoff
    expect(w.slots).toHaveLength(21); // 7:30 PM to 12:30 AM
  });

  it("follows the branch's own cutoff", () => {
    expect(hm(pickupWindow(main, manila("2026-10-13", "19:07"), 60).slots.at(-1)!)).toBe("00:00");
    expect(hm(pickupWindow(main, manila("2026-10-13", "19:07"), 45).slots.at(-1)!)).toBe("00:15");
  });

  it("takes pre-orders before opening, for later the same day", () => {
    const w = pickupWindow(main, manila("2026-10-13", "14:00"), 30);
    expect(w.asap).toBe(false);
    expect(hm(w.opensAt!)).toBe("18:00");
    expect(hm(w.slots[0])).toBe("18:30"); // opening + 20 min, on the quarter hour
  });

  it("after last night's cutoff, offers only pre-orders for this evening", () => {
    const w = pickupWindow(main, manila("2026-10-14", "00:40"), 30); // Wed 00:40: Tuesday night's cutoff has passed
    expect(w.asap).toBe(false);
    expect(w.opensAt!.toISOString()).toBe(manila("2026-10-14", "18:00").toISOString());
  });

  it("knows the main cafe is closed on Mondays, apart from Sunday night's spill", () => {
    expect(pickupWindow(main, manila("2026-10-12", "15:00"), 30)).toEqual({ asap: false, slots: [], opensAt: null });
  });

  it("follows Cafe Noir's short Tuesday", () => {
    const w = pickupWindow(noir, manila("2026-10-13", "10:00"), 30);
    expect(hm(w.opensAt!)).toBe("13:00");
    expect(hm(w.slots.at(-1)!)).toBe("21:30");
  });
});

describe("checking a chosen time on the server", () => {
  const now = manila("2026-10-13", "19:07");
  it("accepts a listed time, even if the customer took a few minutes to press the button", () => {
    const chosen = pickupWindow(main, manila("2026-10-13", "19:02"), 30).slots[0]; // 19:30, picked 5 minutes ago
    expect(pickupAllowed(main, now, 30, chosen)).toBe(true);
    expect(pickupAllowed(main, now, 30, null)).toBe(true);
  });
  it("refuses times off the list, in the past, or after the cutoff", () => {
    expect(pickupAllowed(main, now, 30, manila("2026-10-13", "19:40"))).toBe(false);
    expect(pickupAllowed(main, now, 30, manila("2026-10-13", "19:00"))).toBe(false);
    expect(pickupAllowed(main, now, 30, manila("2026-10-14", "00:45"))).toBe(false);
  });
  it("refuses ASAP before opening", () => {
    expect(pickupAllowed(main, manila("2026-10-13", "14:00"), 30, null)).toBe(false);
  });
});
