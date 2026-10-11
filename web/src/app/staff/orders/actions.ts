"use server";

import { refresh } from "next/cache";
import { markStaffRead, postStaffMessage } from "@/lib/order-chat";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-rules";
import { moveOrder, quoteDelivery, reissueOrderLink, reviewPayment, sendOut } from "@/lib/orders";
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

// ——— Delivery: confirm the fee, check the payment, send it out ———
export async function quoteDeliveryAction(orderId: string, fee: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await quoteDelivery(me, String(orderId), fee);
  refresh();
  return r.ok ? {} : { error: r.error };
}

export async function reviewPaymentAction(orderId: string, received: boolean): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await reviewPayment(me, String(orderId), received === true);
  refresh();
  return r.ok ? {} : { error: r.error };
}

export async function sendOutAction(orderId: string, provider: string, tracking: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await sendOut(me, String(orderId), provider, tracking);
  refresh();
  return r.ok ? {} : { error: r.error };
}

export async function sendStaffMessage(orderId: string, body: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await postStaffMessage(me, String(orderId), body);
  if (!r.ok) return { error: r.error };
  refresh();
  return {};
}

export async function markChatSeen(orderId: string) {
  const me = await requireStaff();
  await markStaffRead(me, String(orderId));
}

/** A fresh private link for the customer; the old one stops working */
export async function reissueLinkAction(orderId: string): Promise<{ error?: string; path?: string }> {
  const me = await requireStaff();
  const r = await reissueOrderLink(me, String(orderId));
  if (!r.ok) return { error: r.error };
  refresh();
  return { path: r.path };
}
