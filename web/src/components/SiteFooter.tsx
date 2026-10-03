import Image from "next/image";
import Link from "next/link";
import { store } from "@/data/menu";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Image src="/brand/enero-marso-logo-gold.png" alt="Enero Marso Cafe Premier" width={866} height={900} />
        </div>
        <div>
          <h2>Visit us</h2>
          <p>{store.address}</p>
          <a href={store.mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
        </div>
        <div>
          <h2>Explore</h2>
          <ul>
            <li><Link href="/menu">Full menu</Link></li>
            <li><Link href="/gallery">Gallery</Link></li>
            <li><Link href="/store">Our store</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>
      <p className="footer-fine">© {new Date().getFullYear()} Enero Marso Cafe</p>
    </footer>
  );
}
