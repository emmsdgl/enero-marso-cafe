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
