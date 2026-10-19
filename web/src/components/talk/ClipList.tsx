"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/Icons";
import type { ClipView } from "@/lib/talk";
import { clipLength, nameList, shortBranch } from "@/lib/talk-rules";

const zone = { timeZone: "Asia/Manila" } as const;
function when(iso: string) {
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("en-PH", zone);
  const time = d.toLocaleTimeString("en-PH", { ...zone, hour: "numeric", minute: "2-digit" });
  if (day(d) === day(new Date())) return time;
  return `${d.toLocaleDateString("en-PH", { ...zone, weekday: "short", month: "short", day: "numeric" })}, ${time}`;
}

/**
 * Each press kept for 7 days. Playing one marks it heard; a "missed talk" notification opens the
 * page at its clip (#clip-…), which is highlighted.
 */
export default function ClipList({ clips, showBranch, onHeard }: { clips: ClipView[]; showBranch: boolean; onHeard: () => void }) {
  const audio = useRef<HTMLAudioElement>(null);
  const url = useRef<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const read = () => setTarget(location.hash.startsWith("#clip-") ? location.hash.slice(6) : null);
    read();
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);
  useEffect(() => {
    if (target) document.getElementById(`clip-${target}`)?.scrollIntoView({ block: "center" });
  }, [target, clips.length]);
  useEffect(() => () => { if (url.current) URL.revokeObjectURL(url.current); }, []);

  const play = async (clip: ClipView) => {
    const el = audio.current!;
    if (playing === clip.id) {
      el.pause();
      return setPlaying(null);
    }
    el.pause();
    setFailed(null);
    setLoading(clip.id);
    try {
      // Fetched whole, then played: works the same in every browser, without streaming support
      const res = await fetch(`/staff/talk/clips/${clip.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error();
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = URL.createObjectURL(await res.blob());
      el.src = url.current;
      await el.play();
      setPlaying(clip.id);
      if (!clip.heard && !clip.mine) {
        await fetch("/staff/talk/api", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "heard", clipId: clip.id }) });
        onHeard();
      }
    } catch {
      setFailed(clip.id);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <audio ref={audio} onEnded={() => setPlaying(null)} onPause={() => setPlaying(null)} playsInline hidden />
      {clips.length === 0 ? (
        <p className="staff-empty">Nothing yet. Talk from the last 7 days shows up here.</p>
      ) : (
        <ul className="talk-clips">
          {clips.map((c) => {
            const fresh = !c.heard && !c.mine;
            return (
              <li key={c.id} id={`clip-${c.id}`} className={`${fresh ? "is-new" : ""} ${target === c.id ? "is-target" : ""}`}>
                <button
                  type="button"
                  className="talk-play"
                  onClick={() => play(c)}
                  aria-label={`${playing === c.id ? "Pause" : "Play"} ${c.name}, ${clipLength(c.ms)}`}
                  aria-busy={loading === c.id}
                >
                  {playing === c.id ? <PauseIcon /> : <PlayIcon />}
                </button>
                <span className="talk-clip-who">
                  <b>{c.mine ? "You" : c.name}</b>
                  {fresh && <span className="tag is-warn">New</span>}
                  <small suppressHydrationWarning>
                    {when(c.at)} · {clipLength(c.ms)}
                    {showBranch && ` · ${c.branches.map(shortBranch).join(" and ")}`}
                  </small>
                </span>
                <small className="talk-clip-heard">
                  {failed === c.id
                    ? <span className="is-error">Couldn&rsquo;t play it. Try again.</span>
                    : c.heardBy.length ? `Heard by ${nameList(c.heardBy)}` : c.mine ? "No one else heard it yet" : ""}
                </small>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
