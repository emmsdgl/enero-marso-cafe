import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;

export const SearchIcon = (p: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={1.8} {...base} aria-hidden="true" {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const MenuIcon = (p: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={1.8} {...base} aria-hidden="true" {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={1.8} {...base} aria-hidden="true" {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ChevronIcon = ({ dir = "right", ...p }: P & { dir?: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" strokeWidth={1.8} {...base} aria-hidden="true" {...p}>
    <path d={dir === "right" ? "M9 5l7 7-7 7" : "M15 5l-7 7 7 7"} />
  </svg>
);

export const PinIcon = (p: P) => (
  <svg viewBox="0 0 24 24" strokeWidth={1.6} {...base} aria-hidden="true" {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

/** Cup with heart-shaped steam, line art in the Canva design's style */
export const CupIcon = (p: P) => (
  <svg viewBox="0 0 64 80" strokeWidth={2} {...base} aria-hidden="true" {...p}>
    <path d="M30 34c-6-6-4-12 1-12 3 0 4 3 4 3s1-4 5-3c5 1 4 9-6 15" />
    <path d="M27 26c-3-5 2-9 0-14" />
    <path d="M10 42h38v6c0 10-8 18-19 18S10 58 10 48z" />
    <path d="M48 46h3a6 6 0 0 1 0 12h-5" />
    <path d="M6 70c8 5 38 5 46 0" />
  </svg>
);

/** Crossed fork and spoon */
export const CutleryIcon = (p: P) => (
  <svg viewBox="0 0 64 80" strokeWidth={2} {...base} aria-hidden="true" {...p}>
    <path d="M18 8v16c0 4 3 6 6 6s6-2 6-6V8M24 8v14M24 30 46 74" />
    <path d="M44 8c-6 0-9 8-8 15 1 5 4 7 7 7L20 74" />
    <ellipse cx="44" cy="17" rx="5.5" ry="9.5" transform="rotate(12 44 17)" />
  </svg>
);

/** Leaf sprig used at section edges */
export const Sprig = (p: P) => (
  <svg viewBox="0 0 120 260" strokeWidth={1.6} {...base} aria-hidden="true" {...p}>
    <path d="M30 258C46 196 52 128 44 4" />
    <path d="M46 40c14-16 36-20 52-14-12 14-32 20-52 14z" />
    <path d="M46 40c12-6 30-10 52-14" />
    <path d="M44 22C34 12 18 8 8 12c8 12 22 16 36 10z" />
    <path d="M44 22C32 18 20 14 8 12" />
    <path d="M48 96c14-18 38-24 56-16-12 16-34 22-56 16z" />
    <path d="M48 96c14-8 32-12 56-16" />
    <path d="M45 76C32 64 14 60 2 66c10 12 28 16 43 10z" />
    <path d="M45 76C30 70 16 68 2 66" />
    <path d="M46 156c14-16 36-22 54-14-12 14-34 20-54 14z" />
    <path d="M46 156c14-8 32-12 54-14" />
    <path d="M42 132C28 122 12 120 0 128c10 10 28 12 42 4z" />
    <path d="M42 132c-14-4-28-4-42-4" />
  </svg>
);
