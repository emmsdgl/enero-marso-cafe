import type { Metadata } from "next";
import MenuSearch from "@/components/MenuSearch";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { coffee, food } from "@/data/menu";

export const metadata: Metadata = { title: "Menu" };

export default function MenuPage() {
  return (
    <>
      <SiteHeader />
      <main className="page">
        <header className="page-head">
          <h1>Full menu</h1>
          <p className="page-script">Rich flavors, real moments</p>
        </header>
        <MenuSearch
          groups={[
            { id: "coffee", title: "Coffee", items: coffee },
            { id: "food", title: "Food", items: food },
          ]}
        />
        <p className="page-note">More drinks and dishes will be added here as the full menu comes in.</p>
      </main>
      <SiteFooter />
    </>
  );
}
