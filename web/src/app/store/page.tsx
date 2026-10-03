import type { Metadata } from "next";
import BranchPanel from "@/components/BranchPanel";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { branches } from "@/data/branches";

export const metadata: Metadata = {
  title: "Our Stores",
  description: "Enero Marso Cafe in Western Bicutan and Enero Marso Cafe Noir across Vista Mall Taguig: addresses, opening hours and directions.",
};

export default function StorePage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <header className="page-head">
          <h1>Our stores</h1>
          <p className="page-script">Two places to slow down in Taguig</p>
        </header>
        <div className="branches">
          {branches.map((b) => (
            <BranchPanel key={b.id} branch={b} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
