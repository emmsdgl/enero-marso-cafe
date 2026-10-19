"use client";

import { useEffect } from "react";
import { MicIcon } from "@/components/Icons";
import { nameList } from "@/lib/talk-rules";
import HoldButton, { talkerOf, useTalk } from "./HoldButton";

/**
 * The counter tablet as Talk's base station: always listening to its branch, with its own button for
 * whoever is at the counter. Browsers won't play sound until someone taps after a restart, so it asks.
 */
export default function KioskTalk() {
  const { engine, snap } = useTalk("/kiosk/talk");
  useEffect(() => {
    engine.start();
  }, [engine]);

  const talker = talkerOf(snap);
  const others = snap.people.filter((p) => !p.me).map((p) => p.name);
  const waiting = snap.phase === "off" || snap.needsTap;
  const status =
    snap.phase === "off" ? (snap.error ?? "Talk is off")
    : snap.press === "on" ? "You’re on air"
    : talker ? `${talker.name} is talking`
    : snap.phase === "joining" ? "Connecting…"
    : others.length ? `On Talk: ${nameList(others)}`
    : "No one else is on Talk right now";

  return (
    <section className="kiosk-talk" aria-label="Talk">
      <p className={`kiosk-talk-status ${talker ? "is-live" : ""}`} role="status" aria-live="polite">
        <b>Talk</b>
        <span>
          {talker && <span className="talk-wave" aria-hidden="true"><i /><i /><i /></span>}
          {status}
        </span>
      </p>
      {waiting ? (
        <button type="button" className="kiosk-talk-tap" onClick={() => engine.start()}>
          <MicIcon /> Tap to turn on Talk sound
        </button>
      ) : (
        <HoldButton engine={engine} snap={snap} variant="kiosk" />
      )}
      {snap.micError && <p className="kiosk-error" role="alert">{snap.micError}</p>}
    </section>
  );
}
