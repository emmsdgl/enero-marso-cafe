"use client";

import { useState } from "react";
import PinMap from "@/components/map/PinMap";
import type { LatLng } from "@/lib/delivery";

// Taguig, for a branch that has no pin yet
const TAGUIG = { lat: 14.5176, lng: 121.0509 };

/** The branch's pin on Staff > Branch: drag it, tap the map, or stand in the cafe and use your location */
export default function StorePinField({ initial, freeRadius }: { initial: LatLng | null; freeRadius: number }) {
  const [pin, setPin] = useState<LatLng | null>(initial);
  return (
    <div className="store-pin">
      <PinMap pin={pin} onPin={setPin} center={initial ?? TAGUIG} store={null} freeRadius={freeRadius} label="Branch location" locateLabel="I'm at the branch: use my location" />
      <input type="hidden" name="lat" value={pin?.lat ?? ""} />
      <input type="hidden" name="lng" value={pin?.lng ?? ""} />
      <small className="staff-help">{pin ? `Pin at ${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}` : "No pin yet."}</small>
    </div>
  );
}
