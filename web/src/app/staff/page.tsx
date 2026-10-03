import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, eq, isNull } from "drizzle-orm";
import ClockButton from "@/components/staff/ClockButton";
import { db, staff, timeEntries } from "@/db";
import { branches } from "@/data/branches";
import { openShift } from "@/lib/clock";
import { hoursBetween, manila, onBranchNetwork, requireStaff } from "@/lib/staff";

export const metadata: Metadata = { title: "Today" };

const fmtHours = (h: number) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, "0")}m`;

export default async function TodayPage({ searchParams }: PageProps<"/staff">) {
  const me = await requireStaff();
  const sp = await searchParams;
  const now = new Date();
  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? "";

  const myShift = me.role === "admin" ? null : await openShift(me.id);
  const net = me.branchId ? await onBranchNetwork(me.branchId) : null;

  // Who's on shift now: managers see their branch, the admin sees both
  const onShift =
    me.role === "employee"
      ? []
      : await db
          .select({ id: timeEntries.id, name: staff.name, branchId: timeEntries.branchId, clockIn: timeEntries.clockIn, inMethod: timeEntries.inMethod })
          .from(timeEntries)
          .innerJoin(staff, eq(staff.id, timeEntries.staffId))
          .where(and(isNull(timeEntries.clockOut), me.role === "manager" ? eq(timeEntries.branchId, me.branchId!) : undefined))
          .orderBy(asc(timeEntries.clockIn));

  return (
    <div className="staff-page">
      <header className="staff-head">
        <h1>Hi, {me.name.split(" ")[0]}</h1>
        <p>{manila.date(now)}</p>
      </header>

      {sp.welcome && <p className="staff-note is-ok">Your account is ready.</p>}
      {sp.reason === "forbidden" && <p className="staff-note is-warn">That page is for managers and the admin.</p>}
      {!me.pinHash && me.role !== "admin" && (
        <p className="staff-note is-warn">
          Set your clock-in PIN so you can use the counter tablet. <Link href="/staff/account">Set PIN</Link>
        </p>
      )}

      <div className="staff-grid">
        {me.role !== "admin" && (
          <section className="staff-card clock-card" aria-labelledby="clock-title">
            <h2 id="clock-title">My shift</h2>
            <p className="clock-status">
              {myShift ? (
                <>
                  <span className="dot is-on" aria-hidden="true" /> Clocked in since <b>{manila.time(myShift.clockIn)}</b>
                  <small>{fmtHours(hoursBetween(myShift.clockIn, now))} so far</small>
                </>
              ) : (
                <>
                  <span className="dot" aria-hidden="true" /> Not clocked in
                </>
              )}
            </p>
            {net?.ok ? (
              <ClockButton clockedIn={!!myShift} />
            ) : (
              <p className="clock-off">
                To clock in from this device, connect to the {branchName(me.branchId)} Wi-Fi. Or use the clock-in tablet at the counter.
              </p>
            )}
          </section>
        )}

        {me.role !== "employee" && (
          <section className="staff-card" aria-labelledby="onshift-title">
            <h2 id="onshift-title">On shift now</h2>
            {onShift.length === 0 ? (
              <p className="staff-empty">Nobody is clocked in{me.role === "manager" ? ` at ${branchName(me.branchId)}` : ""}.</p>
            ) : (
              <ul className="onshift">
                {onShift.map((e) => (
                  <li key={e.id}>
                    <span>
                      <b>{e.name}</b>
                      {me.role === "admin" && <small>{branchName(e.branchId).replace("Enero Marso ", "")}</small>}
                    </span>
                    <span className="onshift-time">
                      since {manila.time(e.clockIn)}
                      <small>{fmtHours(hoursBetween(e.clockIn, now))}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link className="staff-link" href="/staff/time">See time records →</Link>
          </section>
        )}
      </div>
    </div>
  );
}
