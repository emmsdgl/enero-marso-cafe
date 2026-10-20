import { describe, expect, it } from "vitest";
import { checkDelivery, circleRing, deliveryFee, distanceMeters, feeSummary, formatDistance, mapsLink, plusCode, type DeliverySettings } from "./delivery";

const store = { lat: 14.4985, lng: 121.0436 };
const settings: DeliverySettings = { open: true, store, freeWithin: 500, maxDistance: 5000, minOrder: 0, baseFee: 49, baseMeters: 2000, perKm: 8, cash: false };
// About 333 m and 3.3 km north of the store
const near = { lat: 14.5015, lng: 121.0436 };
const far = { lat: 14.5285, lng: 121.0436 };

describe("delivery distance", () => {
  it("measures straight-line meters", () => {
    expect(distanceMeters(store, near)).toBeGreaterThan(320);
    expect(distanceMeters(store, near)).toBeLessThan(345);
    expect(distanceMeters(store, store)).toBe(0);
  });

  it("writes distances the way people say them", () => {
    expect(formatDistance(4)).toBe("10 m");
    expect(formatDistance(333)).toBe("330 m");
    expect(formatDistance(1000)).toBe("1 km");
    expect(formatDistance(3336)).toBe("3.3 km");
    expect(formatDistance(12_400)).toBe("12 km");
  });
});

describe("who can get delivery", () => {
  it("is free inside the free radius, and quoted outside it", () => {
    expect(checkDelivery(settings, near, 200)).toMatchObject({ ok: true, free: true });
    expect(checkDelivery(settings, far, 200)).toMatchObject({ ok: true, free: false });
    expect(checkDelivery({ ...settings, freeWithin: 0 }, near, 200)).toMatchObject({ ok: true, free: false });
  });

  it("refuses pins past the delivery limit, outside the country, or missing", () => {
    expect(checkDelivery({ ...settings, maxDistance: 2000 }, far, 200)).toMatchObject({ ok: false });
    expect(checkDelivery(settings, { lat: 35.68, lng: 139.76 }, 200)).toMatchObject({ ok: false });
    expect(checkDelivery(settings, null, 200)).toMatchObject({ ok: false });
  });

  it("needs the minimum order, an open switch and a store pin", () => {
    expect(checkDelivery({ ...settings, minOrder: 300 }, near, 299)).toMatchObject({ ok: false });
    expect(checkDelivery({ ...settings, minOrder: 300 }, near, 300)).toMatchObject({ ok: true });
    expect(checkDelivery({ ...settings, open: false }, near, 200)).toMatchObject({ ok: false });
    expect(checkDelivery({ ...settings, store: null }, near, 200)).toMatchObject({ ok: false });
  });
});

describe("pin helpers for staff", () => {
  it("makes Plus Codes that match the Open Location Code reference", () => {
    expect(plusCode({ lat: 20.3700625, lng: 2.7821875 })).toBe("7FG49QCJ+2V");
    expect(plusCode({ lat: 47.0000625, lng: 8.0000625 })).toBe("8FVC2222+22");
  });

  it("links the pin to Google Maps", () => {
    expect(mapsLink(near)).toBe("https://www.google.com/maps/search/?api=1&query=14.501500,121.043600");
  });
});

describe("free delivery area on the map", () => {
  it("draws a closed ring whose points are all the radius away", () => {
    const ring = circleRing(store, 500);
    expect(ring).toHaveLength(65);
    expect(ring[0][0]).toBeCloseTo(ring[64][0], 9);
    expect(ring[0][1]).toBeCloseTo(ring[64][1], 9);
    for (const [lng, lat] of ring) expect(Math.abs(distanceMeters(store, { lat, lng }) - 500)).toBeLessThanOrEqual(1);
  });
});

describe("the delivery fee", () => {
  const fees = { freeWithin: 500, baseFee: 49, baseMeters: 2000, perKm: 8 };

  it("is free inside the free area", () => {
    expect(deliveryFee(fees, 0)).toBe(0);
    expect(deliveryFee(fees, 500)).toBe(0);
  });

  it("is the base fee up to the base distance", () => {
    expect(deliveryFee(fees, 501)).toBe(49);
    expect(deliveryFee(fees, 2000)).toBe(49);
    expect(deliveryFee({ ...fees, freeWithin: 0 }, 100)).toBe(49);
  });

  it("adds the per-km price for each kilometer started after that", () => {
    expect(deliveryFee(fees, 2001)).toBe(57);
    expect(deliveryFee(fees, 3000)).toBe(57);
    expect(deliveryFee(fees, 3001)).toBe(65);
    expect(deliveryFee(fees, 9600)).toBe(49 + 8 * 8);
  });

  it("never goes over ₱1,000", () => {
    expect(deliveryFee({ ...fees, perKm: 200 }, 10_000)).toBe(1000);
  });

  it("comes with the delivery check, and reads as one line", () => {
    expect(checkDelivery(settings, far, 200)).toMatchObject({ ok: true, free: false, fee: 65 }); // 3.3 km: two started km past the first 2
    expect(checkDelivery(settings, near, 200)).toMatchObject({ ok: true, free: true, fee: 0 });
    expect(feeSummary(fees)).toBe("Free within 500 m · ₱49 up to 2 km, then ₱8 per km");
    expect(feeSummary({ ...fees, freeWithin: 0, perKm: 0 })).toBe("₱49 up to 2 km");
  });
});
