import type { Metadata } from "next";
import Link from "next/link";
import { FacebookIcon, InstagramIcon } from "@/components/Icons";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { branches } from "@/data/branches";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <header className="page-head">
          <h1>Contact</h1>
          <p className="page-script">Let&rsquo;s talk over coffee</p>
        </header>
        <div className="info-grid">
          {branches.map((b) => (
            <section key={b.id} aria-labelledby={`c-${b.id}`}>
              <h2 id={`c-${b.id}`}>{b.name}</h2>
              <p className="info-big">Message us on Instagram or Facebook</p>
              <div className="contact-socials">
                <a className="pill-btn" href={b.socials.instagram} target="_blank" rel="noopener noreferrer">
                  <InstagramIcon /> {b.socials.handle}
                </a>
                <a className="pill-btn" href={b.socials.facebook} target="_blank" rel="noopener noreferrer">
                  <FacebookIcon /> Facebook
                </a>
              </div>
            </section>
          ))}
        </div>
        <p className="page-note">
          Opening hours and directions for both branches are on <Link href="/store">Our stores</Link>.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
