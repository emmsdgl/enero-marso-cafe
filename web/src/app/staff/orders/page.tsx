import type { Metadata } from "next";
import Link from "next/link";
import LiveRefresh from "@/components/LiveRefresh";
import OrderBoard from "@/components/staff/OrderBoard";
import { branches } from "@/data/branches";
import { getOrderSettings, listBranchOrders } from "@/lib/orders";
import { channels } from "@/lib/realtime";
import { requireStaff } from "@/lib/staff";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/staff/orders">) {
  const me = await requireStaff();
  const mine = branches.filter((b) => me.role === "admin" || b.id === me.branchId);
  const want = (await searchParams).branch;
  const shown = mine.length > 1 && (want === "main" || want === "noir") ? mine.filter((b) => b.id === want) : mine;
  const ids = shown.map((b) => b.id);
  const [orders, settings] = await Promise.all([listBranchOrders(ids), getOrderSettings()]);
  const paused = shown.filter((b) => !settings[b.id].ordersOpen);

  return (
    <div className="staff-page">
      <LiveRefresh channels={ids.map(channels.branch)} />
      <header className="staff-head is-split">
        <div>
          <h1>Orders</h1>
          <p>New online orders appear here by themselves. Accept them, then move each one along until it&rsquo;s picked up.</p>
        </div>
        {mine.length > 1 && (
          <nav className="seg" aria-label="Branch">
            <Link href="/staff/orders" aria-current={shown.length > 1 ? "page" : undefined}>Both</Link>
            {mine.map((b) => (
              <Link key={b.id} href={`/staff/orders?branch=${b.id}`} aria-current={shown.length === 1 && shown[0].id === b.id ? "page" : undefined}>
                {b.name.replace("Enero Marso ", "")}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {paused.length > 0 && (
        <p className="staff-note is-warn">
          {paused.map((b) => b.name).join(" and ")} {paused.length === 1 ? "isn't" : "aren't"} taking online orders right now.{" "}
          {me.role === "employee" ? "Ask your manager to switch them on." : <>Switch them on in <Link href="/staff/branch">Branch</Link>.</>}
        </p>
      )}

      <OrderBoard orders={orders} showBranch={shown.length > 1} />
    </div>
  );
}
