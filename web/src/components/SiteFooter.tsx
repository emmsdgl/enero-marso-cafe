import Image from "next/image";
import Link from "next/link";
import { branches } from "@/data/branches";

/** One quiet row: mark, the pages, the two Instagram handles. Branch details live on Our Stores. */
export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-row">
        <Link href="/home" className="footer-mark" aria-label="Enero Marso Cafe, home">
          <Image src="/brand/enero-marso-monogram-gold.png" alt="" width={439} height={500} />
        </Link>
        <nav className="footer-nav" aria-label="Footer">
          <Link href="/menu">Menu</Link>
          <Link href="/gallery">Gallery</Link>
          <Link href="/store">Our stores</Link>
        </nav>
        <p className="footer-follow">
          {branches.map((b) => (
            <a key={b.id} href={b.socials.instagram} target="_blank" rel="noopener noreferrer">
              {b.socials.handle}
            </a>
          ))}
        </p>
      </div>
      <p className="footer-fine">© {new Date().getFullYear()} Enero Marso Cafe · Taguig</p>
    </footer>
  );
}
