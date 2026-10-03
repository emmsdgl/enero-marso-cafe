"use client";

import { useEffect, useRef, useState } from "react";

/** Looping, muted background video with a pause control; stays on the poster for reduced-motion users */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    v.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().then(() => setPlaying(true)).catch(() => {});
    else { v.pause(); setPlaying(false); }
  };

  return (
    <>
      <video
        ref={ref}
        className="hero-video"
        muted
        loop
        playsInline
        preload="metadata"
        poster="/video/barista-poster.jpg"
        aria-hidden="true"
      >
        <source src="/video/barista-720.mp4" type="video/mp4" media="(max-width: 900px)" />
        <source src="/video/barista-1080.mp4" type="video/mp4" />
      </video>
      <button type="button" className="hero-toggle" onClick={toggle} aria-label={playing ? "Pause background video" : "Play background video"}>
        {playing ? (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5h3v14H8zM13 5h3v14h-3z" fill="currentColor" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5l11 7-11 7z" fill="currentColor" /></svg>
        )}
      </button>
    </>
  );
}
