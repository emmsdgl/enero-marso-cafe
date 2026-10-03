import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { store } from "@/data/menu";

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
          <section aria-labelledby="visit">
            <h2 id="visit">Visit</h2>
            <p className="info-big">{store.address}</p>
          </section>
          <section aria-labelledby="reach">
            <h2 id="reach">Phone, email &amp; socials</h2>
            <p className="info-big">To be announced</p>
            <p>Contact details and social links will be added here soon.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
