"use client";

import { useEffect, useState } from "react";
import { branches, isOpen } from "@/data/branches";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Current weekday and minute in the Philippines, whatever the visitor's own time zone */
function manilaNow() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { weekday: DAYS.indexOf(get("weekday")), minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

/** "Open now" / "Closed now", computed on the client and refreshed every minute */
export default function OpenBadge({ branchId }: { branchId: "main" | "noir" }) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const branch = branches.find((b) => b.id === branchId)!;
    const check = () => {
      const { weekday, minute } = manilaNow();
      setOpen(isOpen(branch, weekday, minute));
    };
    check();
    const t = window.setInterval(check, 60_000);
    return () => window.clearInterval(t);
  }, [branchId]);

  if (open === null) return <span className="open-badge is-pending" aria-hidden="true" />;
  return (
    <span className={`open-badge ${open ? "is-open" : "is-closed"}`}>
      <i aria-hidden="true" />
      {open ? "Open now" : "Closed now"}
    </span>
  );
}
