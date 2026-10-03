"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function StaffNav({ links }: { links: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="staff-nav" aria-label="Staff">
      {links.map((l) => {
        const current = l.href === "/staff" ? path === "/staff" : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} aria-current={current ? "page" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
