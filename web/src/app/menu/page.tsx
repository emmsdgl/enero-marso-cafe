import type { Metadata } from "next";
import InkStamp from "@/components/InkStamp";
import MenuBoard from "@/components/MenuBoard";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getMenus } from "@/lib/menu-store";

export const metadata: Metadata = { title: "Menu" };
// Rendered per visit (the menu data itself is cached), so sold-out changes show straight away
export const dynamic = "force-dynamic";

// The full menu as a printed label (adapted from the Roast Label style preview)
export default async function MenuPage() {
  const menus = await getMenus();
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

          <MenuBoard menus={menus} />

        </article>

      </main>
      <SiteFooter />
    </>
  );
}
