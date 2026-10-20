import { describe, expect, it } from "vitest";
import type { Order } from "@/db";
import { RETAIN_DAYS, retentionCutoff, SCRUBBED } from "./retention-rules";

describe("keeping customer details for a year", () => {
  it("removes details from orders older than 365 days", () => {
    expect(RETAIN_DAYS).toBe(365);
    expect(retentionCutoff(new Date("2027-10-12T00:00:00Z")).toISOString()).toBe("2026-10-12T00:00:00.000Z");
  });

  it("clears every field that can identify or locate the customer", () => {
    const personal: (keyof Order)[] = ["customerName", "customerPhone", "customerEmail", "notes", "address", "landmark", "lat", "lng", "plusCode", "trackingUrl", "gcashRef", "createdIp"];
    expect(Object.keys(SCRUBBED).sort()).toEqual([...personal].sort());
    expect(SCRUBBED.customerName).toBe("Removed");
  });
});
