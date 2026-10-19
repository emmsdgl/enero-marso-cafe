"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const noSubscribe = () => () => {};

/**
 * Keeps the screen from sleeping while it's on (the Orders board, Talk, the counter tablet). Browsers
 * drop the lock when the page is hidden, so it's taken again whenever the page comes back.
 */
export function useWakeLock(startOn = false) {
  const lock = useRef<WakeLockSentinel | null>(null);
  const supported = useSyncExternalStore(noSubscribe, () => "wakeLock" in navigator, () => false);
  const [awake, setAwake] = useState(startOn);
  useEffect(() => {
    if (!awake || !supported) {
      lock.current?.release().catch(() => {});
      lock.current = null;
      return;
    }
    const grab = () => navigator.wakeLock.request("screen").then((l) => { lock.current = l; }).catch(() => !startOn && setAwake(false));
    grab();
    const again = () => document.visibilityState === "visible" && grab();
    document.addEventListener("visibilitychange", again);
    // A tablet that refused without a tap gets it on the next tap
    if (startOn) document.addEventListener("pointerdown", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      document.removeEventListener("pointerdown", again);
    };
  }, [awake, supported, startOn]);
  return { supported, awake, toggle: () => setAwake((a) => !a) };
}
