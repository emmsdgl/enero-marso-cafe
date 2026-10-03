import type { Metadata } from "next";
import Link from "next/link";
import { asc, eq } from "drizzle-orm";
import ActionForm from "@/components/staff/ActionForm";
import { db, staff } from "@/db";
import { branches } from "@/data/branches";
import { hoursBetween, manila, requireStaff } from "@/lib/staff";
import { weekEntries } from "@/lib/timesheet";
import { mondayOf, shiftWeek, toManilaInput, validMonday, weekLabel } from "@/lib/week";
import { saveEntry } from "../actions";

export const metadata: Metadata = { title: "Time records" };

const METHOD = { tablet: "Tablet", wifi: "Phone · Wi-Fi", manual: "Added by manager" } as const;
const h2 = (h: number) => h.toFixed(2);
const short = (id: string) => branches.find((b) => b.id === id)!.name.replace("Enero Marso ", "");

export default async function TimePage({ searchParams }: PageProps<"/staff/time">) {
  const me = await requireStaff();
  const sp = await searchParams;
  const thisWeek = mondayOf(new Date());
  const week = validMonday(typeof sp.week === "string" ? sp.week : undefined, thisWeek);
  const branch = me.role === "admin" && typeof sp.branch === "string" && ["main", "noir"].includes(sp.branch) ? sp.branch : "all";
  const canEdit = me.role !== "employee";
  const now = new Date();

  const rows = await weekEntries(me, week, branch);
  const people = canEdit
    ? await db.select({ id: staff.id, name: staff.name, branchId: staff.branchId }).from(staff)
        .where(me.role === "manager" ? eq(staff.branchId, me.branchId!) : undefined).orderBy(asc(staff.name))
    : [];

  // Totals per person (closed shifts only; an open shift is still running)
  const totals = new Map<string, { name: string; hours: number; shifts: number; open: boolean }>();
  for (const r of rows) {
    const t = totals.get(r.staffId) ?? { name: r.name, hours: 0, shifts: 0, open: false };
    if (r.clockOut) { t.hours += hoursBetween(r.clockIn, r.clockOut); t.shifts += 1; } else t.open = true;
    totals.set(r.staffId, t);
  }

  const q = (w: string) => `/staff/time?week=${w}${branch !== "all" ? `&branch=${branch}` : ""}`;

  return (
    <div className="staff-page">
      <header className="staff-head is-split">
        <div>
          <h1>Time records</h1>
          <p>{weekLabel(week)}{week === thisWeek && " · this week"}</p>
        </div>
        <nav className="week-nav" aria-label="Week">
          <Link className="staff-btn is-quiet" href={q(shiftWeek(week, -1))}>← Previous</Link>
          {week !== thisWeek && <Link className="staff-btn is-quiet" href={q(thisWeek)}>This week</Link>}
          {week < thisWeek && <Link className="staff-btn is-quiet" href={q(shiftWeek(week, 1))}>Next →</Link>}
          {canEdit && <a className="staff-btn is-quiet" href={`/staff/time/export?week=${week}&branch=${branch}`}>Download CSV</a>}
        </nav>
      </header>

      {me.role === "admin" && (
        <nav className="seg" aria-label="Branch">
          {["all", "main", "noir"].map((b) => (
            <Link key={b} href={`/staff/time?week=${week}${b !== "all" ? `&branch=${b}` : ""}`} aria-current={b === branch ? "page" : undefined}>
              {b === "all" ? "Both branches" : short(b)}
            </Link>
          ))}
        </nav>
      )}

      <section className="staff-card" aria-labelledby="sum-title">
        <h2 id="sum-title">{me.role === "employee" ? "My hours" : "Hours this week"}</h2>
        {totals.size === 0 ? (
          <p className="staff-empty">No shifts recorded this week.</p>
        ) : (
          <ul className="totals">
            {[...totals.values()].sort((a, b) => b.hours - a.hours).map((t) => (
              <li key={t.name}>
                <span>{t.name}{t.open && <small className="tag is-ok">On shift</small>}</span>
                <span><b>{h2(t.hours)} h</b><small>{t.shifts} {t.shifts === 1 ? "shift" : "shifts"}</small></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="staff-card" aria-labelledby="list-title">
        <h2 id="list-title">Shifts</h2>
        {rows.length === 0 ? (
          <p className="staff-empty">Nothing yet.</p>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  {me.role !== "employee" && <th scope="col">Name</th>}
                  {me.role === "admin" && <th scope="col">Branch</th>}
                  <th scope="col">In</th>
                  <th scope="col">Out</th>
                  <th scope="col" className="num">Hours</th>
                  <th scope="col">How</th>
                  {canEdit && <th scope="col"><span className="sr-only">Fix</span></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>{manila.date(r.clockIn)}</td>
                    {me.role !== "employee" && <th scope="row">{r.name}</th>}
                    {me.role === "admin" && <td>{short(r.branchId)}</td>}
                    <td>{manila.time(r.clockIn)}</td>
                    <td>{r.clockOut ? manila.time(r.clockOut) : <span className="tag is-ok">On shift</span>}</td>
                    <td className="num">{r.clockOut ? h2(hoursBetween(r.clockIn, r.clockOut)) : <small>{h2(hoursBetween(r.clockIn, now))} so far</small>}</td>
                    <td>
                      {METHOD[r.inMethod]}
                      {r.editedAt && <small title={r.note ?? undefined}>Edited{r.note ? `: ${r.note}` : ""}</small>}
                    </td>
                    {canEdit && (
                      <td className="staff-actions">
                        <details className="staff-edit">
                          <summary>Fix</summary>
                          <ActionForm action={saveEntry} submit="Save" resetOnOk={false}>
                            <input type="hidden" name="id" value={r.id} />
                            <label>Clock in<input type="datetime-local" name="clockIn" defaultValue={toManilaInput(r.clockIn)} required /></label>
                            <label>Clock out<input type="datetime-local" name="clockOut" defaultValue={toManilaInput(r.clockOut)} /></label>
                            <label>Reason<input name="note" defaultValue={r.note ?? ""} placeholder="Forgot to clock out" required /></label>
                          </ActionForm>
                        </details>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canEdit && people.length > 0 && (
        <section className="staff-card" aria-labelledby="add-title">
          <h2 id="add-title">Add a missed shift</h2>
          <p className="staff-help">For when someone forgot to clock in. It&rsquo;s marked &ldquo;Added by manager&rdquo; with your reason.</p>
          <ActionForm action={saveEntry} submit="Add shift" className="is-row">
            <label>Who
              <select name="staffId" required defaultValue="">
                <option value="" disabled>Choose…</option>
                {people.filter((p) => p.branchId).map((p) => <option key={p.id} value={p.id}>{p.name}{me.role === "admin" ? ` · ${short(p.branchId!)}` : ""}</option>)}
              </select>
            </label>
            <label>Clock in<input type="datetime-local" name="clockIn" required /></label>
            <label>Clock out<input type="datetime-local" name="clockOut" /></label>
            <label>Reason<input name="note" placeholder="Forgot to clock in" required /></label>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
