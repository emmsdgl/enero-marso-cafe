"use server";

import { refresh } from "next/cache";
import { blockOrderPhone, unblockPhone } from "@/lib/blocklist";
import { markStaffRead, postStaffMessage } from "@/lib/order-chat";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-rules";
import { acceptDelivery, assignRider, changeDeliveryFee, moveOrder, reissueOrderLink, reviewPayment, riderStep, sendOut } from "@/lib/orders";
import { ALL_ROLES } from "@/lib/roles";
import { requireStaff } from "@/lib/staff";

const isStatus = (v: unknown): v is OrderStatus => typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);

/** One step on the board: accept, start, ready, picked up, or cancel with a reason */
export async function moveOrderAction(orderId: string, from: string, to: string, reason?: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  if (!isStatus(from) || !isStatus(to)) return { error: "That step isn't possible for this order." };
  const r = await moveOrder(me, String(orderId), from, to, reason);
  refresh();
  return r.ok ? {} : { error: r.error };
}

// ——— Delivery: accept with its fee, check the payment, choose the rider, send it out ———
/** One tap with the fee from the distance, or with the fee staff typed */
export async function acceptDeliveryAction(orderId: string, fee?: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await acceptDelivery(me, String(orderId), fee);
  refresh();
  return r.ok ? {} : { error: r.error };
}

export async function changeFeeAction(orderId: string, fee: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await changeDeliveryFee(me, String(orderId), fee);
  refresh();
  return r.ok ? {} : { error: r.error };
}

export async function assignRiderAction(orderId: string, riderId: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await assignRider(me, String(orderId), riderId);
  refresh();
  return r.ok ? {} : { error: r.error };
}

/** The rider's screen (riders, and counter staff sent out with one): "On my way", "Delivered" */
export async function riderStepAction(orderId: string, step: string, cashCollected?: boolean): Promise<{ error?: string }> {
  const me = await requireStaff(ALL_ROLES);
  const r = await riderStep(me, String(orderId), step, cashCollected === true);
  refresh();
  return r.ok ? {} : { error: r.error };
}

export async function reviewPaymentAction(orderId: string, received: boolean, reason?: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  // A board loaded before reasons existed sends none: that's the plain "not found yet"
  const r = await reviewPayment(me, String(orderId), received === true, received ? undefined : reason || undefined);
  refresh();
  return r.ok ? {} : { error: r.error };
}

export async function sendOutAction(orderId: string, provider: string, tracking: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await sendOut(me, String(orderId), provider, tracking);
  refresh();
  return r.ok ? {} : { error: r.error };
}

/** Counter staff, or the rider with the order (the customer sees them as "Your rider") */
export async function sendStaffMessage(orderId: string, body: string): Promise<{ error?: string }> {
  const me = await requireStaff(ALL_ROLES);
  const r = await postStaffMessage(me, String(orderId), body);
  if (!r.ok) return { error: r.error };
  refresh();
  return {};
}

/** Clears the counter's "new message" badge. A rider reading it on the road leaves it for the counter. */
export async function markChatSeen(orderId: string) {
  const me = await requireStaff(ALL_ROLES);
  if (me.role !== "rider") await markStaffRead(me, String(orderId));
}

/** A fresh private link for the customer; the old one stops working */
export async function reissueLinkAction(orderId: string): Promise<{ error?: string; path?: string }> {
  const me = await requireStaff();
  const r = await reissueOrderLink(me, String(orderId));
  if (!r.ok) return { error: r.error };
  refresh();
  return { path: r.path };
}

// ——— Blocking a number (managers and the admin) ———
export async function blockNumberAction(orderId: string, reason: string): Promise<{ ok?: string; error?: string }> {
  const me = await requireStaff(["manager", "admin"]);
  const r = await blockOrderPhone(me, String(orderId), String(reason));
  refresh();
  return r.ok ? { ok: "Blocked. This number can't order online any more." } : { error: r.error };
}

export async function unblockNumberAction(phone: string): Promise<{ ok?: string; error?: string }> {
  const me = await requireStaff(["manager", "admin"]);
  const r = await unblockPhone(me, String(phone));
  refresh();
  return r.ok ? { ok: "Unblocked." } : { error: r.error };
}
