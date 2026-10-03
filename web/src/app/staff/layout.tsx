import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import StaffNav from "@/components/staff/StaffNav";
import { branches } from "@/data/branches";
import { requireStaff } from "@/lib/staff";
import { signOut } from "../login/actions";
import "@/components/staff/staff.css";

export const metadata: Metadata = { title: { default: "Staff", template: "%s · Staff · Enero Marso" }, robots: { index: false } };
export const dynamic = "force-dynamic";

const ROLE_LABEL = { employee: "Employee", manager: "Branch manager", admin: "Admin" } as const;

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  const me = await requireStaff();
  const branch = branches.find((b) => b.id === me.branchId);
  const links = [
    { href: "/staff", label: "Today" },
    { href: "/staff/time", label: "Time records" },
    ...(me.role !== "employee" ? [{ href: "/staff/team", label: "Team" }, { href: "/staff/branch", label: "Branch setup" }] : []),
    { href: "/staff/account", label: "My account" },
  ];
  return (
    <div className="staff-shell">
      <header className="staff-top">
        <Link href="/staff" className="staff-brand">
          <Image src="/brand/enero-marso-monogram-gold.png" alt="" width={439} height={500} />
          <span>Enero Marso <small>Staff</small></span>
        </Link>
        <StaffNav links={links} />
        <div className="staff-who">
          <span>
            <b>{me.name}</b>
            <small>{ROLE_LABEL[me.role]}{branch ? ` · ${branch.name.replace("Enero Marso ", "")}` : " · Both branches"}</small>
          </span>
          <form action={signOut}>
            <button type="submit" className="staff-btn is-quiet">Sign out</button>
          </form>
        </div>
      </header>
      <main className="staff-main">{children}</main>
    </div>
  );
}
