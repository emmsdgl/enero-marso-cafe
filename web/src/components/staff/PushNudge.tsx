"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { isIos, isStandalone, pushSupported, registration } from "@/lib/push-client";

const noSubscribe = () => () => {};

/** On the board: a one-line reminder for a device that could get notifications but doesn't yet */
export default function PushNudge({ configured }: { configured: boolean }) {
  const supported = useSyncExternalStore(noSubscribe, pushSupported, () => false);
  const iosBrowser = useSyncExternalStore(noSubscribe, () => isIos() && !isStandalone(), () => false);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!supported || Notification.permission === "denied") return;
    registration()
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, [supported]);

  if (!configured) return null;
  if (iosBrowser) {
    return (
      <p className="staff-note push-nudge">
        Get new orders on this iPhone even with the board closed: <Link href="/staff/account#notifications">add the staff app to your home screen</Link>.
      </p>
    );
  }
  if (subscribed !== false) return null;
  return (
    <p className="staff-note push-nudge">
      Get new orders on this device even with the board closed: <Link href="/staff/account#notifications">turn on notifications</Link>.
    </p>
  );
}
