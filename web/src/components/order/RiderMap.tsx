"use client";

import { useEffect, useState } from "react";
import { riderSpotAction } from "@/app/order/actions";
import PinMap from "@/components/map/PinMap";
import type { LatLng } from "@/lib/delivery";
import type { SpotView } from "@/lib/rider-location";
import { SEND_EVERY_MS, spotLine } from "@/lib/rider-rules";

/**
 * Inside the customer's "On its way" card: where our rider is, asked for every 15 s while the page
 * is on screen, and how far they are from the delivery pin.
 */
export default function RiderMap({ code, token, destination }: { code: string; token: string; destination: LatLng }) {
  const [spot, setSpot] = useState<{ view: SpotView; at: number } | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let stop = false;
    let timer = 0;
    const ask = async () => {
      window.clearTimeout(timer);
      if (stop) return;
      if (document.visibilityState === "visible") {
        try {
          const view = await riderSpotAction(code, token);
          if (!stop) setSpot(view ? { view, at: Date.now() } : null);
        } catch {}
      }
      if (!stop) timer = window.setTimeout(ask, SEND_EVERY_MS);
    };
    ask();
    const back = () => document.visibilityState === "visible" && ask();
    document.addEventListener("visibilitychange", back);
    // "updated 12 s ago" keeps counting between checks
    const tick = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => {
      stop = true;
      window.clearTimeout(timer);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", back);
    };
  }, [code, token]);

  const age = spot ? spot.view.ageMs + Math.max(0, now - spot.at) : null;
  return (
    <div className="rider-map">
      <PinMap pin={destination} center={destination} rider={spot ? { lat: spot.view.lat, lng: spot.view.lng } : null} label="Your rider on the way to you" />
      <p className="rider-map-line" role="status">
        {spot && age !== null ? spotLine(spot.view, age, destination) : "Waiting for the rider’s location…"}
      </p>
    </div>
  );
}
