import type { Metadata } from "next";
import HeroVideo from "@/components/HeroVideo";
import MenuSection from "@/components/MenuSection";
import MissionVision from "@/components/MissionVision";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { homeDrinks, homeFood } from "@/data/menu";

export const metadata: Metadata = { title: "Home" };

// Homepage (Canva page 2)
export default function Home() {
  return (
    <>
      <SiteHeader overlay />
      <main>
        <section className="hero" aria-labelledby="hero-title">
          <HeroVideo />
          <div className="hero-shade" aria-hidden="true" />
          <div className="hero-copy">
            <h1 id="hero-title">Enero Marso Cafe</h1>
            <p>
              Enero Marso Cafe is a cozy spot built around great coffee, comfort, and good conversations. With
              passionate baristas behind every brew, it offers a warm and welcoming atmosphere where you can slow
              down, enjoy a thoughtfully crafted cup, and spend time connecting with others.
            </p>
          </div>
        </section>

        <MissionVision />

        <MenuSection
          id="coffee"
          kind="coffee"
          title="Coffee"
          tagline="Rich flavors, real moments"
          body="From classic favorites to our signature blends, each cup is made to fuel your day and your dreams."
          items={homeDrinks}
        />
        <MenuSection
          id="food"
          kind="food"
          title="Food"
          tagline="Simple ingredients, big comfort"
          body="Freshly made, always satisfying. Our food is the perfect pair for your favorite brew."
          items={homeFood}
        />
      </main>
      <SiteFooter />
    </>
  );
}
