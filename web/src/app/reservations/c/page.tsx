import Planner from "@/components/events/Planner";
import VariantBar from "@/components/events/VariantBar";

// Option C: a two-question planner with a running estimate slip
export default function PlannerPage() {
  return (
    <main className="page">
      <VariantBar current="c" />
      <header className="pl-head">
        <h1>Plan your event</h1>
        <p className="page-script">Your table, our coffee</p>
      </header>
      <Planner />
    </main>
  );
}
