import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 24) => ({ width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const });

// Drawn in the website's icon style (web/src/components/Icons.tsx): one stroke weight, rounded ends. No emojis.

export const CupIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.7} {...p}>
    <path d="M5 9h11v4.5a5.5 5.5 0 0 1-5.5 5.5v0A5.5 5.5 0 0 1 5 13.5V9z" />
    <path d="M16 10.5h1.25a2.75 2.75 0 0 1 0 5.5H15.5" />
    <path d="M8.5 3.5c-.7.9-.7 1.8 0 2.7M12 3.5c-.7.9-.7 1.8 0 2.7" />
  </svg>
);

export const ScooterIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.8} {...p}>
    <circle cx="5.5" cy="17.5" r="2.5" />
    <circle cx="18.5" cy="17.5" r="2.5" />
    <path d="M3 15.5c0-2.8 2-4.5 5-4.5h3l1.2 4.5h4.3" />
    <path d="M18.5 17.5 16.2 8.5" />
    <path d="M14.5 8.5h3.2" />
    <path d="M6.5 8.5h4" />
  </svg>
);

export const CheckIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

export const LockIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.8} {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </svg>
);

export const PinIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.6} {...p}>
    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

export const PlusIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={2.2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ChatIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.7} {...p}>
    <path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-7l-4.5 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5z" />
  </svg>
);

export const ReceiptIcon = ({ size, ...p }: P) => (
  <svg {...base(size)} strokeWidth={1.7} {...p}>
    <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </svg>
);
