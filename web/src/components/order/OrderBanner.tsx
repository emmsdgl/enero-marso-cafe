"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { glanceOrdersAction } from "@/app/order/actions";
import type { OrderStatus } from "@/lib/order-rules";
import { CloseIcon } from "../Icons";
import { forgetOrders, rememberedOrders } from "./OrderLink";

const LABEL: Record<OrderStatus, string> = {
  pending: "Waiting for the cafe to accept",
  awaiting_payment: "Waiting for your payment",
  accepted: "Accepted",
  preparing: "Being prepared",
  ready: "Ready for pickup",
  out_for_delivery: "On its way",
  done: "Picked up",
  cancelled: "Cancelled",
};
const DAY = 86_400_000;
const HIDDEN_KEY = "em-order-bar-hidden";

type Shown = { code: string; href: string; label: string; unread: number; key: string };

/**
 * "Your order is being prepared": a small bar on the public pages while this phone has an order
 * in progress, so the customer can browse the menu and still get back to it in one tap.
 */
export default function OrderBanner() {
  const path = usePathname();
  const onOrderPages = path.startsWith("/order");
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    if (onOrderPages) return;
    let stopped = false;
    const check = async () => {
      const now = Date.now();
      const all = rememberedOrders();
      const expired = all.filter((o) => now - o.at > 2 * DAY).map((o) => o.code);
      const recent = all.filter((o) => now - o.at < DAY).map((o) => {
        const u = new URL(o.url, window.location.origin);
        return { code: o.code, token: u.searchParams.get("t") ?? "", href: `${u.pathname}${u.search}` };
      });
      if (recent.length === 0) return forgetOrders(expired);

      let glances;
      try {
        glances = await glanceOrdersAction(recent.map(({ code, token }) => ({ code, token })));
      } catch {
        return;
      }
      if (stopped) return;
      forgetOrders([...expired, ...glances.flatMap((g) => (g.found ? [] : [g.code]))]);

      let hidden = "";
      try { hidden = sessionStorage.getItem(HIDDEN_KEY) ?? ""; } catch {}
      const live = glances.flatMap((g) => {
        if (!g.found) return [];
        const active = g.status !== "done" && g.status !== "cancelled";
        if (!active && !(g.chatOpen && g.unread > 0)) return [];
        // Hiding lasts until something changes: a new status or a new message brings it back
        const key = `${g.code}|${g.status}|${g.unread}`;
        if (key === hidden) return [];
        return [{ code: g.code, href: recent.find((r) => r.code === g.code)!.href, label: LABEL[g.status], unread: g.unread, key }];
      });
      setShown(live[0] ?? null);
    };
    check();
    const again = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", again);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", again);
    };
  }, [onOrderPages]);

  if (onOrderPages || !shown) return null;
  const hide = () => {
    try { sessionStorage.setItem(HIDDEN_KEY, shown.key); } catch {}
    setShown(null);
  };

  return (
    <div className="order-bar" role="status">
      <Link href={shown.href} className="order-bar-link">
        <span className="order-bar-code">Your order <b>{shown.code}</b></span>
        <span className="order-bar-status">
          {shown.label}
          {shown.unread > 0 && <em> · {shown.unread} new message{shown.unread > 1 ? "s" : ""}</em>}
        </span>
        <span className="order-bar-go" aria-hidden="true">View</span>
      </Link>
      <button type="button" className="order-bar-hide" aria-label="Hide for now" onClick={hide}>
        <CloseIcon />
      </button>
    </div>
  );
}
