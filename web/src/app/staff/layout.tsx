import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import StaffApp from "@/components/staff/StaffApp";
import StaffNav from "@/components/staff/StaffNav";
import TalkDock from "@/components/talk/TalkDock";
import { branches } from "@/data/branches";
import { talkConfigured } from "@/lib/realtime-sfu";
import { myDeliveryCount } from "@/lib/riders";
import { ALL_ROLES, homeFor, isManager, ROLE_LABEL } from "@/lib/roles";
import { requireStaff } from "@/lib/staff";
import { staffMember, unheardCount } from "@/lib/talk";
import { signOut } from "../login/actions";
import "@/components/staff/staff.css";

export const metadata: Metadata = {
  title: { default: "Staff", template: "%s · Staff · Enero Marso" },
  robots: { index: false },
  // The staff portal installs as its own app ("EM Staff") on phones and tablets
  manifest: "/staff.webmanifest",
  appleWebApp: { capable: true, title: "EM Staff", statusBarStyle: "black-translucent" },
  icons: { icon: "/favicon.ico", apple: "/icons/staff-180.png" },
};
export const dynamic = "force-dynamic";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  // Every role gets the frame; each page says who may see it
  const me = await requireStaff(ALL_ROLES);
  const branch = branches.find((b) => b.id === me.branchId);
  // Talk: the admin always, everyone else while clocked in
  const [talk, deliveries] = await Promise.all([talkConfigured() ? staffMember(me) : null, myDeliveryCount(me.id)]);
  const unheard = talk ? await unheardCount(talk) : 0;
  const talkLink = { href: "/staff/talk", label: "Talk", badge: unheard };
  const deliveriesLink = { href: "/staff/deliveries", label: "Deliveries", badge: deliveries };
  const links =
    me.role === "rider"
      ? [deliveriesLink, talkLink, { href: "/staff/time", label: "Hours" }, { href: "/staff/account", label: "Account" }, { href: "/staff/help", label: "Help" }]
      : [
          { href: "/staff", label: "Today" },
          { href: "/staff/orders", label: "Orders" },
          // Counter staff sent out with a delivery get the rider's screen while they have one
          ...(deliveries ? [deliveriesLink] : []),
          talkLink,
          { href: "/staff/menu", label: "Menu" },
          { href: "/staff/time", label: "Hours" },
          ...(isManager(me) ? [{ href: "/staff/team", label: "Team" }, { href: "/staff/branch", label: "Branch" }] : []),
          { href: "/staff/account", label: "Account" },
          { href: "/staff/help", label: "Help" },
        ];
  return (
    <div className="staff-shell">
      <StaffApp />
      <header className="staff-top">
        <Link href={homeFor(me)} className="staff-brand">
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
      <TalkDock member={!!talk} admin={me.role === "admin"} branchIds={talk?.channels ?? []} />
    </div>
  );
}
