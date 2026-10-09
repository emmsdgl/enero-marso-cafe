"use client";

import { useEffect, useRef, useState } from "react";
import type { Highlight } from "@/lib/menu";
import { ChevronIcon } from "./Icons";
import MenuCard from "./MenuCard";

/** Horizontally scrolling row of menu cards with previous/next controls */
export default function MenuRow({ items, kind, label }: { items: Highlight[]; kind: "coffee" | "food"; label: string }) {
  const track = useRef<HTMLUListElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      setAtStart(el.scrollLeft < 8);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);

  const step = (dir: 1 | -1) => {
    const el = track.current;
    const card = el?.querySelector("li");
    if (!el || !card) return;
    el.scrollBy({ left: dir * (card.getBoundingClientRect().width + 24), behavior: "smooth" });
  };

  return (
    <div className="menu-row">
      <ul ref={track} className="menu-track" aria-label={label} tabIndex={0}>
        {items.map((item) => (
          <li key={item.name}><MenuCard item={item} kind={kind} /></li>
        ))}
      </ul>
      <div className="menu-row-controls">
        <button type="button" className="round-btn" onClick={() => step(-1)} disabled={atStart} aria-label={`Previous ${kind} item`}>
          <ChevronIcon dir="left" />
        </button>
        <button type="button" className="round-btn" onClick={() => step(1)} disabled={atEnd} aria-label={`Next ${kind} item`}>
          <ChevronIcon dir="right" />
        </button>
      </div>
    </div>
  );
}
