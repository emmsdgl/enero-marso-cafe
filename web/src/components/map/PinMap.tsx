"use client";

import { useEffect, useRef, useState } from "react";
import { formatDistance, type LatLng } from "@/lib/delivery";
import { loadGoogleMaps, MAP_ID, mapsConfigured, whenMapsRefused } from "@/lib/google-maps";

type Props = {
  /** The pin; null until the customer (or manager) sets one */
  pin: LatLng | null;
  /** Leave out for a map you can only look at */
  onPin?: (p: LatLng) => void;
  /** Where the map opens when there's no pin yet */
  center: LatLng;
  /** The branch, drawn as the cafe's mark */
  store?: LatLng | null;
  /** Free delivery area around the branch, in meters */
  freeRadius?: number;
  label: string;
  /** What "use my location" is for, e.g. "Use my location" or "I'm at the branch now" */
  locateLabel?: string;
};

/**
 * A map with one pin: drag it, tap the map to move it, or use the phone's location (free, no
 * Google needed). If Google Maps can't load, the location button still works on its own.
 */
export default function PinMap({ pin, onPin, center, store, freeRadius = 0, label, locateLabel = "Use my location" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const setPin = useRef(onPin);
  useEffect(() => {
    setPin.current = onPin;
  });
  const [state, setState] = useState<"loading" | "ready" | "failed">(mapsConfigured ? "loading" : "failed");
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const editable = Boolean(onPin);
  const start = pin ?? center;

  // Build the map once
  useEffect(() => {
    if (!mapsConfigured) return;
    let cancelled = false;
    const stopListening = whenMapsRefused(() => setState("failed"));
    loadGoogleMaps()
      .then(async () => {
        const [{ Map, Circle }, { AdvancedMarkerElement }] = await Promise.all([
          google.maps.importLibrary("maps") as Promise<google.maps.MapsLibrary>,
          google.maps.importLibrary("marker") as Promise<google.maps.MarkerLibrary>,
        ]);
        if (cancelled || !box.current) return;
        const m = new Map(box.current, {
          center: start, zoom: 16, mapId: MAP_ID, disableDefaultUI: true, zoomControl: true, clickableIcons: false,
          gestureHandling: editable ? "greedy" : "cooperative",
        });
        if (store) {
          const badge = document.createElement("div");
          badge.className = "pin-map-store";
          badge.textContent = "EM";
          badge.title = "The cafe";
          new AdvancedMarkerElement({ map: m, position: store, content: badge, title: "The cafe" });
          if (freeRadius > 0) {
            new Circle({ map: m, center: store, radius: freeRadius, clickable: false, strokeColor: "#834a22", strokeOpacity: 0.6, strokeWeight: 1.5, fillColor: "#cf9d57", fillOpacity: 0.14 });
          }
        }
        const mk = new AdvancedMarkerElement({ map: pin ? m : null, position: start, gmpDraggable: editable, title: label });
        if (editable) {
          mk.addListener("dragend", () => {
            const p = mk.position as google.maps.LatLngLiteral | null;
            if (p) setPin.current?.({ lat: Number(p.lat), lng: Number(p.lng) });
          });
          m.addListener("click", (e: google.maps.MapMouseEvent) => {
            if (e.latLng) setPin.current?.({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          });
        }
        map.current = m;
        marker.current = mk;
        setState("ready");
      })
      .catch(() => !cancelled && setState("failed"));
    return () => {
      cancelled = true;
      stopListening();
    };
    // The map is built once; later pin changes move the marker below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the pin when it changes from outside (location button, a typed fix)
  useEffect(() => {
    const m = map.current;
    const mk = marker.current;
    if (!m || !mk || !pin) return;
    mk.position = pin;
    if (!mk.map) mk.map = m;
    if (!m.getBounds()?.contains(pin)) m.panTo(pin);
  }, [pin, state]);

  const locate = () => {
    if (!("geolocation" in navigator)) return setNote("This browser can't share its location. Tap the map instead.");
    setLocating(true);
    setNote(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onPin?.(p);
        map.current?.panTo(p);
        map.current?.setZoom(17);
        setNote(`Found within about ${formatDistance(pos.coords.accuracy)}.${state === "ready" ? " Drag the pin if it's off." : ""}`);
      },
      (err) => {
        setLocating(false);
        setNote(
          err.code === err.PERMISSION_DENIED
            ? "Location is blocked for this site. Allow it in your browser settings, or tap the map instead."
            : "We couldn't find your location just now. Try again, or tap the map instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  };

  return (
    <div className={`pin-map is-${state}`}>
      {state !== "failed" ? (
        <div ref={box} className="pin-map-canvas" role="application" aria-label={label} />
      ) : (
        <p className="pin-map-off">
          {editable
            ? "The map isn't available right now. Use your location below; it gives us your exact spot."
            : "The map isn't available right now. Open the pin in Google Maps instead."}
        </p>
      )}
      {editable && (
        <div className="pin-map-tools">
          <button type="button" className="pin-map-locate" onClick={locate} disabled={locating}>
            {locating ? "Finding you…" : locateLabel}
          </button>
          {note ? <small role="status">{note}</small> : state === "ready" && !pin && <small>Or tap the map where it should go.</small>}
        </div>
      )}
    </div>
  );
}
