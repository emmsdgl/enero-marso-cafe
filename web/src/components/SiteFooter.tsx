import Image from "next/image";
import Link from "next/link";
import { branches } from "@/data/branches";
import { FacebookIcon, InstagramIcon } from "./Icons";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <Image src="/brand/enero-marso-logo-gold.png" alt="Enero Marso Cafe Premier" width={866} height={900} />
        </div>
        {branches.map((b) => (
          <div key={b.id} className="footer-branch">
            <h2>{b.name}</h2>
            <p>
              {b.address}
              {b.landmark && <small>{b.landmark}</small>}
            </p>
            <ul className="footer-hours">
              {b.hoursText.map((r) => (
                <li key={r.days}>
                  <span>{r.days}</span> <span>{r.time}</span>
                </li>
              ))}
            </ul>
            <div className="footer-links">
              <a href={b.mapsUrl} target="_blank" rel="noopener noreferrer">Directions</a>
                  <a className="footer-social" href={b.socials.instagram} target="_blank" rel="noopener noreferrer" aria-label={`${b.name} on Instagram`}>
                    <InstagramIcon />
                  </a>
                  <a className="footer-social" href={b.socials.facebook} target="_blank" rel="noopener noreferrer" aria-label={`${b.name} on Facebook`}>
                    <FacebookIcon />
                  </a>
            </div>
          </div>
        ))}
        <div>
          <h2>Explore</h2>
          <ul>
            <li><Link href="/menu">Full menu</Link></li>
            <li><Link href="/gallery">Gallery</Link></li>
            <li><Link href="/store">Our stores</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </div>
      </div>
      <p className="footer-fine">© {new Date().getFullYear()} Enero Marso Cafe</p>
    </footer>
  );
}
