"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { refreshSubscription, removeDevice, saveSubscription, sendTest, updatePrefs, type SubscriptionInput } from "@/lib/push";
import { requireStaff } from "@/lib/staff";

/** Notifications on this device, for the signed-in staff member only */
export async function subscribePush(sub: SubscriptionInput): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await saveSubscription(me, sub, (await headers()).get("user-agent") ?? "");
  revalidatePath("/staff/account");
  return r.ok ? {} : { error: r.error };
}

export async function refreshPush(sub: SubscriptionInput) {
  const me = await requireStaff();
  await refreshSubscription(me, sub);
}

export async function savePushPrefs(id: string, prefs: { orders: boolean; messages: boolean; talk: boolean; onShiftOnly: boolean }) {
  const me = await requireStaff();
  await updatePrefs(me, String(id), prefs);
  revalidatePath("/staff/account");
}

export async function forgetPushDevice(by: { id?: string; endpoint?: string }) {
  const me = await requireStaff();
  await removeDevice(me, by);
  revalidatePath("/staff/account");
}

export async function testPush(id: string): Promise<{ error?: string }> {
  const me = await requireStaff();
  const r = await sendTest(me, String(id));
  return r.ok ? {} : { error: r.error };
}
