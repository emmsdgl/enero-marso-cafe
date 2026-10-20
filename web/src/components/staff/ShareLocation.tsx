"use client";

import { useEffect, useRef, useState } from "react";
import { saveSpotAction } from "@/app/staff/orders/actions";
import { useWakeLock } from "@/components/useWakeLock";
import { SEND_EVERY_MS, shouldSend } from "@/lib/rider-rules";

const timeOf = (ms: number) => new Date(ms).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit", second: "2-digit" });

/**
 * On the rider's screen while a delivery is on its way: the phone's position goes to the customer's
 * page about every 15 s (also while standing still, so they don't look "paused"), and the screen
 * stays on. Phones stop sharing when the screen locks, so it says to keep it open.
 */
export default function ShareLocation() {
  useWakeLock(true);
  const latest = useRef<{ lat: number; lng: number; accuracy: number } | null>(null);
  const last = useRef<{ at: number; lat: number; lng: number } | null>(null);
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      queueMicrotask(() => setProblem("This browser can't share its location."));
      return;
    }
    let stopped = false;
    const send = (force: boolean) => {
      const p = latest.current;
      const now = Date.now();
      if (!p || stopped || (!force && !shouldSend(last.current, p, now))) return;
      last.current = { at: now, lat: p.lat, lng: p.lng };
      saveSpotAction(p)
        .then((r) => {
          if (stopped) return;
          if (r.error) setProblem(r.error);
          else {
            setProblem(null);
            if (r.saved) setSentAt(now);
          }
        })
        .catch(() => {});
    };
    const watch = navigator.geolocation.watchPosition(
      (pos) => {
        latest.current = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        send(false);
      },
      (err) =>
        setProblem(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked for this site. Allow it in your browser's site settings, so the customer can see you coming."
            : "Can't find your location just now. Keep this screen open: it keeps trying.",
        ),
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 30_000 },
    );
    // Standing still, the phone reports nothing new: send the last position again
    const beat = window.setInterval(() => last.current && Date.now() - last.current.at >= SEND_EVERY_MS && send(true), 5_000);
    return () => {
      stopped = true;
      navigator.geolocation.clearWatch(watch);
      window.clearInterval(beat);
    };
  }, []);

  return (
    <section className={`share-location${problem ? " is-off" : ""}`} aria-live="polite">
      <p>
        <span className="dot is-on" aria-hidden="true" />
        <b>{problem ? "Location not shared" : "Sharing your location with the customer"}</b>
      </p>
      <small>{problem ?? (sentAt ? `Last sent ${timeOf(sentAt)}. Keep this screen open: on an iPhone, a locked screen pauses it.` : "Finding your location…")}</small>
    </section>
  );
}
