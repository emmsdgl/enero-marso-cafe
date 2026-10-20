import type { ReactNode } from "react";
import type { Branch } from "@/data/branches";
import { cashNote } from "@/lib/cash";
import type { Card } from "@/lib/chat-cards";
import { formatDistance } from "@/lib/delivery";
import { peso } from "@/lib/menu";
import type { ChatState } from "@/lib/order-rules";
import type { FullOrder } from "@/lib/orders";
import type { PayAccount } from "@/lib/payments";
import { formatPhone } from "@/lib/pricing";
import { CancelOrder, OrderLink } from "./OrderLink";
import PayPanel from "./PayPanel";

/**
 * The cards in the customer's chat: every step of the order is a line to tap open, the pay form
 * lives in its card, and a payment the cafe couldn't find stands out in red with the form again.
 */
export type CardContext = {
  order: FullOrder;
  token: string;
  branch: Branch;
  cafe: string;
  chat: ChatState;
  accounts: PayAccount[];
  at: (d: Date) => string;
};

type Tone = "done" | "now" | "pay" | "alert" | "off";

function ChatCard({ tone, title, sub, time, open, children }: { tone: Tone; title: string; sub?: ReactNode; time: string; open: boolean; children: ReactNode }) {
  return (
    <details className={`chat-card is-${tone}`} open={open}>
      <summary>
        <span className="chat-card-icon" aria-hidden="true"><ToneIcon tone={tone} /></span>
        <span className="chat-card-title">
          <b>{title}</b>
          {sub && <small>{sub}</small>}
        </span>
        <small className="chat-card-time">{time}</small>
      </summary>
      <div className="chat-card-body">{children}</div>
    </details>
  );
}

/** Where and when, who it's for, and what's in it */
export function OrderDetails({ ctx }: { ctx: CardContext }) {
  const { order: o, branch, cafe, at } = ctx;
  const delivery = o.fulfillment === "delivery";
  const when = o.wantedAt ? `Today, ${at(o.wantedAt)}` : delivery ? "As soon as possible" : "As soon as it's ready";
  return (
    <>
      <dl className="track-facts">
        {delivery ? (
          <div>
            <dt>Deliver to</dt>
            <dd>
              {o.address}
              <small>{[o.landmark, o.distanceMeters != null && `about ${formatDistance(o.distanceMeters)} from ${cafe}`].filter(Boolean).join(" · ")}</small>
            </dd>
          </div>
        ) : (
          <div><dt>Pickup</dt><dd>{branch.name}<small>{branch.address} · <a href={branch.mapsUrl} target="_blank" rel="noopener noreferrer">Directions</a></small></dd></div>
        )}
        <div><dt>When</dt><dd>{when}</dd></div>
        <div><dt>Name</dt><dd>{o.customerName}<small>{formatPhone(o.customerPhone)}</small></dd></div>
        {o.notes && <div><dt>Notes</dt><dd>{o.notes}</dd></div>}
      </dl>
      <Receipt order={o} />
    </>
  );
}

