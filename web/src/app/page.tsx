import Image from "next/image";
import Link from "next/link";
import { ChevronIcon, PinIcon } from "@/components/Icons";
import { store } from "@/data/menu";

// Landing page (Canva page 1)
export default function Landing() {
  return (
    <main className="landing">
      <Image className="landing-photo" src="/photos/landing-cups.jpg" alt="" fill priority sizes="100vw" />
      <div className="landing-shade" aria-hidden="true" />

      <div className="landing-center">
        <Image className="landing-mono" src="/brand/enero-marso-monogram-gold.png" alt="" width={439} height={500} priority />
        <h1>Enero Marso Cafe</h1>
        <p className="landing-tagline">Coffee, comfort &amp; good conversations</p>
        <Link href="/home" className="ghost-btn">Order here</Link>
      </div>

      <a className="landing-visit" href={store.mapsUrl} target="_blank" rel="noopener noreferrer">
        <PinIcon />
        <span>
          <b>Visit us</b>
          {store.address}
        </span>
      </a>

      <Link href="/home" className="landing-enter">
        Enter the cafe <ChevronIcon />
      </Link>
    </main>
  );
}
