import { branches } from "@/data/branches";
import { getCurrentStaff, hoursBetween } from "@/lib/staff";
import { weekEntries } from "@/lib/timesheet";
import { mondayOf, toManilaInput, validMonday } from "@/lib/week";

/** CSV of a week's shifts for payroll. Managers get their branch; the admin gets the chosen branch or both. */
export async function GET(request: Request) {
  const me = await getCurrentStaff();
  if (!me || me.role === "employee") return new Response("Forbidden", { status: 403 });

  const url = new URL(request.url);
  const week = validMonday(url.searchParams.get("week") ?? undefined, mondayOf(new Date()));
  const branch = url.searchParams.get("branch") ?? "all";
  const rows = await weekEntries(me, week, branch);

  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const name = (id: string) => branches.find((b) => b.id === id)?.name ?? id;
  const lines = [
    ["Name", "Branch", "Clock in (Manila)", "Clock out (Manila)", "Hours", "Method", "Note"].join(","),
    ...rows
      .slice()
      .reverse()
      .map((r) =>
        [
          r.name,
          name(r.branchId),
          toManilaInput(r.clockIn).replace("T", " "),
          r.clockOut ? toManilaInput(r.clockOut).replace("T", " ") : "still on shift",
          r.clockOut ? hoursBetween(r.clockIn, r.clockOut).toFixed(2) : "",
          r.inMethod,
          r.note ?? "",
        ].map(esc).join(","),
      ),
  ];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="enero-marso-hours-${week}${branch !== "all" ? `-${branch}` : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
