import "server-only";
import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { after } from "next/server";
import webpush from "web-push";
import { db, pushSubscriptions, staff, timeEntries, type PushSubscriptionRow, type Staff } from "@/db";
import { defaultOnShiftOnly, deviceName, recipients, type Payload, type PushKind } from "./push-rules";
import { manila } from "./staff";
import { missedTalkPayload, missedTalkRecipients } from "./talk-rules";

/**
 * Staff phone notifications (standard Web Push, signed with the site's VAPID keys). Messages are
 * encrypted for each device, so the push services (Google, Apple, Microsoft) can't read them.
 * Without keys this does nothing, and the staff pages say notifications aren't set up yet.
 */
const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "https://enero-marso-cafe.vercel.app";
export const pushConfigured = Boolean(PUBLIC_KEY && PRIVATE_KEY);
type Fail = { ok: false; error: string };

let keysSet = false;
function ready() {
  if (!keysSet && pushConfigured) {
    webpush.setVapidDetails(SUBJECT, PUBLIC_KEY!, PRIVATE_KEY!);
    keysSet = true;
  }
  return keysSet;
}

/** Sends to each device; forgets devices whose subscription has expired */
async function send(rows: PushSubscriptionRow[], payload: Payload) {
  if (!ready() || rows.length === 0) return { sent: 0 };
  const gone: string[] = [];
  const sent: string[] = [];
  const body = JSON.stringify({ ...payload, at: Date.now() });
  // A newer message with the same topic replaces one the phone hasn't picked up yet
  const topic = payload.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  await Promise.all(
    rows.map(async (r) => {
      try {
        await webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, body, { TTL: 3600, urgency: "high", topic });
        sent.push(r.id);
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(r.id);
        else console.error("Push failed", status, (e as Error).message);
      }
    }),
  );
  if (gone.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, gone));
  if (sent.length) await db.update(pushSubscriptions).set({ lastSentAt: new Date() }).where(inArray(pushSubscriptions.id, sent));
  return { sent: sent.length };
}

/**
 * Tells a branch's staff about a new order, a payment to check, or a customer message. Runs after
 * the response is sent, so the customer never waits on push services.
 */
export function notifyBranch(branchId: string, kind: PushKind, payload: Payload) {
  if (!pushConfigured) return;
  after(async () => {
    try {
      const rows = await db
        .select({ sub: pushSubscriptions, role: staff.role, staffBranch: staff.branchId, active: staff.active })
        .from(pushSubscriptions)
        .innerJoin(staff, eq(staff.id, pushSubscriptions.staffId))
        .where(and(eq(staff.active, true), or(eq(staff.branchId, branchId), eq(staff.role, "admin"))));
      if (rows.length === 0) return;
      const shifts = await db
        .select({ staffId: timeEntries.staffId })
        .from(timeEntries)
        .where(and(eq(timeEntries.branchId, branchId), isNull(timeEntries.clockOut)));
      const devices = rows.map((r) => ({ ...r.sub, role: r.role, branchId: r.staffBranch, active: r.active }));
      await send(recipients(devices, branchId, kind, new Set(shifts.map((s) => s.staffId))), payload);
    } catch (e) {
      console.error("Push failed", e);
    }
  });
}

/** One person's devices (a delivery given to them, a message on it), if they're still active and want order alerts */
export function notifyStaff(staffId: string, payload: Payload) {
  if (!pushConfigured) return;
  after(async () => {
    try {
      const rows = await db
        .select({ sub: pushSubscriptions })
        .from(pushSubscriptions)
        .innerJoin(staff, eq(staff.id, pushSubscriptions.staffId))
        .where(and(eq(pushSubscriptions.staffId, staffId), eq(staff.active, true), eq(pushSubscriptions.orders, true)));
      await send(rows.map((r) => r.sub), payload);
    } catch (e) {
      console.error("Push failed", e);
    }
  });
}

/**
 * A saved talk clip that some of the branch's clocked-in staff (or the owner) didn't hear live.
 * Runs after the response is sent.
 */
export function notifyMissedTalk(
  clip: { id: string; name: string; ms: number; branches: string[]; speakerId: string | null },
  heardLive: Set<string>,
) {
  if (!pushConfigured) return;
  after(async () => {
    try {
      const rows = await db
        .select({ sub: pushSubscriptions, role: staff.role, staffBranch: staff.branchId, active: staff.active })
        .from(pushSubscriptions)
        .innerJoin(staff, eq(staff.id, pushSubscriptions.staffId))
        .where(and(eq(staff.active, true), eq(pushSubscriptions.talk, true), or(inArray(staff.branchId, clip.branches), eq(staff.role, "admin"))));
      if (rows.length === 0) return;
      const shifts = await db
        .select({ staffId: timeEntries.staffId })
        .from(timeEntries)
        .where(and(inArray(timeEntries.staffId, [...new Set(rows.map((r) => r.sub.staffId))]), isNull(timeEntries.clockOut)));
      const devices = rows.map((r) => ({ ...r.sub, role: r.role, branchId: r.staffBranch, active: r.active }));
      const to = missedTalkRecipients(devices, clip, new Set(shifts.map((s) => s.staffId)), heardLive);
      await send(to, missedTalkPayload(clip));
    } catch (e) {
      console.error("Push failed", e);
    }
  });
}

