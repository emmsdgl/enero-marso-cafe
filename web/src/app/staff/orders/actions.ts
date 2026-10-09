"use server";

import { revalidatePath } from "next/cache";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-rules";
import { moveOrder } from "@/lib/orders";
import { requireStaff } from "@/lib/staff";

const isStatus = (v: unknown): v is OrderStatus => typeof v === "string" && (ORDER_STATUSES as readonly string[]).includes(v);

/** One step on the board: accept, start, ready, picked up, or cancel with a reason */
export async function moveOrderAction(orderId: string, from: string, to: string, reason?: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  if (!isStatus(from) || !isStatus(to)) return { error: "That step isn't possible for this order." };
  const r = await moveOrder(me, String(orderId), from, to, reason);
  revalidatePath("/staff/orders");
  return r.ok ? {} : { error: r.error };
}
