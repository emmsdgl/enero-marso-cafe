import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import LiveRefresh from "@/components/LiveRefresh";
import CustomerChat from "@/components/order/CustomerChat";
import { AddedPayCard, LineCard, PlacedCard, type CardContext } from "@/components/order/OrderCards";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { branches } from "@/data/branches";
import { livePayCard, readCard } from "@/lib/chat-cards";
import { peso } from "@/lib/menu";
import { listMessages } from "@/lib/order-chat";
import { cashNote } from "@/lib/cash";
import { chatState, trackSteps, unreadCount, type OrderStatus } from "@/lib/order-rules";
import { getCustomerOrder } from "@/lib/orders";
import { listPaymentAccounts, toPayAccount } from "@/lib/payments";
import { channels } from "@/lib/realtime";

export const metadata: Metadata = { title: "Your order", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const at = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

/**
 * The customer's private order page: where the order is (the header and its steps), then one chat
 * with everything in it. Each step is a card to tap open, the payment is made in its card, and
 * messages with the branch sit in between.
 */
export default async function TrackOrderPage({ params, searchParams }: PageProps<"/order/[code]">) {
  const [{ code }, sp] = await Promise.all([params, searchParams]);
  const token = typeof sp.t === "string" ? sp.t : undefined;
  const order = await getCustomerOrder(code, token);
  if (!order || !token) notFound();

  const branch = branches.find((b) => b.id === order.branchId)!;
  const cafe = order.branchId === "noir" ? "Cafe Noir" : "Enero Marso";
  const delivery = order.fulfillment === "delivery";
  const paying = order.status === "awaiting_payment" && order.paymentStatus === "unpaid";
  const [messages, accounts] = await Promise.all([
    listMessages(order.id),
    paying ? listPaymentAccounts([order.branchId], true).then((list) => Promise.all(list.map(toPayAccount))) : [],
  ]);
  const chat = chatState(order);
  const unread = unreadCount(messages, "customer", order.customerLastReadAt);
  // Staff names stay at the cafe: the customer sees the branch, or "Your rider" for the one delivering
  const lines = messages.map((m) => ({
    id: m.id, sender: m.sender, body: m.body, time: at(m.createdAt), kind: m.kind,
    who: m.sender === "customer" ? "You" : m.sender === "staff" ? (m.staffId && m.staffId === order.riderId ? "Your rider" : cafe) : null,
  }));

  // The cards: one per step line; the newest one is open, and the pay form sits in the card that asks for it
  const ctx: CardContext = { order, token, branch, cafe, chat, accounts, at };
  const pay = livePayCard(messages, order);
  const withCards = messages.flatMap((m) => {
    const card = readCard(m.kind, m.meta);
    return card ? [{ m, card }] : [];
  });
  const newest = withCards.at(-1)?.m.id;
  const cards: Record<string, ReactNode> = {};
  for (const { m, card } of withCards) {
    cards[m.id] = <LineCard card={card} body={m.body} time={at(m.createdAt)} ctx={ctx} open={m.id === newest} live={m.id === pay} />;
  }

  const STEPS = trackSteps(order.fulfillment, order.paymentMethod);
  const cash = order.paymentMethod === "cash";
  const step = order.status === "done" ? STEPS.length : STEPS.findIndex((s) => s.statuses.includes(order.status));
  const codeTag = <span className="nowrap">{order.code}</span>;
  const headline: Record<OrderStatus, ReactNode> = delivery
    ? {
        pending: cash
          ? `Order sent. ${order.branchId === "noir" ? "Cafe Noir" : "The cafe"} will accept it shortly.`
          : `Order sent. Once ${order.branchId === "noir" ? "Cafe Noir" : "the cafe"} accepts it, you pay ${peso(order.total)} here.`,
        awaiting_payment: order.paymentStatus === "submitted" ? "Payment sent. The cafe is checking it." : `Accepted! Pay ${peso(order.total)} to start your order.`,
        accepted: cash
          ? (order.wantedAt ? `Accepted. We'll deliver around ${at(order.wantedAt)}.` : "Accepted. We'll start on it shortly.")
          : (order.wantedAt ? `Paid and accepted. We'll deliver around ${at(order.wantedAt)}.` : "Paid and accepted. We'll start on it shortly."),
        preparing: "Your order is being prepared.",
        ready: "Ready, and waiting for the rider.",
        out_for_delivery: cash ? `On its way to you. ${cashNote(order.total, order.cashTendered)}` : "On its way to you.",
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
  // Something to act on, said at the top too: the pay form, or new messages
  const missing = pay && pay !== "add" && messages.find((m) => m.id === pay)?.kind === "pay_missing";
  const alert = missing
    ? "We couldn't find your payment: check it below"
    : paying
      ? `Pay ${peso(order.total)} below`
      : unread > 0
        ? `${unread === 1 ? "New message" : `${unread} new messages`} from ${cafe}`
        : null;

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
            {alert && <a href={paying ? `#${pay === "add" ? "chat-end" : "pay-title"}` : "#chat-end"} className={`track-alert${missing ? " is-alert" : ""}`}>{alert}</a>}
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

          <section id="messages" className="track-chat" aria-labelledby="messages-title">
            <h2 id="messages-title" className="sr-only">Your order and messages</h2>
            <CustomerChat
              code={order.code}
              token={token}
              lines={lines}
              open={chat.open}
              unread={unread}
              branchName={cafe}
              intro={<PlacedCard ctx={ctx} open={!newest} />}
              cards={cards}
              outro={pay === "add" ? <AddedPayCard ctx={ctx} /> : undefined}
              closedNote={
                <>
                  {chat.reason === "cancelled" ? "This chat closed when the order was cancelled." : `This chat closed at ${at(chat.closesAt)}.`}{" "}
                  For anything else, message <a href={branch.socials.facebook} target="_blank" rel="noopener noreferrer">{branch.name}</a> on Facebook.
                </>
              }
            />
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
