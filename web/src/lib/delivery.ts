import { peso } from "./menu";

/**
 * Delivery rules shared by checkout, the server and the staff screens. Pure: no database, no
 * map service. Distances are straight lines from the branch's pin (free and instant); staff
 * confirm every delivery fee anyway, so a pin a few meters off can't cost anyone money.
 */
export type LatLng = { lat: number; lng: number };

/** Choices managers get on Staff > Branch. Meters; 0 = no free delivery. */
export const FREE_DELIVERY_OPTIONS = [0, 100, 250, 500, 1000, 2000] as const;
export const MAX_DELIVERY_OPTIONS = [2000, 3000, 5000, 8000, 10000] as const;
export const MIN_ORDER_OPTIONS = [0, 200, 300, 500] as const;
/** The highest fee staff can quote, a guard against typos like ₱6000 for ₱60 */
export const MAX_DELIVERY_FEE = 1000;

export type DeliverySettings = { open: boolean; store: LatLng | null; freeWithin: number; maxDistance: number; minOrder: number };

export function isLatLng(v: unknown): v is LatLng {
  const p = v as LatLng;
  return !!p && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180;
}

/** A rough box around the Philippines: a pin outside it is a mistake */
export const inPhilippines = (p: LatLng) => p.lat >= 4 && p.lat <= 21.5 && p.lng >= 116 && p.lng <= 127;

/** Straight-line distance in meters (haversine) */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6_371_000 * Math.asin(Math.sqrt(h)));
}

export function formatDistance(m: number) {
  if (m < 1000) return `${Math.max(10, Math.round(m / 10) * 10)} m`;
  return `${(m / 1000).toFixed(m < 10_000 ? 1 : 0).replace(/\.0$/, "")} km`;
}

export type DeliveryCheck = { ok: true; distance: number; free: boolean } | { ok: false; error: string; distance?: number };

/** Can this branch deliver to this pin, for this many pesos of items? */
export function checkDelivery(s: DeliverySettings, pin: LatLng | null, subtotal: number): DeliveryCheck {
  if (!s.open || !s.store) return { ok: false, error: "This branch isn't delivering right now. You can still order for pickup." };
  if (!pin) return { ok: false, error: "Set the pin where we should deliver: tap the map, or use your location." };
  if (!inPhilippines(pin)) return { ok: false, error: "That pin is outside the Philippines. Move it to where we should deliver." };
  const distance = distanceMeters(s.store, pin);
  if (distance > s.maxDistance) {
    return { ok: false, distance, error: `That's ${formatDistance(distance)} away. We deliver up to ${formatDistance(s.maxDistance)} from the branch.` };
  }
  if (subtotal < s.minOrder) return { ok: false, distance, error: `Delivery needs at least ${peso(s.minOrder)} in items.` };
  return { ok: true, distance, free: distance <= s.freeWithin };
}

/** The free delivery area as a closed ring of [lng, lat] points, for drawing on the map */
export function circleRing(center: LatLng, radius: number, steps = 64): [number, number][] {
  const rad = Math.PI / 180;
  const d = radius / 6_371_000;
  const lat1 = center.lat * rad;
  const lng1 = center.lng * rad;
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const bearing = (i / steps) * 2 * Math.PI;
    const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing));
    const lng2 = lng1 + Math.atan2(Math.sin(bearing) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
    ring.push([lng2 / rad, lat2 / rad]);
  }
  return ring;
}

/** Opens the pin in Google Maps (no API key needed): staff use it, and paste it into Lalamove */
export const mapsLink = (p: LatLng) => `https://www.google.com/maps/search/?api=1&query=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

const OLC = "23456789CFGHJMPQRVWX";

/**
 * The pin as a Plus Code (Open Location Code), e.g. "7Q63GXQ2+X3": a 14-meter square that
 * Google Maps and Lalamove both find, handy where streets have no house numbers.
 */
export function plusCode({ lat, lng }: LatLng): string {
  const clippedLat = Math.min(Math.max(lat, -90), 90);
  const normLng = ((((lng + 180) % 360) + 360) % 360) - 180;
  // Whole 1/8000ths of a degree, as the reference implementation counts them
  let la = Math.floor(Math.round((clippedLat + 90) * 8000 * 1e6) / 1e6);
  let lo = Math.floor(Math.round((normLng + 180) * 8000 * 1e6) / 1e6);
  la = Math.min(la, 180 * 8000 - 1); // the North Pole belongs to the last row
  let code = "";
  for (let i = 0; i < 5; i++) {
    code = OLC[la % 20] + OLC[lo % 20] + code;
    la = Math.floor(la / 20);
    lo = Math.floor(lo / 20);
  }
  return `${code.slice(0, 8)}+${code.slice(8)}`;
}
