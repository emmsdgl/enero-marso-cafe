"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { CloseIcon, MicIcon } from "@/components/Icons";
import HoldButton, { talkerOf, useTalk } from "./HoldButton";

export const STAFF_TALK = "/staff/talk/api";
const noSubscribe = () => () => {};

/** Whether Talk was on on this device, so after a reload it offers to come back on (sound needs a tap) */
export function rememberTalk(on: boolean) {
  try {
    if (on) localStorage.setItem("em-talk-on", "1");
    else localStorage.removeItem("em-talk-on");
  } catch {}
}
const wasOn = () => {
  try {
    return localStorage.getItem("em-talk-on") === "1";
  } catch {
    return false;
  }
};

/** The branches the owner last chose to talk with on this device */
export function storedBranches() {
  try {
    return localStorage.getItem("em-talk-branches");
  } catch {
    return null;
  }
}
export function savedBranches(ids: string[], stored = storedBranches()) {
  const list = (stored ?? "").split(",").filter((x) => ids.includes(x));
  return list.length ? list : ids;
}

/**
 * Talk on every staff screen once it's on: a hold-to-talk button in the corner, and who's talking.
 * Hidden on the Talk screen itself, which has the big button.
 */
export default function TalkDock({ member, admin, branchIds }: { member: boolean; admin: boolean; branchIds: string[] }) {
  const path = usePathname();
  const { engine, snap } = useTalk(STAFF_TALK);
  const remembered = useSyncExternalStore(noSubscribe, wasOn, () => false);
  const [dismissed, setDismissed] = useState(false);
  if (!member || path.startsWith("/staff/talk")) return null;

  if (snap.phase === "off") {
    if (!remembered || dismissed) return null;
    return (
      <div className="talk-dock is-off" role="region" aria-label="Talk">
        <button type="button" className="talk-dock-resume" onClick={() => engine.start(admin ? savedBranches(branchIds) : undefined)}>
          <MicIcon /> {snap.error ?? "Talk is off"} <b>Turn on</b>
        </button>
        <button type="button" className="talk-dock-close" aria-label="Hide" onClick={() => { rememberTalk(false); setDismissed(true); }}>
          <CloseIcon />
        </button>
      </div>
    );
  }

  const talker = talkerOf(snap);
  const status =
    snap.press === "on" ? "You’re on air"
    : talker ? `${talker.name} is talking`
    : snap.phase === "joining" ? "Connecting…"
    : "Talk";
  return (
    <div className="talk-dock" data-live={talker ? "" : undefined} role="region" aria-label="Talk">
      {snap.needsTap ? (
        <button type="button" className="talk-dock-status is-tap" onClick={() => engine.unlock()}>Tap to turn on the sound</button>
      ) : (
        <Link href="/staff/talk" className="talk-dock-status" aria-live="polite">
          {talker && <span className="talk-wave" aria-hidden="true"><i /><i /><i /></span>}
          {status}
        </Link>
      )}
      <HoldButton engine={engine} snap={snap} variant="dock" />
    </div>
  );
}
