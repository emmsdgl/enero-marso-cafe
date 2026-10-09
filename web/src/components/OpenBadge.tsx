"use client";

import { useEffect, useState } from "react";
import { branches, isOpen, manilaClock } from "@/data/branches";

/** "Open now" / "Closed now", computed on the client and refreshed every minute */
export default function OpenBadge({ branchId }: { branchId: "main" | "noir" }) {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const branch = branches.find((b) => b.id === branchId)!;
    const check = () => {
      const { weekday, minute } = manilaClock();
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
