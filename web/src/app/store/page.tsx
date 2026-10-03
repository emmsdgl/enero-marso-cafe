import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { PinIcon } from "@/components/Icons";
import { store } from "@/data/menu";

export const metadata: Metadata = { title: "Our Store" };

export default function StorePage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <header className="page-head">
          <h1>Our store</h1>
          <p className="page-script">Come slow down with us</p>
        </header>
        <div className="info-grid">
          <section aria-labelledby="where">
            <h2 id="where">Where</h2>
            <p className="info-big">{store.address}</p>
            <a className="pill-btn" href={store.mapsUrl} target="_blank" rel="noopener noreferrer">
              <PinIcon /> Get directions
            </a>
          </section>
          <section aria-labelledby="hours">
            <h2 id="hours">Opening hours</h2>
            <p className="info-big">To be announced</p>
            <p>Our hours will be posted here soon.</p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
