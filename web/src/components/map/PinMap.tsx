"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { circleRing, formatDistance, type LatLng } from "@/lib/delivery";

/**
 * OpenFreeMap's street map (OpenStreetMap data): free, with no key, account or usage limit.
 * The pin's coordinates are what matter; staff still open them in Google Maps with a plain link.
 */
const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

// The cafe's brown pin with a cream dot, tip at the bottom
const PIN_SVG =
  '<svg viewBox="0 0 30 40" width="30" height="40" aria-hidden="true"><path d="M15 1C7.3 1 1 7.1 1 14.8 1 25.4 15 39 15 39s14-13.6 14-24.2C29 7.1 22.7 1 15 1z" fill="#834a22" stroke="#faf1e1" stroke-width="2"/><circle cx="15" cy="15" r="5.5" fill="#faf1e1"/></svg>';

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
 * A map with one pin: drag it, tap the map to move it, or use the phone's location. If the map
 * can't load (no WebGL, tiles down), the location button still works on its own.
 */
export default function PinMap({ pin, onPin, center, store, freeRadius = 0, label, locateLabel = "Use my location" }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const placed = useRef(false);
  const setPin = useRef(onPin);
  useEffect(() => {
    setPin.current = onPin;
  });
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const editable = Boolean(onPin);
  const start = pin ?? center;

  // Build the map once; later pin changes move the marker below
  useEffect(() => {
    let cancelled = false;
    let built: MapLibreMap | null = null;
    let giveUp = 0;
    import("maplibre-gl")
      .then(({ default: maplibregl }) => {
        if (cancelled || !box.current) return;
        const m = new maplibregl.Map({
          container: box.current,
          style: MAP_STYLE,
          center: [start.lng, start.lat],
          zoom: 16,
          attributionControl: { compact: true },
          // On a page you scroll, a look-only map needs two fingers to pan
          cooperativeGestures: !editable,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
        });
        built = m;
        m.touchZoomRotate.disableRotation();
        m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
        // A map that hasn't drawn within 20 seconds isn't coming: offer the location button instead
        giveUp = window.setTimeout(() => !cancelled && !m.loaded() && setState("failed"), 20_000);
        m.on("error", () => {
          if (!m.isStyleLoaded()) setState("failed");
        });
        m.on("load", () => {
          window.clearTimeout(giveUp);
          if (store && freeRadius > 0) {
            m.addSource("free-area", {
              type: "geojson",
              data: { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [circleRing(store, freeRadius)] } },
            });
            m.addLayer({ id: "free-area-fill", type: "fill", source: "free-area", paint: { "fill-color": "#cf9d57", "fill-opacity": 0.14 } });
            m.addLayer({ id: "free-area-line", type: "line", source: "free-area", paint: { "line-color": "#834a22", "line-opacity": 0.6, "line-width": 1.5 } });
          }
          setState("ready");
        });

        if (store) {
          const badge = document.createElement("div");
          badge.className = "pin-map-store";
          badge.textContent = "EM";
          badge.title = "The cafe";
          new maplibregl.Marker({ element: badge }).setLngLat([store.lng, store.lat]).addTo(m);
        }
        const dot = document.createElement("div");
        dot.className = "pin-map-pin";
        dot.innerHTML = PIN_SVG;
        const mk = new maplibregl.Marker({ element: dot, anchor: "bottom", draggable: editable }).setLngLat([start.lng, start.lat]);
        if (pin) {
          mk.addTo(m);
          placed.current = true;
        }
        if (editable) {
          mk.on("dragend", () => {
            const p = mk.getLngLat();
            setPin.current?.({ lat: p.lat, lng: p.lng });
          });
          m.on("click", (e) => setPin.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
        }
        map.current = m;
        marker.current = mk;
      })
      .catch(() => !cancelled && setState("failed"));
    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      built?.remove();
      map.current = null;
      marker.current = null;
      placed.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the pin when it changes from outside (location button, a tap on the map)
  useEffect(() => {
    const m = map.current;
    const mk = marker.current;
    if (!m || !mk || !pin) return;
    mk.setLngLat([pin.lng, pin.lat]);
    if (!placed.current) {
      mk.addTo(m);
      placed.current = true;
    }
    if (!m.getBounds().contains([pin.lng, pin.lat])) m.panTo([pin.lng, pin.lat]);
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
        map.current?.easeTo({ center: [p.lng, p.lat], zoom: 17 });
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
