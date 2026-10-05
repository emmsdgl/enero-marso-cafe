import type { Metadata } from "next";
import InkStamp from "@/components/InkStamp";
import MenuBoard from "@/components/MenuBoard";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";

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
            <span>2 locations in Taguig</span>
          </div>

          <header className="ml-course ml-title">
            <div>
              <h1 id="menu-title">Full menu</h1>
              <p className="ml-script">Rich flavors, real moments</p>
            </div>
            <InkStamp />
          </header>

          <MenuBoard />

        </article>

      </main>
      <SiteFooter />
    </>
  );
}