// ——— The staff member's own devices (Staff > Account) ———

export type DeviceView = { id: string; endpoint: string; device: string; orders: boolean; messages: boolean; talk: boolean; onShiftOnly: boolean; added: string; lastSent: string | null };

// Dates are written here, in Manila time, so the page shows the same text on the server and the phone
const toView = (r: PushSubscriptionRow): DeviceView => ({
  id: r.id, endpoint: r.endpoint, device: r.device, orders: r.orders, messages: r.messages, talk: r.talk, onShiftOnly: r.onShiftOnly,
  added: manila.date(r.createdAt), lastSent: r.lastSentAt ? `${manila.date(r.lastSentAt)}, ${manila.time(r.lastSentAt)}` : null,
});

export async function myDevices(me: Staff): Promise<DeviceView[]> {
  const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.staffId, me.id)).orderBy(desc(pushSubscriptions.createdAt));
  return rows.map(toView);
}

export type SubscriptionInput = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

function readSubscription(input: SubscriptionInput): { endpoint: string; p256dh: string; auth: string } | null {
  const endpoint = String(input?.endpoint ?? "");
  const p256dh = String(input?.keys?.p256dh ?? "");
  const auth = String(input?.keys?.auth ?? "");
  const key = /^[A-Za-z0-9_-]{8,200}={0,2}$/;
  let https = false;
  try {
    https = new URL(endpoint).protocol === "https:";
  } catch {}
  return https && endpoint.length <= 1000 && key.test(p256dh) && key.test(auth) ? { endpoint, p256dh, auth } : null;
}

/** This device now gets notifications. A device that changes hands starts with the new person's defaults. */
export async function saveSubscription(me: Staff, input: SubscriptionInput, userAgent: string): Promise<{ ok: true } | Fail> {
  if (!pushConfigured) return { ok: false, error: "Notifications aren't set up on this site yet." };
  const sub = readSubscription(input);
  if (!sub) return { ok: false, error: "This browser gave an unusual subscription. Try again, or use Chrome or Safari." };
  const [existing] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint)).limit(1);
  const device = deviceName(userAgent);
  if (existing?.staffId === me.id) {
    await db.update(pushSubscriptions).set({ p256dh: sub.p256dh, auth: sub.auth, device }).where(eq(pushSubscriptions.id, existing.id));
  } else {
    if (existing) await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, existing.id));
    await db.insert(pushSubscriptions).values({ staffId: me.id, ...sub, device, onShiftOnly: defaultOnShiftOnly(me.role) });
  }
  return { ok: true };
}

/** Browsers can renew a subscription's keys; this keeps ours current without re-adding a removed device */
export async function refreshSubscription(me: Staff, input: SubscriptionInput) {
  const sub = readSubscription(input);
  if (!sub) return;
  await db
    .update(pushSubscriptions)
    .set({ p256dh: sub.p256dh, auth: sub.auth })
    .where(and(eq(pushSubscriptions.endpoint, sub.endpoint), eq(pushSubscriptions.staffId, me.id)));
}

export async function updatePrefs(me: Staff, id: string, prefs: { orders: boolean; messages: boolean; talk: boolean; onShiftOnly: boolean }) {
  await db
    .update(pushSubscriptions)
    .set({ orders: prefs.orders === true, messages: prefs.messages === true, talk: prefs.talk === true, onShiftOnly: prefs.onShiftOnly === true })
    .where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.staffId, me.id)));
}

export async function removeDevice(me: Staff, by: { id?: string; endpoint?: string }) {
  const which = by.id ? eq(pushSubscriptions.id, by.id) : eq(pushSubscriptions.endpoint, String(by.endpoint ?? ""));
  await db.delete(pushSubscriptions).where(and(which, eq(pushSubscriptions.staffId, me.id)));
}

/** "Send a test": straight to this one device, so staff can see what an alert looks like */
export async function sendTest(me: Staff, id: string): Promise<{ ok: true } | Fail> {
  const [row] = await db.select().from(pushSubscriptions).where(and(eq(pushSubscriptions.id, id), eq(pushSubscriptions.staffId, me.id))).limit(1);
  if (!row) return { ok: false, error: "This device isn't set up for notifications any more. Turn them on again." };
  const { sent } = await send([row], {
    kind: "test", title: "Notifications are on", body: "New orders, payments to check and customer messages will show up like this.", url: "/staff/orders", tag: "test",
  });
  return sent ? { ok: true } : { ok: false, error: "The test didn't go through. Turn notifications off and on again on this device." };
}
