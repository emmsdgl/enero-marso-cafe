import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { InstallKiosk } from "@/components/staff/KioskApp";
import KioskBoard from "@/components/staff/KioskBoard";
import KioskTalk from "@/components/talk/KioskTalk";
import { db, staff, timeEntries } from "@/db";
import { branches } from "@/data/branches";
import { currentKiosk } from "@/lib/kiosk";
import { talkConfigured } from "@/lib/realtime-sfu";
import "@/components/staff/staff.css";

export const metadata: Metadata = { title: "Clock in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const kiosk = await currentKiosk();

  if (!kiosk) {
    return (
      <main className="kiosk is-empty">
        <Image src="/brand/enero-marso-monogram-gold.png" alt="" width={439} height={500} className="kiosk-mark" />
        <h1>This device isn&rsquo;t a clock-in tablet yet</h1>
        <p>A branch manager sets it up once: tap below and sign in. You&rsquo;re signed out again as soon as it&rsquo;s done.</p>
        <InstallKiosk />
        <Link className="staff-btn is-primary" href="/login?tablet=1&next=/staff/branch/tablet">Set up this tablet</Link>
      </main>
    );
  }

  const team = await db
    .select({ id: staff.id, name: staff.name })
    .from(staff)
    .where(and(eq(staff.branchId, kiosk.branchId), eq(staff.active, true), isNotNull(staff.pinHash), inArray(staff.role, ["employee", "manager"])))
    .orderBy(asc(staff.name));
  const open = team.length
    ? await db.select({ staffId: timeEntries.staffId, clockIn: timeEntries.clockIn }).from(timeEntries)
        .where(and(isNull(timeEntries.clockOut), inArray(timeEntries.staffId, team.map((t) => t.id))))
    : [];
  const branch = branches.find((b) => b.id === kiosk.branchId)!;

  return (
    <KioskBoard
      branchName={branch.name}
      people={team.map((t) => {
        const o = open.find((x) => x.staffId === t.id);
        return { id: t.id, name: t.name, since: o ? o.clockIn.toISOString() : null };
      })}
      talk={talkConfigured() ? <KioskTalk /> : null}
    />
  );
}
