"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Keeps a server-rendered page current. With Pusher keys set, a ping on any of the channels
 * refreshes the page at once (and a slow check runs as a safety net); without them, or while
 * the live connection is down, the page checks every 20 seconds. Hidden tabs don't check.
 */
export default function LiveRefresh({ channels }: { channels: string[] }) {
  const router = useRouter();
  const names = channels.join("|");

  useEffect(() => {
    let stopped = false;
    let poll = 0;
    const refresh = () => { if (!stopped && document.visibilityState === "visible") router.refresh(); };
    const every = (seconds: number) => { window.clearInterval(poll); poll = window.setInterval(refresh, seconds * 1000); };
    every(20);

    let disconnect = () => {};
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (key && cluster) {
      import("pusher-js").then(({ default: Pusher }) => {
        if (stopped) return;
        const p = new Pusher(key, { cluster });
        for (const name of names.split("|")) p.subscribe(name).bind("changed", refresh);
        p.connection.bind("state_change", ({ current }: { current: string }) => every(current === "connected" ? 60 : 20));
        disconnect = () => p.disconnect();
      });
    }

    const onVisible = () => refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      disconnect();
    };
  }, [names, router]);

  return null;
}
