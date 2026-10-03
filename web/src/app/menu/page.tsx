import type { Metadata } from "next";
import Link from "next/link";
import { ChevronIcon } from "@/components/Icons";
import MenuSearch from "@/components/MenuSearch";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { coffee, food, store } from "@/data/menu";

export const metadata: Metadata = { title: "Menu" };

// The full menu as a printed label (adapted from the Roast Label style preview)
export default function MenuPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <article className="menu-label" aria-labelledby="menu-title">
          <div className="ml-course ml-strip">
            <span>Enero Marso Cafe</span>
            <span className="ml-strip-mid">Coffee · Comfort · Good conversations</span>
            <span>Western Bicutan, Taguig</span>
          </div>

          <header className="ml-course ml-title">
            <div>
              <h1 id="menu-title">Full menu</h1>
              <p className="ml-script">Rich flavors, real moments</p>
            </div>
            <InkStamp />
          </header>

          <MenuSearch
            groups={[
              { id: "coffee", title: "Coffee", art: "cup", items: coffee },
              { id: "food", title: "Food", art: "cutlery", items: food },
            ]}
          />

          <nav className="ml-course ml-tabs" aria-label="Next steps">
            <a className="ml-tab" href={store.mapsUrl} target="_blank" rel="noopener noreferrer">
              Get directions <ChevronIcon />
            </a>
            <Link className="ml-tab" href="/gallery">
              See the gallery <ChevronIcon />
            </Link>
          </nav>
        </article>

        <p className="page-note">More drinks and dishes will be added here as the full menu comes in.</p>
      </main>
      <SiteFooter />
    </>
  );
}

/** A rubber-stamp impression: the brand word printed with a rough, uneven ink edge */
function InkStamp() {
  return (
    <svg className="ml-stamp" viewBox="0 0 200 96" aria-hidden="true">
      <filter id="ml-ink">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="2.4" result="d" />
        <feTurbulence type="fractalNoise" baseFrequency="0.06 0.5" numOctaves="2" seed="3" result="w" />
        <feColorMatrix in="w" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.75" result="wm" />
        <feComposite in="d" in2="wm" operator="in" />
      </filter>
      <g filter="url(#ml-ink)" fill="none" stroke="currentColor">
        <rect x="4" y="4" width="192" height="88" rx="3" strokeWidth="4" />
        <rect x="11" y="11" width="178" height="74" rx="2" strokeWidth="1.5" />
        <text x="100" y="52" textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: "var(--brand)" }} fontWeight="700" fontSize="30" letterSpacing="4">PREMIER</text>
        <text x="100" y="72" textAnchor="middle" fill="currentColor" stroke="none" style={{ fontFamily: "var(--brand)" }} fontWeight="700" fontSize="11" letterSpacing="3">ENERO MARSO CAFE</text>
      </g>
    </svg>
  );
}
