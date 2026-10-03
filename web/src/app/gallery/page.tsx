import type { Metadata } from "next";
import Image from "next/image";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

export const metadata: Metadata = { title: "Gallery" };

const photos = [
  { src: "/photos/landing-cups.jpg", alt: "Enero Marso iced coffees in branded cups", w: 2732, h: 2360 },
  { src: "/photos/iced-latte.jpg", alt: "Iced latte on a wooden saucer", w: 867, h: 1031 },
  { src: "/photos/barista-hero.jpg", alt: "A barista tamping espresso at the bar", w: 4098, h: 2304 },
  { src: "/photos/vanilla-latte.jpg", alt: "Vanilla latte with latte art", w: 868, h: 1031 },
  { src: "/photos/choco-frappe.jpg", alt: "Choco frappe topped with cream", w: 867, h: 1028 },
  { src: "/photos/baked-lasagna.jpg", alt: "A slice of baked lasagna", w: 864, h: 1028 },
  { src: "/photos/carbonara-pasta.jpg", alt: "Carbonara pasta", w: 868, h: 1031 },
  { src: "/photos/club-sandwich.jpg", alt: "Grilled club sandwich", w: 864, h: 1031 },
];

export default function GalleryPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <header className="page-head">
          <h1>Gallery</h1>
          <p className="page-script">Coffee, comfort &amp; good conversations</p>
        </header>
        <ul className="gallery">
          {photos.map((p) => (
            <li key={p.src}>
              <Image src={p.src} alt={p.alt} width={p.w} height={p.h} sizes="(max-width: 40rem) 100vw, 33vw" />
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
