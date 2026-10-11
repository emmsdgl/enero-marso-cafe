import type { Metadata } from "next";
import BranchPanel from "@/components/BranchPanel";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { branches } from "@/data/branches";
import { formatWindow, manilaClock, shiftDate } from "@/lib/hours";
import { loadSchedules } from "@/lib/hours-store";

export const metadata: Metadata = {
  title: "Our Stores",
  description: "Enero Marso Cafe in Western Bicutan and Enero Marso Cafe Noir across Vista Mall Taguig: addresses, opening hours and directions.",
};

// Hours come from the database, and managers can change them any time
export const dynamic = "force-dynamic";

/** "Fri, Dec 25" for a "YYYY-MM-DD" date */
const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

export default async function StorePage() {
  const schedules = await loadSchedules();
  const today = manilaClock().date;
  // Holidays and special hours in the next three weeks, so nobody walks up to a closed door
  const upcoming = (id: "main" | "noir") =>
    Object.entries(schedules[id].special)
      .filter(([day]) => day >= today && day <= shiftDate(today, 21))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, w]) => ({ day, label: day === today ? "Today" : dayLabel(day), hours: w ? formatWindow(w) : "Closed" }));
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
            <BranchPanel key={b.id} branch={b} schedule={schedules[b.id]} upcoming={upcoming(b.id)} />
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
