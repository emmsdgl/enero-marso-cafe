"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CloseIcon, MenuIcon } from "./Icons";

const links = [
  { href: "/home", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/reservations", label: "Reserve & Cater" },
  { href: "/store", label: "Our Stores" },
];

export default function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  const path = usePathname();
  // The menu belongs to the page it was opened on, so navigating closes it
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === path;
  const setOpen = (next: boolean | ((o: boolean) => boolean)) =>
    setOpenOn((typeof next === "function" ? next(open) : next) ? path : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className={`site-header${overlay ? " is-overlay" : ""}${open ? " is-open" : ""}`}>
      <Link href="/home" className="brand" aria-label="Enero Marso Cafe, home">
        <Image src="/brand/enero-marso-monogram-gold.png" alt="" width={439} height={500} priority />
        <span className="brand-word">
          Enero Marso
          <small>Cafe</small>
        </span>
      </Link>

      <nav id="site-nav" className="site-nav" aria-label="Main">
        {links.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href || path.startsWith(`${l.href}/`) ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="header-tools">
        <Link href="/order" className="header-order" aria-current={path.startsWith("/order") ? "page" : undefined}>Order</Link>
        <button
          type="button"
          className="icon-btn nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>
    </header>
  );
}
