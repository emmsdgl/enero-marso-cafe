"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** The staff menu. A count on a link (Talk) is something waiting for this person. */
export default function StaffNav({ links }: { links: { href: string; label: string; badge?: number }[] }) {
  const path = usePathname();
  return (
    <nav className="staff-nav" aria-label="Staff">
      {links.map((l) => {
        const current = l.href === "/staff" ? path === "/staff" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>
            {l.label}
            {!!l.badge && (
              <span className="staff-nav-badge">
                {l.badge > 9 ? "9+" : l.badge}
                <span className="sr-only"> new</span>
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
