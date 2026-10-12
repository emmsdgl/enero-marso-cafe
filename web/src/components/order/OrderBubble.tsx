"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { glanceOrdersAction } from "@/app/order/actions";
import type { OrderStatus } from "@/lib/order-rules";
import { CupIcon } from "../Icons";
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
const DELIVERY_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Waiting for the cafe to confirm",
  accepted: "Paid and accepted",
  ready: "Waiting for the rider",
  done: "Delivered",
};
const DAY = 86_400_000;
const clock = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
const EVERY = 30_000;
const SMALL_KEY = "em-order-bubble-small";

type Shown = { code: string; href: string; label: string; unread: number; key: string; needsYou: boolean };

/** Bubbles the customer made small, remembered as they looked then: a new status or message makes them big again */
function readSmall(): string[] {
  try {
    const list = JSON.parse(localStorage.getItem(SMALL_KEY) ?? "[]");
    return Array.isArray(list) ? list.filter((k) => typeof k === "string") : [];
  } catch {
    return [];
  }
}

/**
 * "Your order: being prepared", floating on the public pages while this phone has an order in progress, so the customer
 * can browse, start another order, or close the browser and still get back to it in one tap. It stays until the order is
 * finished and its chat has closed (30 minutes after pickup or delivery, for any missing item or concern), updates every
 * 30 seconds, and is hidden only on that order's own page.
 */
export default function OrderBubble() {
  const path = usePathname();
  const here = path.startsWith("/order/") ? decodeURIComponent(path.slice("/order/".length)).toUpperCase() : null;
  const [shown, setShown] = useState<Shown[]>([]);
  const [small, setSmall] = useState<string[]>(readSmall);

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      const all = rememberedOrders();
      const expired = all.filter((o) => now - o.at > 2 * DAY).map((o) => o.code);
      const recent = all.filter((o) => now - o.at < DAY).map((o) => {
        const u = new URL(o.url, window.location.origin);
        return { code: o.code, token: u.searchParams.get("t") ?? "", href: `${u.pathname}${u.search}` };
      });
      if (recent.length === 0) {
        forgetOrders(expired);
        if (!stopped) setShown([]);
        return;
      }

      let glances;
      try {
        glances = await glanceOrdersAction(recent.map(({ code, token }) => ({ code, token })));
      } catch {
        return;
      }
      if (stopped) return;
      forgetOrders([...expired, ...glances.flatMap((g) => (g.found ? [] : [g.code]))]);

      const live = glances.flatMap((g) => {
        if (!g.found) return [];
        // A picked-up or delivered order stays while its chat is open; a cancelled one's chat closes at once
        if (!g.chatOpen) return [];
        const done = g.status === "done";
        const delivery = g.fulfillment === "delivery";
        const status = delivery ? (DELIVERY_LABEL[g.status] ?? LABEL[g.status]) : LABEL[g.status];
        return [{
          code: g.code,
          href: recent.find((r) => r.code === g.code)!.href,
          label: done ? `${status} · chat open until ${clock(g.chatClosesAt)}` : status,
          unread: g.unread,
          key: `${g.code}|${g.status}|${g.unread}`,
          needsYou: g.unread > 0 || g.status === "awaiting_payment" || (!delivery && g.status === "ready"),
        }];
      });
      setShown(live.slice(0, 3));
    };
    check();
    const timer = setInterval(check, EVERY);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [path]);

  const list = shown.filter((o) => o.code !== here);
  if (list.length === 0) return null;

  const makeSmall = (o: Shown) => {
    const next = [...small.filter((k) => !k.startsWith(`${o.code}|`)), o.key].slice(-10);
    try { localStorage.setItem(SMALL_KEY, JSON.stringify(next)); } catch {}
    setSmall(next);
  };
  const news = (o: Shown) => (o.unread > 0 ? `${o.unread} new message${o.unread > 1 ? "s" : ""}` : "");

  return (
    <div className="order-bubbles">
      {list.map((o) =>
        small.includes(o.key) ? (
          <Link
            key={o.code}
            href={o.href}
            className={`order-bubble is-small${o.needsYou ? " needs-you" : ""}`}
            aria-label={`Your order ${o.code}: ${o.label}${o.unread ? `, ${news(o)}` : ""}`}
            title={`Your order ${o.code}: ${o.label}`}
          >
            <span className="order-bubble-icon">
              <CupIcon />
              {o.unread > 0 && <b className="order-bubble-badge">{o.unread}</b>}
            </span>
          </Link>
        ) : (
          <div key={o.code} className={`order-bubble${o.needsYou ? " needs-you" : ""}`} role="status">
            <Link href={o.href} className="order-bubble-link">
              <span className="order-bubble-icon">
                <CupIcon />
                {o.unread > 0 && <b className="order-bubble-badge">{o.unread}</b>}
              </span>
              <span className="order-bubble-text">
                <span className="order-bubble-code">Your order <b>{o.code}</b></span>
                <span className="order-bubble-status">
                  {o.label}
                  {o.unread > 0 && <em> · {news(o)}</em>}
                </span>
              </span>
            </Link>
            <button type="button" className="order-bubble-shrink" aria-label="Make it smaller" title="Make it smaller" onClick={() => makeSmall(o)}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>
            </button>
          </div>
        ),
      )}
    </div>
  );
}
