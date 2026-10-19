"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useWakeLock } from "@/components/useWakeLock";
import type { ClipView } from "@/lib/talk";
import { channelsLabel, nameList, shortBranch } from "@/lib/talk-rules";
import ClipList from "./ClipList";
import HoldButton, { talkerOf, useTalk } from "./HoldButton";
import { STAFF_TALK, rememberTalk, savedBranches, storedBranches } from "./TalkDock";

const noSubscribe = () => () => {};

type Props = { admin: boolean; branchIds: string[]; clips: ClipView[] };

/** Staff > Talk: the big button, who's on, and the recent talk */
export default function TalkScreen({ admin, branchIds, clips }: Props) {
  const router = useRouter();
  const { engine, snap } = useTalk(STAFF_TALK);
  const screen = useWakeLock();
  const on = snap.phase !== "off";
  const talker = talkerOf(snap);
  const others = snap.people.filter((p) => !p.me);
  // The owner's last choice of branches, remembered on this device (read after the page loads)
  const stored = useSyncExternalStore(noSubscribe, storedBranches, () => null);
  const [choice, setChoice] = useState<string[] | null>(null);
  const picked = choice ?? savedBranches(branchIds, stored);

  // Hold the space bar to talk on a computer (unless typing, or another button has focus)
  useEffect(() => {
    if (snap.phase !== "on") return;
    const free = (t: EventTarget | null) => !(t instanceof HTMLElement) || t === document.body || t.classList.contains("talk-hold");
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat || !free(e.target)) return;
      e.preventDefault();
      engine.press();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !free(e.target)) return;
      e.preventDefault();
      engine.release();
    };
    addEventListener("keydown", down);
    addEventListener("keyup", up);
    return () => {
      removeEventListener("keydown", down);
      removeEventListener("keyup", up);
    };
  }, [engine, snap.phase]);

  const turnOn = () => {
    rememberTalk(true);
    engine.start(admin ? picked : undefined);
  };
  const turnOff = () => {
    rememberTalk(false);
    engine.stop();
  };
  const pick = (ids: string[]) => {
    setChoice(ids);
    try {
      localStorage.setItem("em-talk-branches", ids.join(","));
    } catch {}
    if (on) engine.setChannels(ids);
  };

  const status =
    snap.press === "on" ? "You’re on air"
    : talker ? `${talker.name} is talking`
    : snap.phase === "joining" ? (snap.error ?? "Connecting…")
    : snap.connected ? `Listening · ${channelsLabel(snap.channels)}`
    : "Connecting the sound…";

  return (
    <div className="talk">
      <section className={`staff-card talk-stage ${on ? "is-on" : ""}`} aria-label="Talk">
        {!on ? (
          <div className="talk-off">
            <h2>Talk is off on this device</h2>
            <p className="staff-help">
              Turn it on to hear {admin ? "the team" : "the owner and the team"} live and talk back. It stays on while you move around the staff app
              {admin ? "." : ", and turns off when you clock out."}
            </p>
            {snap.error && <p className="staff-note is-warn">{snap.error}</p>}
            {admin && branchIds.length > 1 && <BranchPick ids={branchIds} value={picked} onPick={pick} />}
            <button type="button" className="staff-btn is-primary is-big" onClick={turnOn}>Turn on Talk</button>
          </div>
        ) : (
          <>
            <p className={`talk-status ${snap.press === "on" ? "is-air" : talker ? "is-live" : ""}`} role="status" aria-live="polite">
              {talker && <span className="talk-wave" aria-hidden="true"><i /><i /><i /></span>}
              {status}
            </p>
            <HoldButton engine={engine} snap={snap} variant="big" />
            <p className="talk-hint">
              Hold to talk, let go to send. Each press can last a minute.<span className="talk-hint-keys"> On a computer, hold the space bar.</span>
            </p>
            {snap.micError && <p className="staff-msg is-error" role="alert">{snap.micError}</p>}
            {snap.needsTap && (
              <button type="button" className="staff-btn is-primary" onClick={() => engine.unlock()}>Tap to turn on the sound</button>
            )}
            {admin && branchIds.length > 1 && <BranchPick ids={branchIds} value={snap.channels} onPick={pick} />}
            <div className="talk-tools">
              {screen.supported && (
                <label className="staff-check">
                  <input type="checkbox" checked={screen.awake} onChange={screen.toggle} /> Keep the screen on
                </label>
              )}
              <button type="button" className="staff-btn is-quiet is-small" onClick={turnOff}>Turn off Talk</button>
            </div>
          </>
        )}
      </section>

      <div className="talk-side">
        {on && (
          <section className="staff-card talk-people" aria-label="On Talk now">
            <h2>On Talk now</h2>
            {others.length === 0 ? (
              <p className="staff-empty">No one else yet. They&rsquo;ll hear you once they turn on Talk.</p>
            ) : (
              <ul>
                {others.map((p) => (
                  <li key={p.sessionId} className={talker?.sessionId === p.sessionId ? "is-talking" : ""}>
                    {p.name}
                    {/* The counter's name already says its branch */}
                    {admin && snap.channels.length > 1 && !p.name.startsWith("Counter") && <small>{p.branches.map(shortBranch).join(", ")}</small>}
                  </li>
                ))}
              </ul>
            )}
            {others.length > 0 && <p className="sr-only">Listening: {nameList(others.map((p) => p.name))}</p>}
          </section>
        )}
        <section className="staff-card" aria-label="Recent talk">
          <h2>Recent talk</h2>
          <p className="staff-help">Each press is kept for 7 days, so people who weren&rsquo;t listening can play it.</p>
          <ClipList clips={on ? snap.clips : clips} showBranch={admin} onHeard={() => (on ? engine.refresh() : router.refresh())} />
        </section>
      </div>
    </div>
  );
}

/** The owner chooses who hears them: one branch or both */
function BranchPick({ ids, value, onPick }: { ids: string[]; value: string[]; onPick: (ids: string[]) => void }) {
  const options = [...ids.map((id) => ({ label: shortBranch(id), ids: [id] })), { label: "Both", ids }];
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  return (
    <fieldset className="talk-pick">
      <legend>Talk with</legend>
      <div className="seg">
        {options.map((o) => (
          <label key={o.label}>
            <input type="radio" name="talk-branches" checked={same(o.ids, value)} onChange={() => onPick(o.ids)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
