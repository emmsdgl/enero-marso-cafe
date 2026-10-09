import type { Metadata } from "next";
import Checkout from "@/components/order/Checkout";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getMenus } from "@/lib/menu-store";
import { getOrderSettings } from "@/lib/orders";

export const metadata: Metadata = {
  title: "Order",
  description: "Order ahead from Enero Marso Cafe or Cafe Noir in Taguig and pick it up at the counter.",
};
// Rendered per visit: sold-out items and whether each branch is taking orders change during the night
export const dynamic = "force-dynamic";

export default async function OrderPage({ searchParams }: PageProps<"/order">) {
  const [menus, settings, sp] = await Promise.all([getMenus(), getOrderSettings(), searchParams]);
  const branch = typeof sp.branch === "string" ? sp.branch : undefined;
  return (
    <>
      <SiteHeader />
      <main className="page">
        <header className="page-head">
          <h1>Order ahead</h1>
          <p className="page-script">Skip the line, we&rsquo;ll have it ready</p>
        </header>
        <Checkout menus={menus} settings={settings} initialBranch={branch} />
      </main>
      <SiteFooter />
    </>
  );
}
