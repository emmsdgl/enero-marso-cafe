import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LiveRefresh from "@/components/LiveRefresh";
import CustomerChat from "@/components/order/CustomerChat";
import { CancelOrder, OrderLink } from "@/components/order/OrderLink";
import PayPanel from "@/components/order/PayPanel";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { branches } from "@/data/branches";
import { formatDistance } from "@/lib/delivery";
import { peso } from "@/lib/menu";
import { listMessages } from "@/lib/order-chat";
import { chatState, unreadCount, type OrderStatus } from "@/lib/order-rules";
import { getCustomerOrder } from "@/lib/orders";
import { listPaymentAccounts, toPayAccount } from "@/lib/payments";
import { formatPhone } from "@/lib/pricing";
import { channels } from "@/lib/realtime";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

type Step = { label: string; statuses: OrderStatus[] };
const PICKUP_STEPS: Step[] = [
  { label: "Order sent", statuses: ["pending"] },
  { label: "Accepted", statuses: ["accepted"] },
  { label: "Being prepared", statuses: ["preparing"] },
  { label: "Ready for pickup", statuses: ["ready"] },
  { label: "Picked up", statuses: ["done"] },
];
const DELIVERY_STEPS: Step[] = [
  { label: "Order sent", statuses: ["pending"] },
  { label: "Pay", statuses: ["awaiting_payment"] },
  { label: "Being prepared", statuses: ["accepted", "preparing", "ready"] },
  { label: "On its way", statuses: ["out_for_delivery"] },
  { label: "Delivered", statuses: ["done"] },
];

const at = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

