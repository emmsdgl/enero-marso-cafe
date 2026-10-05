import InkStamp from "@/components/InkStamp";
import RateCard from "@/components/events/RateCard";
import VariantBar from "@/components/events/VariantBar";
import { SAMPLE_NOTE } from "@/data/events";

// Option A: the offers as one printed rate card, in the same hand as the full menu
export default function RateCardPage() {
  return (
    <main className="page">
      <VariantBar current="a" />
      <article className="menu-label rc" aria-labelledby="rc-title">
        <div className="ml-course ml-strip">
          <span>Enero Marso Cafe</span>
          <span className="ml-strip-mid">Reservations · Catering</span>
          <span>Taguig</span>
        </div>
        <header className="ml-course ml-title">
          <div>
            <h1 id="rc-title">Reserve &amp; cater</h1>
            <p className="ml-script">Your table, our coffee</p>
          </div>
          <InkStamp id="rc-ink" />
        </header>
        <p className="ml-course rc-sample">{SAMPLE_NOTE}</p>
        <RateCard />
      </article>
    </main>
  );
}
