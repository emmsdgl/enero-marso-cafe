import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LiveRefresh from "@/components/LiveRefresh";
import { CancelOrder, OrderLink } from "@/components/order/OrderLink";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { branches } from "@/data/branches";
import { peso } from "@/lib/menu";
import type { OrderStatus } from "@/lib/order-rules";
import { getCustomerOrder } from "@/lib/orders";
import { formatPhone } from "@/lib/pricing";
import { channels } from "@/lib/realtime";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Order sent" },
  { status: "accepted", label: "Accepted" },
  { status: "preparing", label: "Being prepared" },
  { status: "ready", label: "Ready for pickup" },
  { status: "done", label: "Picked up" },
];

const at = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

/** The customer's private order page: live status, what they ordered, where to pick it up */
export default async function TrackOrderPage({ params, searchParams }: PageProps<"/order/[code]">) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : undefined;
  const order = await getCustomerOrder(code, token);
  if (!order || !token) notFound();

  const branch = branches.find((b) => b.id === order.branchId)!;
  const step = order.status === "done" ? STEPS.length : STEPS.findIndex((s) => s.status === order.status);
  const when = order.wantedAt ? `Today, ${at(order.wantedAt)}` : "As soon as it's ready";
  const codeTag = <span className="nowrap">{order.code}</span>;
  const headline: Record<OrderStatus, React.ReactNode> = {
    pending: `Order sent. Waiting for ${order.branchId === "noir" ? "Cafe Noir" : "the cafe"} to accept it.`,
    awaiting_payment: "Waiting for your payment.",
    accepted: order.wantedAt ? `Accepted. It'll be ready by ${at(order.wantedAt)}.` : "Accepted. We'll start on it shortly.",
    preparing: "Your order is being prepared.",
    ready: <>Ready! Show code {codeTag} at the counter.</>,
    out_for_delivery: "On its way to you.",
    done: "Picked up. Thanks for ordering!",
    cancelled: "This order was cancelled.",
  };

  return (
    <>
      <SiteHeader />
      <LiveRefresh channels={[channels.order(order.id)]} />
      <main className="page">
        <article className={`track is-${order.status}`} aria-labelledby="track-title">
          <header className="track-head">
            <p className="track-code">Order <b>{order.code}</b></p>
            <h1 id="track-title" aria-live="polite">{headline[order.status]}</h1>
            {order.status === "cancelled" && order.cancelReason && <p className="track-reason">Reason: {order.cancelReason}</p>}
          </header>

          {order.status !== "cancelled" && (
            <ol className="track-steps">
              {STEPS.map((s, i) => (
                <li key={s.status} className={i < step ? "is-done" : i === step ? "is-now" : undefined} aria-current={i === step ? "step" : undefined}>
                  <span>{s.label}</span>
                </li>
              ))}
            </ol>
          )}
          {order.status !== "cancelled" && step >= 0 && (
            <p className="track-step-now" aria-hidden="true">
              {step >= STEPS.length ? "All done" : `Step ${step + 1} of ${STEPS.length} · ${STEPS[step].label}`}
            </p>
          )}

          <dl className="track-facts">
            <div><dt>Pickup</dt><dd>{branch.name}<small>{branch.address} · <a href={branch.mapsUrl} target="_blank" rel="noopener noreferrer">Directions</a></small></dd></div>
            <div><dt>When</dt><dd>{when}</dd></div>
            <div><dt>Name</dt><dd>{order.customerName}<small>{formatPhone(order.customerPhone)}</small></dd></div>
            {order.notes && <div><dt>Notes</dt><dd>{order.notes}</dd></div>}
          </dl>

          <ul className="track-items">
            {order.items.map((i) => (
              <li key={i.id}>
                <span>
                  {i.qty} × {i.name}
                  {(i.size || i.upsized || i.addons.length > 0) && (
                    <small>{[i.size, i.upsized && "upsized", ...i.addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(" · ")}</small>
                  )}
                </span>
                <span>{peso(i.lineTotal)}</span>
              </li>
            ))}
            <li className="track-total"><span>Total</span><span>{peso(order.total)}</span></li>
          </ul>
          {order.status !== "cancelled" && order.status !== "done" && <p className="track-pay">Pay at the counter when you pick up: cash or GCash.</p>}

          {order.status !== "done" && order.status !== "cancelled" && <OrderLink code={order.code} />}
          {order.status === "pending" && <CancelOrder code={order.code} token={token} />}
          <p className="track-help">
            Questions about your order? Message{" "}
            <a href={branch.socials.facebook} target="_blank" rel="noopener noreferrer">{branch.name}</a> on Facebook.
          </p>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
