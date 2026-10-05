/** A rubber-stamp impression: the brand word printed with a rough, uneven ink edge */
export default function InkStamp({ id = "ml-ink" }: { id?: string }) {
  return (
    <svg className="ml-stamp" viewBox="0 0 200 96" aria-hidden="true">
      <filter id={id}>
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="0.06 0.5" numOctaves="2" seed="3" result="w" />
        <feColorMatrix in="w" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="wm" />
        <feComposite in="d" in2="wm" operator="in" />
      </filter>
      <g filter={`url(#${id})`} fill="none" stroke="currentColor">
        <rect x="4" y="4" width="192" height="88" rx="3" strokeWidth="4" />
        <rect x="11" y="11" width="178" height="74" rx="2" strokeWidth="1.5" />
        <text x="100" y="52" textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: "var(--brand)" }} fontWeight="700" fontSize="30" letterSpacing="4">PREMIER</text>
        <text x="100" y="72" textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: "var(--brand)" }} fontWeight="700" fontSize="11" letterSpacing="3">ENERO MARSO CAFE</text>
      </g>
    </svg>
  );
}
