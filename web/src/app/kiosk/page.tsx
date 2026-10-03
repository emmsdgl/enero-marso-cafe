import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { and, asc, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import KioskBoard from "@/components/staff/KioskBoard";
import { db, staff, timeEntries } from "@/db";
import { branches } from "@/data/branches";
import { currentKiosk } from "@/lib/kiosk";
import "@/components/staff/staff.css";

export const metadata: Metadata = { title: "Clock in", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function KioskPage() {
  const kiosk = await currentKiosk();

  if (!kiosk) {
    return (
      <main className="kiosk is-empty">
        <Image src="/brand/enero-marso-monogram-gold.png" alt="" width={439} height={500} className="kiosk-mark" />
        <h1>This device isn&rsquo;t a clock-in tablet</h1>
        <p>A branch manager can set it up: sign in on this device, go to <b>Branch setup</b>, and choose &ldquo;Make this device the clock-in tablet&rdquo;.</p>
        <Link className="staff-btn is-primary" href="/login">Staff sign in</Link>
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
    />
  );
}
