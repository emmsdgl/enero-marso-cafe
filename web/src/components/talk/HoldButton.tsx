"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { MicIcon } from "@/components/Icons";
import { TALK_MAX_MS, clipLength } from "@/lib/talk-rules";
import { TalkEngine, talkEngine, type Snapshot } from "./engine";

/** The engine for this page app, and its current state */
export function useTalk(base: string) {
  const engine = talkEngine(base);
  const snap = useSyncExternalStore(engine.subscribe, engine.getSnapshot, () => TalkEngine.initial);
  return { engine, snap };
}

/** How long this press has been on air, updated a few times a second */
function useElapsed(since: number | null) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (since === null) return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [since]);
  return since === null ? 0 : Math.max(0, now - since);
}

/** Someone else talking on my channels now (the floor, on this device's clock) */
export function talkerOf(snap: Snapshot) {
  const now = Date.now();
  const mine = new Set(snap.people.filter((p) => p.me).map((p) => p.sessionId));
  return snap.floor.find((f) => f.until > now && !mine.has(f.sessionId)) ?? null;
}

/**
 * Hold to talk: press and hold (finger, mouse, or Space/Enter when focused), let go to stop.
 * The pointer is captured, so sliding a finger off the button doesn't cut the talk short.
 */
export default function HoldButton({ engine, snap, variant }: { engine: TalkEngine; snap: Snapshot; variant: "big" | "dock" | "kiosk" }) {
  const onAir = snap.press === "on";
  const talker = talkerOf(snap);
  const elapsed = useElapsed(onAir ? snap.onAirSince : null);
  const left = Math.max(0, Math.ceil((TALK_MAX_MS - elapsed) / 1000));
  const ready = snap.phase === "on";

  const label =
    snap.press === "on" ? (left <= 10 ? `${left} s left` : `Talking ${clipLength(elapsed)}`)
    : snap.press === "starting" ? "One moment…"
    : snap.press === "busy" ? `${snap.busyBy} is talking`
    : talker ? `${talker.name} is talking`
    : !ready ? "Connecting…"
    : "Hold to talk";

  return (
    <button
      type="button"
      className={`talk-hold is-${variant}`}
      data-state={snap.press === "idle" && talker ? "taken" : snap.press}
      disabled={!ready}
      aria-label={variant === "dock" ? `${label}. Hold to talk.` : undefined}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        engine.press();
      }}
      onPointerUp={() => engine.release()}
      onPointerCancel={() => engine.release()}
      onLostPointerCapture={() => engine.release()}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          engine.press();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          engine.release();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MicIcon className="talk-hold-icon" />
      {variant !== "dock" && <span className="talk-hold-label">{label}</span>}
      {variant === "big" && onAir && <span className="talk-hold-sub">Let go to send</span>}
    </button>
  );
}