/** The customer's private order page: live status, what they ordered, paying for a delivery, and the chat */
export default async function TrackOrderPage({ params, searchParams }: PageProps<"/order/[code]">) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : undefined;
  const order = await getCustomerOrder(code, token);
  if (!order || !token) notFound();

  const branch = branches.find((b) => b.id === order.branchId)!;
  const cafe = order.branchId === "noir" ? "Cafe Noir" : "Enero Marso";
  const delivery = order.fulfillment === "delivery";
  const paying = order.status === "awaiting_payment";
  const [messages, accounts] = await Promise.all([
    listMessages(order.id),
    paying && order.paymentStatus === "unpaid" ? listPaymentAccounts([order.branchId], true).then((list) => Promise.all(list.map(toPayAccount))) : [],
  ]);
  const chat = chatState(order);
  const unread = unreadCount(messages, "customer", order.customerLastReadAt);
  // Staff names stay at the cafe: the customer sees the branch
  const lines = messages.map((m) => ({
    id: m.id, sender: m.sender, body: m.body, time: at(m.createdAt),
    who: m.sender === "customer" ? "You" : m.sender === "staff" ? cafe : null,
  }));

  const STEPS = delivery ? DELIVERY_STEPS : PICKUP_STEPS;
  const step = order.status === "done" ? STEPS.length : STEPS.findIndex((s) => s.statuses.includes(order.status));
  const when = order.wantedAt ? `Today, ${at(order.wantedAt)}` : delivery ? "As soon as possible" : "As soon as it's ready";
  const codeTag = <span className="nowrap">{order.code}</span>;
  const headline: Record<OrderStatus, React.ReactNode> = delivery
    ? {
        pending: `Order sent. ${order.branchId === "noir" ? "Cafe Noir" : "The cafe"} will confirm it and the delivery fee.`,
        awaiting_payment: order.paymentStatus === "submitted" ? "Payment sent. The cafe is checking it." : `Confirmed! Pay ${peso(order.total)} to start your order.`,
        accepted: order.wantedAt ? `Paid and accepted. We'll deliver around ${at(order.wantedAt)}.` : "Paid and accepted. We'll start on it shortly.",
        preparing: "Your order is being prepared.",
        ready: "Ready, and waiting for the rider.",
        out_for_delivery: "On its way to you.",
        done: "Delivered. Thanks for ordering!",
        cancelled: "This order was cancelled.",
      }
    : {
        pending: `Order sent. Waiting for ${order.branchId === "noir" ? "Cafe Noir" : "the cafe"} to accept it.`,
        awaiting_payment: "Waiting for your payment.",
        accepted: order.wantedAt ? `Accepted. It'll be ready by ${at(order.wantedAt)}.` : "Accepted. We'll start on it shortly.",
        preparing: "Your order is being prepared.",
        ready: <>Ready! Show code {codeTag} at the counter.</>,
        out_for_delivery: "On its way to you.",
        done: "Picked up. Thanks for ordering!",
        cancelled: "This order was cancelled.",
      };
  const fee = order.deliveryFee === null ? "The cafe confirms it" : order.deliveryFee === 0 ? "Free" : peso(order.deliveryFee);
  const canCancel = order.paymentStatus === "unpaid" && (order.status === "pending" || order.status === "awaiting_payment");

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
            {order.status === "out_for_delivery" && order.trackingUrl && (
              <a href={order.trackingUrl} className="track-rider" target="_blank" rel="noopener noreferrer">Track your rider</a>
            )}
            {unread > 0 && (
              <a href="#messages" className="track-alert">
                {unread === 1 ? "New message" : `${unread} new messages`} from {cafe}
              </a>
            )}
          </header>

          {order.status !== "cancelled" && (
            <ol className="track-steps">
              {STEPS.map((s, i) => (
                <li key={s.label} className={i < step ? "is-done" : i === step ? "is-now" : undefined} aria-current={i === step ? "step" : undefined}>
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

          {paying && (
            <PayPanel
              code={order.code}
              token={token}
              total={order.total}
              accounts={accounts}
              sent={order.paymentStatus === "submitted" ? order.gcashRef : null}
            />
          )}

          <dl className="track-facts">
            {delivery ? (
              <div>
                <dt>Deliver to</dt>
                <dd>
                  {order.address}
                  <small>{[order.landmark, order.distanceMeters != null && `about ${formatDistance(order.distanceMeters)} from ${cafe}`].filter(Boolean).join(" · ")}</small>
                </dd>
              </div>
            ) : (
              <div><dt>Pickup</dt><dd>{branch.name}<small>{branch.address} · <a href={branch.mapsUrl} target="_blank" rel="noopener noreferrer">Directions</a></small></dd></div>
            )}
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
            {delivery && <li className="track-fee"><span>Delivery</span><span>{fee}</span></li>}
            <li className="track-total"><span>Total</span><span>{peso(order.total)}</span></li>
          </ul>
          {!delivery && order.status !== "cancelled" && order.status !== "done" && <p className="track-pay">Pay at the counter when you pick up: cash or GCash.</p>}
          {delivery && order.status === "pending" && (
            <p className="track-pay">You&rsquo;ll pay by GCash, Maya or bank transfer once the cafe confirms the delivery fee. Nothing to pay yet.</p>
          )}
          {delivery && order.paymentStatus === "verified" && order.status !== "cancelled" && <p className="track-pay">Paid. Thank you!</p>}

          <section id="messages" className="track-chat" aria-labelledby="messages-title">
            <h2 id="messages-title">Messages</h2>
            <CustomerChat
              code={order.code}
              token={token}
              lines={lines}
              open={chat.open}
              unread={unread}
              branchName={cafe}
              closedNote={
                <>
                  {chat.reason === "cancelled" ? "This chat closed when the order was cancelled." : `This chat closed at ${at(chat.closesAt)}.`}{" "}
                  For anything else, message <a href={branch.socials.facebook} target="_blank" rel="noopener noreferrer">{branch.name}</a> on Facebook.
                </>
              }
            />
          </section>

          {order.status !== "done" && order.status !== "cancelled" && <OrderLink code={order.code} />}
          {canCancel && <CancelOrder code={order.code} token={token} />}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
