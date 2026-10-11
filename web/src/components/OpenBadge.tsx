"use client";

import { useEffect, useState } from "react";
import { isOpen, manilaClock, type Schedule } from "@/lib/hours";

/** "Open now" / "Closed now", computed on the client and refreshed every minute */
export default function OpenBadge({ schedule }: { schedule: Schedule }) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setOpen(isOpen(schedule, manilaClock()));
    check();
    const t = window.setInterval(check, 60_000);
    return () => window.clearInterval(t);
  }, [schedule]);

  if (open === null) return <span className="open-badge is-pending" aria-hidden="true" />;
  return (
    <span className={`open-badge ${open ? "is-open" : "is-closed"}`}>
      <i aria-hidden="true" />
      {open ? "Open now" : "Closed now"}
    </span>
  );
}
