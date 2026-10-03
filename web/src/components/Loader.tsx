"use client";

import { useEffect, useRef } from "react";

const INTRO_MS = 3550; // until "Premier" finishes writing
const RULE_START_MS = 1900;
const SHINE_MS = 1050;
const MAX_WAIT_MS = 9000; // never hold visitors longer than this
const SEEN_KEY = "em-loaded";
const LOGO_SRC = "/brand/enero-marso-logo.jpg";

/** Gold logo intro. Progress follows real page loading and plays once per browser session. */
export default function Loader() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loader = ref.current;
    const root = document.documentElement;
    if (!loader || root.classList.contains("em-seen")) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const status = loader.querySelector<HTMLElement>("[data-em-status]");
    let raf = 0;
    const timers: number[] = [];
    let cancelled = false;
    root.classList.add("em-locked");

    const images = Array.from(document.images).filter((img) => !loader.contains(img));
    const total = images.length + 2; // + fonts + window load
    let done = 0;
    const tick = () => { done = Math.min(total, done + 1); };
    images.forEach((img) => {
      if (img.complete) tick();
      else {
        img.addEventListener("load", tick, { once: true });
        img.addEventListener("error", tick, { once: true });
      }
    });
    document.fonts.ready.then(tick);
    if (document.readyState === "complete") tick();
    else window.addEventListener("load", tick, { once: true });

    const finish = () => {
      loader.style.setProperty("--em-progress", "1");
      loader.classList.add("is-finishing");
      timers.push(window.setTimeout(() => {
        loader.classList.add("is-leaving");
        loader.setAttribute("aria-busy", "false");
        root.classList.remove("em-locked");
        try { sessionStorage.setItem(SEEN_KEY, "1"); } catch {}
        timers.push(window.setTimeout(() => loader.classList.add("is-gone"), reduced ? 450 : 1400));
      }, reduced ? 150 : SHINE_MS - 150));
    };

    const art = new Image();
    art.src = LOGO_SRC;
    art.decode().catch(() => {}).then(() => {
      if (cancelled) return;
      const start = performance.now();
      const intro = reduced ? 900 : INTRO_MS;
      const ruleStart = reduced ? 0 : RULE_START_MS;
      let shown = 0;
      let announced = -1;
      loader.classList.add("is-playing");

      const frame = (now: number) => {
        const t = now - start;
        const pace = Math.max(0, Math.min(1, (t - ruleStart) / (intro - ruleStart + 250)));
        const goal = Math.min(done / total, pace);
        shown += (goal - shown) * 0.12;
        if (goal - shown < 0.002) shown = goal;
        loader.style.setProperty("--em-progress", shown.toFixed(4));
        const pct = Math.round(shown * 10) * 10;
        if (pct !== announced) {
          announced = pct;
          loader.setAttribute("aria-valuenow", String(pct));
          if (status) status.textContent = `${pct}% loaded`;
        }
        if ((shown >= 0.999 && t >= intro) || t >= MAX_WAIT_MS) finish();
        else raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      timers.forEach(clearTimeout);
      root.classList.remove("em-locked");
    };
  }, []);

  return (
    <div
      ref={ref}
      className="em-loader"
      role="progressbar"
      aria-label="Loading Enero Marso Cafe"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
      aria-busy="true"
    >
      <div className="em-mark" aria-hidden="true">
        <div className="em-part em-mono" />
        <div className="em-part em-name" />
        <div className="em-part em-rule-l" />
        <div className="em-part em-cafe" />
        <div className="em-part em-rule-r" />
        <div className="em-part em-premier" />
        <div className="em-part em-shine" />
      </div>
      <span className="em-sr-only" data-em-status aria-live="polite" />
    </div>
  );
}
