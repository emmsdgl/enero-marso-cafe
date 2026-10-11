"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { forgetPushDevice, savePushPrefs, subscribePush, testPush } from "@/app/staff/account/push-actions";
import type { DeviceView } from "@/lib/push";
import { canInstall, install, installSubscribe, isIos, isStandalone, keyBytes, pushSupported, registration, VAPID_PUBLIC_KEY } from "@/lib/push-client";

const noSubscribe = () => () => {};

/**
 * Staff > Account > Phone notifications: install the staff app, turn notifications on for this
 * device, choose what it rings for, test it, and remove old devices.
 */
export default function PushSetup({ devices, configured }: { devices: DeviceView[]; configured: boolean }) {
  const router = useRouter();
  const supported = useSyncExternalStore(noSubscribe, pushSupported, () => false);
  const ios = useSyncExternalStore(noSubscribe, isIos, () => false);
  const standalone = useSyncExternalStore(noSubscribe, isStandalone, () => false);
  const installable = useSyncExternalStore(installSubscribe, canInstall, () => false);
  const startPermission = useSyncExternalStore(noSubscribe, () => (pushSupported() ? Notification.permission : "default"), () => "default" as const);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const perm = permission ?? startPermission;

  // Which subscription (if any) this browser already has
  useEffect(() => {
    if (!supported) return;
    registration()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEndpoint(sub?.endpoint ?? ""))
      .catch(() => setEndpoint(""));
  }, [supported]);

  const here = devices.find((d) => d.endpoint === endpoint);
  const others = devices.filter((d) => d.endpoint !== endpoint);
  const status = !configured
    ? "not-configured"
    : !supported
      ? ios && !standalone ? "ios-install" : "unsupported"
      : perm === "denied"
        ? "denied"
        : endpoint === null
          ? "checking"
          : here ? "on" : "off";

  const turnOn = () =>
    start(async () => {
      setMessage(null);
      try {
        // Asked straight from the tap: iPhones only allow the question then
        const answer = await Notification.requestPermission();
        setPermission(answer);
        if (answer !== "granted") return;
        const reg = await registration();
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          try {
            sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
          } catch {
            // An old subscription made with different keys: start over
            await (await reg.pushManager.getSubscription())?.unsubscribe();
            sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
          }
        }
        const r = await subscribePush(sub.toJSON());
        if (r.error) return setMessage({ error: r.error });
        setEndpoint(sub.endpoint);
        setMessage({ ok: "Notifications are on for this device. Send a test to see one." });
        router.refresh();
      } catch {
        setMessage({
          error:
            "This device couldn't turn notifications on. Private or incognito windows can't get notifications, so use a normal window, and check that notifications are allowed for this site.",
        });
      }
    });

  const turnOff = () =>
    start(async () => {
      setMessage(null);
      const sub = await (await registration()).pushManager.getSubscription();
      await sub?.unsubscribe().catch(() => {});
      if (endpoint) await forgetPushDevice({ endpoint });
      setEndpoint("");
      setMessage({ ok: "Notifications are off for this device." });
    });

  const test = () =>
    start(async () => {
      setMessage(null);
      const r = here ? await testPush(here.id) : { error: "Turn notifications on first." };
      setMessage(r.error ? { error: r.error } : { ok: "Sent. It should appear in a few seconds, even if you leave this page." });
    });

  const setPref = (key: "orders" | "messages" | "onShiftOnly", value: boolean) =>
    here && start(async () => savePushPrefs(here.id, { orders: here.orders, messages: here.messages, onShiftOnly: here.onShiftOnly, [key]: value }));

  return (
    <div className="push-setup">
      <div className="push-install">
        {standalone ? (
          <p className="staff-note is-ok">You&rsquo;re using the installed staff app.</p>
        ) : installable ? (
          <>
            <p className="staff-help">Install the staff app: it opens straight to the orders, full screen, from your home screen.</p>
            <button type="button" className="staff-btn" onClick={() => install()}>Install the staff app</button>
          </>
        ) : ios ? (
          <ol className="push-steps">
            <li>In Safari, tap the <b>Share</b> button, then <b>Add to Home Screen</b>.</li>
            <li>Open <b>EM Staff</b> from your home screen and sign in there.</li>
            <li>Come back to this page in the app and turn on notifications.</li>
          </ol>
        ) : null}
      </div>

      {status === "not-configured" && <p className="staff-note is-warn">Notifications aren&rsquo;t set up on this site yet.</p>}
      {status === "ios-install" && (
        <p className="staff-note is-warn">On iPhone, notifications work in the installed staff app only (iOS 16.4 or later). Follow the steps above first.</p>
      )}
      {status === "unsupported" && <p className="staff-note is-warn">This browser can&rsquo;t show notifications. Use Chrome on Android, or the installed app on iPhone.</p>}
      {status === "denied" && (
        <p className="staff-note is-warn">
          Notifications are blocked for this site. Allow them in your browser or phone settings (Site settings &gt; Notifications), then reload this page.
        </p>
      )}
      {status === "off" && (
        <>
          <p className="staff-help">Get new orders, payments to check and customer messages on this device, even when the board is closed.</p>
          <button type="button" className="staff-btn is-primary" onClick={turnOn} disabled={pending}>{pending ? "Turning on…" : "Turn on notifications"}</button>
        </>
      )}
      {status === "on" && here && (
        <div className="push-on">
          <p className="staff-note is-ok">Notifications are on for this device ({here.device}).</p>
          <fieldset className="push-prefs" disabled={pending}>
            <legend>Ring for</legend>
            <label className="staff-check"><input type="checkbox" checked={here.orders} onChange={(e) => setPref("orders", e.target.checked)} /> New orders and payments to check</label>
            <label className="staff-check"><input type="checkbox" checked={here.messages} onChange={(e) => setPref("messages", e.target.checked)} /> Customer messages</label>
            <label className="staff-check"><input type="checkbox" checked={here.onShiftOnly} onChange={(e) => setPref("onShiftOnly", e.target.checked)} /> Only while I&rsquo;m clocked in</label>
          </fieldset>
          <div className="staff-form-foot">
            <button type="button" className="staff-btn" onClick={test} disabled={pending}>Send a test</button>
            <button type="button" className="staff-btn is-quiet" onClick={turnOff} disabled={pending}>Turn off on this device</button>
          </div>
        </div>
      )}
      {message && <p className={`staff-msg ${message.error ? "is-error" : "is-ok"}`} role="status">{message.error ?? message.ok}</p>}

      {others.length > 0 && (
        <div className="push-devices">
          <h3>Your other devices</h3>
          <ul className="setup-list">
            {others.map((d) => (
              <li key={d.id}>
                <span>
                  <b>{d.device}</b>
                  <small>Added {d.added}{d.lastSent ? ` · last notified ${d.lastSent}` : ""}</small>
                </span>
                <button type="button" className="staff-btn is-small is-quiet" disabled={pending} onClick={() => start(() => forgetPushDevice({ id: d.id }))}>Remove</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
