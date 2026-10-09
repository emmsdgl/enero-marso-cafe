"use server";

import { redirect } from "next/navigation";
import { cancelByCustomer, placeOrder, type PlaceOrderInput } from "@/lib/orders";
import { clientIp } from "@/lib/staff";

/** Checkout: on success the customer lands on their private order page */
export async function placeOrderAction(input: PlaceOrderInput): Promise<{ error: string }> {
  const r = await placeOrder(input, await clientIp());
  if (!r.ok) return { error: r.error };
  redirect(`/order/${r.code}?t=${encodeURIComponent(r.token)}`);
}

export async function cancelOrderAction(code: string, token: string): Promise<{ error?: string }> {
  const r = await cancelByCustomer(code, token);
  return r.ok ? {} : { error: r.error };
}
