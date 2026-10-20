import { cashLine } from "./cash";
import { formatDistance } from "./delivery";
import { peso } from "./menu";
import { usesPin, type Role } from "./roles";

/**
 * Staff phone notifications: who gets which, and what they say. Pure, so it's tested.
 * Lock screens show these, so they name the order code, never the customer's name or number.
 */
export type PushKind = "order" | "payment" | "message";

export type Device = {
  staffId: string;
  role: Role;
  branchId: string | null; // null for the admin (both branches)
  active: boolean;
  orders: boolean; // new orders and payments to check
  messages: boolean; // customer messages
  onShiftOnly: boolean;
};

/**
 * The devices that should buzz for something at a branch: that branch's counter staff (and the
 * admin), who chose this kind, and, if they asked, only while they're clocked in there. Riders hear
 * only about their own deliveries (assignedPayload, sent to them directly).
 */
export function recipients<D extends Device>(devices: D[], branchId: string, kind: PushKind, onShift: Set<string>): D[] {
  return devices.filter(
    (d) =>
      d.active &&
      d.role !== "rider" &&
      (d.role === "admin" || d.branchId === branchId) &&
      (kind === "message" ? d.messages : d.orders) &&
      (!d.onShiftOnly || onShift.has(d.staffId)),
  );
}

/** Employees and riders are notified while they're on shift; managers and the admin, always. Each device can change it. */
export const defaultOnShiftOnly = (role: Role) => usesPin(role);

export type Payload = { kind: PushKind | "talk" | "test"; title: string; body: string; url: string; tag: string };

const BRANCH_SHORT: Record<string, string> = { main: "Cafe", noir: "Cafe Noir" };
const time = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

export type OrderFacts = {
  id: string;
  code: string;
  branchId: string;
  fulfillment: "pickup" | "delivery";
  wantedAt: Date | null;
  items: number;
  total: number;
  distanceMeters: number | null;
};

export function newOrderPayload(o: OrderFacts): Payload {
  const how = o.fulfillment === "delivery" ? `Delivery${o.distanceMeters != null ? ` ${formatDistance(o.distanceMeters)}` : ""}` : "Pickup";
  const when = o.wantedAt ? `for ${time(o.wantedAt)}` : "ASAP";
  return {
    kind: "order",
    title: `New order ${o.code}`,
    body: `${BRANCH_SHORT[o.branchId] ?? o.branchId} · ${how} ${when} · ${o.items} item${o.items === 1 ? "" : "s"} · ${peso(o.total)}`,
    url: `/staff/orders/${o.id}`,
    tag: `order-${o.code}`,
  };
}

export function paymentPayload(o: { id: string; code: string; branchId: string; total: number }, account: string): Payload {
  return {
    kind: "payment",
    title: `Payment to check: ${o.code}`,
    body: `${BRANCH_SHORT[o.branchId] ?? o.branchId} · ${peso(o.total)} to ${account}. Check it in the app, then accept.`,
    url: `/staff/orders/${o.id}`,
    tag: `order-${o.code}`,
  };
}

/** To the rider (or barista) given a delivery: how far, and what to collect. Never who or where. */
export function assignedPayload(o: { id: string; code: string; distanceMeters: number | null; total: number; paymentMethod: string | null; cashTendered: number | null }): Payload {
  const far = o.distanceMeters != null ? `${formatDistance(o.distanceMeters)} away · ` : "";
  return {
    kind: "order",
    title: `Delivery ${o.code} is yours`,
    body: far + (o.paymentMethod === "cash" ? cashLine(o.total, o.cashTendered) : "Paid online, nothing to collect"),
    url: `/staff/deliveries#order-${o.id}`,
    tag: `order-${o.code}`,
  };
}

/** The message itself travels encrypted to the phone; it's cut short so a lock screen shows only a line */
export function messagePayload(o: { id: string; code: string }, text: string): Payload {
  const line = text.replace(/\s+/g, " ").trim();
  return {
    kind: "message",
    title: `New message on ${o.code}`,
    body: line.length > 90 ? `${line.slice(0, 89)}…` : line,
    url: `/staff/orders/${o.id}`,
    tag: `message-${o.code}`,
  };
}

/** "Chrome on Android", "Safari on iPhone": to tell a person's devices apart on their account page */
export function deviceName(userAgent: string): string {
  const ua = userAgent || "";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "a device";
  const browser = /EdgA?\//.test(ua) ? "Edge" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Firefox|FxiOS/.test(ua) ? "Firefox" : /CriOS|Chrome\//.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "Browser";
  return `${browser} on ${os}`;
}