/** What's in the order, with the fee and the total */
function Receipt({ order: o }: { order: FullOrder }) {
  const fee = o.deliveryFee === null ? "Set by the cafe" : o.deliveryFee === 0 ? "Free" : peso(o.deliveryFee);
  return (
    <ul className="track-items">
      {o.items.map((i) => (
        <li key={i.id}>
          <span>
            {i.qty} × {i.name}
            {(i.size || i.upsized || i.addons.length > 0) && <small>{[i.size, i.upsized && "upsized", ...i.addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(" · ")}</small>}
          </span>
          <span>{peso(i.lineTotal)}</span>
        </li>
      ))}
      {o.fulfillment === "delivery" && <li className="track-fee"><span>Delivery</span><span>{fee}</span></li>}
      <li className="track-total"><span>Total</span><span>{peso(o.total)}</span></li>
    </ul>
  );
}

/** The first card, drawn from the order itself: what was ordered, the private link, and Cancel while allowed */
export function PlacedCard({ ctx, open }: { ctx: CardContext; open: boolean }) {
  const { order: o, token, at } = ctx;
  const delivery = o.fulfillment === "delivery";
  const count = o.items.reduce((n, i) => n + i.qty, 0);
  const canCancel = o.paymentStatus === "unpaid" && (o.status === "pending" || o.status === "awaiting_payment");
  return (
    <ChatCard tone={o.status === "pending" ? "now" : "done"} title="Order sent" sub={`${count} item${count === 1 ? "" : "s"} · ${peso(o.total)}`} time={at(o.createdAt)} open={open}>
      <OrderDetails ctx={ctx} />
      {!delivery && o.status !== "cancelled" && o.status !== "done" && <p className="track-pay">Pay at the counter when you pick up: cash or GCash.</p>}
      {delivery && o.status === "pending" && (
        <p className="track-pay">
          {o.paymentMethod === "cash"
            ? cashNote(o.total, o.cashTendered)
            : "You’ll pay by GCash, Maya or bank transfer here once the cafe accepts your order. Nothing to pay yet."}
        </p>
      )}
      {o.status !== "done" && o.status !== "cancelled" && <OrderLink code={o.code} />}
      {canCancel && <CancelOrder code={o.code} token={token} />}
    </ChatCard>
  );
}

/** A line's card. `live` puts the pay form in it; `open` is the card for where the order is now. */
export function LineCard({ card, body, time, ctx, open, live }: { card: Card; body: string; time: string; ctx: CardContext; open: boolean; live: boolean }) {
  const { order: o, branch, chat, at } = ctx;
  const delivery = o.fulfillment === "delivery";
  const pay = live && <PayPanel code={o.code} token={ctx.token} total={o.total} accounts={ctx.accounts} sent={null} bare />;

  switch (card.kind) {
    case "quote":
      return live ? (
        <ChatCard tone="pay" title={`Pay ${peso(card.total)}`} sub={`Delivery ${card.fee ? peso(card.fee) : "free"} · total ${peso(card.total)}`} time={time} open>
          {pay}
        </ChatCard>
      ) : (
        <ChatCard tone="done" title={card.requote ? "Delivery fee changed" : "Order confirmed"} sub={`Delivery ${card.fee ? peso(card.fee) : "free"} · total ${peso(card.total)}`} time={time} open={open}>
          <p>{body}</p>
        </ChatCard>
      );
    case "pay_sent":
      return (
        <ChatCard tone={o.paymentStatus === "submitted" ? "now" : "done"} title="Payment sent" sub={`Reference ${card.ref}`} time={time} open={open}>
          <p>
            You sent <b>{peso(card.amount)}</b> to {card.account}, reference <b className="nowrap">{card.ref}</b>.
            {o.paymentStatus === "submitted" && " The cafe is checking it. It usually takes a few minutes, and this page updates by itself."}
          </p>
        </ChatCard>
      );
    case "pay_ok":
      return (
        <ChatCard tone="done" title="Payment received" sub={peso(card.amount)} time={time} open={open}>
          <p>{peso(card.amount)} paid. The cafe accepted your order.</p>
        </ChatCard>
      );
    case "pay_missing":
      return (
        <ChatCard tone="alert" title="We couldn't find your payment" sub={`${peso(card.amount)}${card.ref ? ` · reference ${card.ref}` : ""}`} time={time} open={open || live}>
          <p>
            {card.reason ? `${card.reason}.` : "The cafe couldn't find it in their app yet."} Check the reference number on your receipt and
            {" "}send it again{live ? " below" : ""}, or message the cafe here.
          </p>
          {pay}
        </ChatCard>
      );
    case "step":
      switch (card.status) {
        case "accepted":
          return (
            <ChatCard tone="done" title="Accepted" sub={o.wantedAt ? `Ready by ${at(o.wantedAt)}` : "We'll start on it shortly"} time={time} open={open}>
              <p>{body}</p>
              {o.paymentMethod === "cash" && o.status !== "done" && o.status !== "cancelled" && <p className="track-pay">{cashNote(o.total, o.cashTendered)}</p>}
            </ChatCard>
          );
        case "preparing":
          return (
            <ChatCard tone={o.status === "preparing" ? "now" : "done"} title="Being prepared" time={time} open={open}>
              <p>{body}</p>
            </ChatCard>
          );
        case "ready":
          return delivery ? (
            <ChatCard tone={o.status === "ready" ? "now" : "done"} title="Ready" sub="Waiting for the rider" time={time} open={open}>
              <p>{body}</p>
            </ChatCard>
          ) : (
            <ChatCard tone={o.status === "ready" ? "now" : "done"} title="Ready for pickup" sub="Show your code at the counter" time={time} open={open}>
              <p className="chat-card-code">{o.code}</p>
              <p>
                {branch.name} · {branch.address} · <a href={branch.mapsUrl} target="_blank" rel="noopener noreferrer">Directions</a>
              </p>
              {o.status === "ready" && <p className="track-pay">Pay at the counter: cash or GCash.</p>}
            </ChatCard>
          );
        case "out_for_delivery":
          return (
            <ChatCard tone={o.status === "out_for_delivery" ? "now" : "done"} title="On its way" sub={card.provider === "lalamove" ? "With a Lalamove rider" : "With our rider"} time={time} open={open}>
              <p>To {o.address}{o.landmark ? ` (${o.landmark})` : ""}.</p>
              {o.paymentMethod === "cash" && o.status === "out_for_delivery" && <p className="track-pay">{cashNote(o.total, o.cashTendered)}</p>}
              {card.provider === "lalamove" && o.trackingUrl && o.status === "out_for_delivery" && (
                <a href={o.trackingUrl} className="track-rider" target="_blank" rel="noopener noreferrer">Track your rider</a>
              )}
            </ChatCard>
          );
        case "done":
          return (
            <ChatCard tone="done" title={delivery ? "Delivered" : "Picked up"} sub={chat.open ? `Chat open until ${at(chat.closesAt)}` : "Thanks for ordering!"} time={time} open={open}>
              <p>{body}</p>
              <Receipt order={o} />
            </ChatCard>
          );
        case "cancelled":
          return (
            <ChatCard tone="off" title="Cancelled" sub={card.byCustomer ? "By you" : (o.cancelReason ?? undefined)} time={time} open={open}>
              <p>{body}</p>
            </ChatCard>
          );
        default:
          return null;
      }
  }
}

/** The pay form for an order quoted before cards existed: added at the end of the chat */
export function AddedPayCard({ ctx }: { ctx: CardContext }) {
  const { order: o } = ctx;
  return (
    <ChatCard tone="pay" title={`Pay ${peso(o.total)}`} sub={o.deliveryFee ? `Delivery ${peso(o.deliveryFee)} · total ${peso(o.total)}` : `Total ${peso(o.total)}`} time={o.quotedAt ? ctx.at(o.quotedAt) : ""} open>
      <PayPanel code={o.code} token={ctx.token} total={o.total} accounts={ctx.accounts} sent={null} bare />
    </ChatCard>
  );
}

function ToneIcon({ tone }: { tone: Tone }) {
  const path =
    tone === "done" ? <path d="m6.5 12.5 3.5 3.5 7.5-8" />
      : tone === "alert" ? <><path d="M12 7.5v5.5" /><path d="M12 16.4v.1" strokeWidth={2.6} /></>
        : tone === "pay" ? <><path d="M9 17V7h3.6a2.9 2.9 0 0 1 0 5.8H9" /><path d="M7.5 9.6h9M7.5 11.4h9" /></>
          : tone === "off" ? <path d="m8.5 8.5 7 7m0-7-7 7" />
            : <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />;
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}
