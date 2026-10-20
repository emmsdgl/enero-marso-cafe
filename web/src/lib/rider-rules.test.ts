import { describe, expect, it } from "vitest";
import { ago, readSpot, shouldSend, spotLine, spotState } from "./rider-rules";

const home = { lat: 14.5415, lng: 121.01626 };
const near = { lat: 14.5307, lng: 121.01626 }; // about 1.2 km south of home

describe("the rider's position", () => {
  it("is live for a minute, paused up to 15 minutes, then gone", () => {
    expect(spotState(12_000)).toEqual({ state: "live", ageMs: 12_000 });
    expect(spotState(60_000)).toMatchObject({ state: "live" });
    expect(spotState(4 * 60_000)).toEqual({ state: "paused", ageMs: 240_000 });
    expect(spotState(15 * 60_000 + 1)).toEqual({ state: "gone" });
    expect(spotState(null)).toEqual({ state: "gone" });
  });

  it("treats a clock a little ahead as just now", () => {
    expect(spotState(-2_000)).toEqual({ state: "live", ageMs: 0 });
  });

  it("is sent about every 15 s, sooner after a long move, never under 8 s", () => {
    const last = { at: 0, ...home };
    expect(shouldSend(null, home, 0)).toBe(true);
    expect(shouldSend(last, home, 14_000)).toBe(false);
    expect(shouldSend(last, home, 15_000)).toBe(true);
    expect(shouldSend(last, near, 9_000)).toBe(true);
    expect(shouldSend(last, near, 7_000)).toBe(false);
  });

  it("keeps only believable fixes", () => {
    expect(readSpot({ ...home, accuracy: 12.4 })).toEqual({ ...home, accuracy: 12 });
    expect(readSpot({ ...home, accuracy: 5000 })).toBeNull();
    expect(readSpot({ lat: 35.68, lng: 139.76, accuracy: 10 })).toBeNull(); // Tokyo
    expect(readSpot({ lat: "x", lng: 121, accuracy: 10 })).toBeNull();
    expect(readSpot(null)).toBeNull();
  });

  it("says how far and how fresh", () => {
    expect(ago(12_400)).toBe("12 s ago");
    expect(ago(4 * 60_000 + 10_000)).toBe("4 min ago");
    expect(spotLine(near, 12_000, home)).toBe("About 1.2 km away · updated 12 s ago");
    expect(spotLine(near, 5 * 60_000, home)).toBe("Location paused · last seen 5 min ago");
    expect(spotLine(near, 20 * 60_000, home)).toBe("Waiting for the rider’s location…");
  });
});
