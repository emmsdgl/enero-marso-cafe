"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { glanceOrders, markCustomerRead, postCustomerMessage, type Glance } from "@/lib/order-chat";
import { cancelByCustomer, placeOrder, submitPayment, type PlaceOrderInput } from "@/lib/orders";
import { clientIp } from "@/lib/staff";

/** Checkout: on success the customer lands on their private order page */
export async function placeOrderAction(input: PlaceOrderInput): Promise<{ error: string }> {
  const r = await placeOrder(input, await clientIp());
  if (!r.ok) return { error: r.error };
  redirect(`/order/${r.code}?t=${encodeURIComponent(r.token)}`);
}

export async function cancelOrderAction(code: string, token: string): Promise<{ error?: string }> {
  const r = await cancelByCustomer(code, token);
  if (!r.ok) return { error: r.error };
  refresh();
  return {};
}

/** Delivery: "I've paid", with the reference number from the receipt */
export async function submitPaymentAction(code: string, token: string, accountId: string, ref: string): Promise<{ error?: string }> {
  const r = await submitPayment(String(code), String(token), accountId, ref);
  if (!r.ok) return { error: r.error };
  refresh();
  return {};
}

export async function sendCustomerMessage(code: string, token: string, body: string): Promise<{ error?: string }> {
  const r = await postCustomerMessage(String(code), String(token), body);
  if (!r.ok) return { error: r.error };
  refresh();
  return {};
}

/** The customer saw the end of the chat: clears the "new" count and the tab title */
export async function markOrderSeen(code: string, token: string) {
  await markCustomerRead(String(code), String(token));
  refresh();
}

/** The phone's remembered orders, checked for the "order in progress" bar */
export async function glanceOrdersAction(list: unknown): Promise<Glance[]> {
  if (!Array.isArray(list)) return [];
  const clean = list
    .slice(0, 5)
    .filter((l): l is { code: string; token: string } => typeof l?.code === "string" && typeof l?.token === "string" && l.code.length <= 12)
    .map(({ code, token }) => ({ code, token }));
  return glanceOrders(clean);
}
