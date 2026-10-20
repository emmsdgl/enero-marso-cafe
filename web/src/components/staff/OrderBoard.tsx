"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { moveOrderAction } from "@/app/staff/orders/actions";
import CopyText from "@/components/CopyText";
import { useTabTitle } from "@/components/useTabTitle";
import { useWakeLock } from "@/components/useWakeLock";
import { branches } from "@/data/branches";
import { formatDistance, mapsLink } from "@/lib/delivery";
import { peso } from "@/lib/menu";
import type { Unread } from "@/lib/order-chat";
import { COULDNT_DELIVER_REASONS, nextStatuses, statusLabel, type OrderStatus } from "@/lib/order-rules";
import { formatPhone } from "@/lib/pricing";
import type { FullOrder } from "@/lib/orders";
import type { RiderChoice } from "@/lib/riders";
import DeliveryActions from "./DeliveryActions";

const STEP_LABEL: Partial<Record<OrderStatus, string>> = {
  accepted: "Accept",
  preparing: "Start preparing",
  ready: "Mark ready",
  out_for_delivery: "Out for delivery",
  done: "Picked up",
};
const REASONS = ["An item ran out", "Too busy right now", "We're closing soon", "Customer asked to cancel", "Couldn't reach the customer"];

// A shared clock for "12 min ago": ticks every 15 s, and is blank in the server render
const subscribeClock = (tick: () => void) => {
  const t = window.setInterval(tick, 15_000);
  return () => window.clearInterval(t);
};
const clockNow = () => Math.floor(Date.now() / 15_000) * 15_000;
const useNow = () => useSyncExternalStore(subscribeClock, clockNow, () => null);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const time = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
const due = (o: FullOrder) => (o.wantedAt ?? o.createdAt).getTime();
/** Orders waiting on staff: new ones, and delivery payments to check */
const needsStaff = (o: FullOrder) => o.status === "pending" || (o.status === "awaiting_payment" && o.paymentStatus === "submitted");
const waitingSince = (o: FullOrder) => (o.status === "pending" ? o.createdAt : (o.paymentSubmittedAt ?? o.updatedAt)).getTime();

/** What the cards need to know beyond the order itself */
export type BoardContext = {
  /** Free delivery radius per branch, in meters */
  freeWithin: Record<string, number>;
  /** Payment account names by id */
  accounts: Record<string, string>;
  /** Other orders that used the same payment reference */
  clashes: Record<string, string[]>;
  /** Who can take each branch's deliveries now: riders, and counter staff on shift */
  riders: Record<string, RiderChoice[]>;
  /** Names of the people already taking these deliveries */
  riderNames: Record<string, string>;
  /** Managers can call off a delivery that's out ("Couldn't deliver") */
  manager: boolean;
};

/** Two rising notes from the Web Audio API: no sound file to load, works offline */
function useChime() {
  const ctx = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(false);
  // Two rising notes for a new order, one softer note for a new message
  const play = useCallback((kind: "order" | "message" = "order") => {
    const c = ctx.current;
    if (!c || c.state !== "running") return;
    (kind === "order" ? [784, 1047] : [659]).forEach((freq, i) => {
      const t = c.currentTime + i * 0.2;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(c.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  }, []);
  // Browsers only allow sound after a tap, so staff switch it on once per visit
  const toggle = async () => {
    if (on) return setOn(false);
    ctx.current ??= new AudioContext();
    await ctx.current.resume();
    setOn(true);
    play();
  };
  return { on, toggle, play };
}

/** Keeps a tablet's screen from sleeping while the board is open */
type Props = { orders: FullOrder[]; unread: Record<string, Unread>; showBranch: boolean; context: BoardContext };

export default function OrderBoard({ orders, unread, showBranch, context }: Props) {
  const chime = useChime();
  const screen = useWakeLock();
  const [fresh, setFresh] = useState<string[]>([]);
  const seen = useRef<Set<string> | null>(null);

  // Chime and highlight when something new needs staff: an order, or a delivery payment to check
  const { play } = chime;
  useEffect(() => {
    const key = (o: FullOrder) => `${o.id}:${o.status}:${o.paymentStatus}`;
    const known = seen.current;
    seen.current = new Set(orders.filter(needsStaff).map(key));
    if (!known) return;
    const arrived = orders.filter((o) => needsStaff(o) && !known.has(key(o))).map((o) => o.id);
    if (arrived.length === 0) return;
    setFresh((f) => [...f, ...arrived]);
    play();
    // Not cleared on the next refresh, so the highlight always lasts its full 15 seconds
    window.setTimeout(() => setFresh((f) => f.filter((id) => !arrived.includes(id))), 15_000);
  }, [orders, play]);

  // A softer chime when a customer writes (not for messages already waiting when the board opened)
  const unreadTotal = Object.values(unread).reduce((n, u) => n + u.count, 0);
  const lastUnread = useRef<number | null>(null);
  useEffect(() => {
    const before = lastUnread.current;
    lastUnread.current = unreadTotal;
    if (before !== null && unreadTotal > before) play("message");
  }, [unreadTotal, play]);

  const waiting = orders.filter(needsStaff);
  const oldestWaiting = waiting.length ? Math.min(...waiting.map(waitingSince)) : null;
  // Keep reminding while a new order or a payment sits untouched for more than a minute
  useEffect(() => {
    if (!chime.on || oldestWaiting === null) return;
    const t = window.setInterval(() => {
      if (Date.now() - oldestWaiting > 60_000) play();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [chime.on, oldestWaiting, play]);

  // The tab title says what's waiting
  const chats = Object.keys(unread).length;
  const newOrders = waiting.filter((o) => o.status === "pending").length;
  const payments = waiting.length - newOrders;
  const waitingCount = newOrders + payments + chats;
  const what = [
    newOrders && plural(newOrders, "new order"),
    payments && `${plural(payments, "payment")} to check`,
    chats && plural(chats, "message"),
  ].filter(Boolean).join(", ");
  useTabTitle(waitingCount ? `(${waitingCount}) ${what.charAt(0).toUpperCase()}${what.slice(1)} · Orders` : "Orders · Staff · Enero Marso");

  const byDue = (list: FullOrder[]) => [...list].sort((a, b) => due(a) - due(b));
  const columns = [
    { key: "new", title: "New", empty: "No new orders.", list: byDue(orders.filter((o) => o.status === "pending" || o.status === "awaiting_payment")) },
    { key: "work", title: "In progress", empty: "Nothing being made.", list: byDue(orders.filter((o) => o.status === "accepted" || o.status === "preparing")) },
    { key: "ready", title: "Ready", empty: "Nothing waiting to go.", list: byDue(orders.filter((o) => o.status === "ready" || o.status === "out_for_delivery")) },
  ];
  const finished = orders.filter((o) => o.status === "done" || o.status === "cancelled");
  // A message on a finished order ("my fries are missing") must not hide in the collapsed list
  const finishedNews = finished.filter((o) => unread[o.id]);

  return (
    <>
      <div className="board-tools" role="group" aria-label="Board settings">
        <button type="button" className={`staff-btn${chime.on ? " is-on" : ""}`} aria-pressed={chime.on} onClick={chime.toggle}>
          {chime.on ? "Sound on" : "Turn on sound"}
        </button>
        {screen.supported && (
          <button type="button" className={`staff-btn${screen.awake ? " is-on" : ""}`} aria-pressed={screen.awake} onClick={screen.toggle}>
            {screen.awake ? "Screen stays on" : "Keep screen on"}
          </button>
        )}
        {!chime.on && <small>Turn on sound so new orders ring, even when you&rsquo;re not looking.</small>}
      </div>

      {finishedNews.map((o) => (
        <p key={o.id} className="staff-note is-warn board-alert">
          <Link href={`/staff/orders/${o.id}`}>
            {plural(unread[o.id].count, "new message")} on finished order {o.code}
          </Link>
          <span>&ldquo;{unread[o.id].last}&rdquo;</span>
        </p>
      ))}

      <div className="board">
        {columns.map((c) => (
          <section key={c.key} className={`board-col is-${c.key}`} aria-labelledby={`col-${c.key}`}>
            <h2 id={`col-${c.key}`}>{c.title} <span className="board-count">{c.list.length}</span></h2>
            {c.list.length === 0 ? (
              <p className="board-empty">{c.empty}</p>
            ) : (
              c.list.map((o) => <OrderCard key={o.id} order={o} showBranch={showBranch} isNew={fresh.includes(o.id)} unread={unread[o.id]} context={context} />)
            )}
          </section>
        ))}
      </div>

      {finished.length > 0 && (
        <details className="staff-card board-done">
          <summary>Finished tonight · {finished.length}</summary>
          <ul>
            {finished.map((o) => (
              <li key={o.id} className={o.status === "cancelled" ? "is-cancelled" : undefined}>
                <Link href={`/staff/orders/${o.id}`}>{o.code}</Link>
                <span>{o.customerName}</span>
                <span>
                  {statusLabel(o.status, o.fulfillment)} {time(o.doneAt ?? o.cancelledAt ?? o.updatedAt)}{o.cancelReason && ` · ${o.cancelReason}`}
                  {o.status === "cancelled" && o.paymentStatus === "verified" && <b className="board-refund"> · Paid: refund {peso(o.total)}</b>}
                </span>
                <span className="num">{peso(o.total)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

type CardProps = { order: FullOrder; showBranch: boolean; isNew?: boolean; unread?: Unread; detail?: boolean; context: BoardContext };

/** What the customer still owes, or has paid */
function payLabel(o: FullOrder) {
  if (o.fulfillment === "pickup") return "Pay at counter";
  if (o.paymentStatus === "verified") return o.paymentMethod === "cash" ? "Paid in cash" : "Paid";
  if (o.paymentMethod === "cash") return "Cash on delivery";
  if (o.status === "pending") return "Pays online after you accept";
  if (o.paymentStatus === "submitted") return "Payment to check";
  return "Waiting for payment";
}

/** One order: on the board, and again at the top of its own page (detail) */
export function OrderCard({ order: o, showBranch, isNew = false, unread, detail = false, context }: CardProps) {
  const now = useNow();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const steps = nextStatuses(o.fulfillment, o.status);
  const delivery = o.fulfillment === "delivery";
  // Delivery's fee, payment and send-out steps have their own controls (DeliveryActions)
  const special = delivery && (o.status === "pending" || o.status === "awaiting_payment" || o.status === "ready");
  const live = delivery && o.status !== "done" && o.status !== "cancelled";
  const forward = special ? undefined : steps.find((s) => s !== "cancelled" && STEP_LABEL[s]);
  // A delivery that's out can only be called off by a manager, and says why it came back
  const out = o.status === "out_for_delivery";
  const canCancel = steps.includes("cancelled") && (!out || context.manager);
  const reasons: readonly string[] = out ? COULDNT_DELIVER_REASONS : REASONS;
  const forwardLabel = forward === "done" && delivery ? "Delivered" : forward && STEP_LABEL[forward];
  const minutes = now ? Math.max(0, Math.round((now - o.createdAt.getTime()) / 60_000)) : null;

  const go = (to: OrderStatus, why?: string) =>
    start(async () => {
      setError(null);
      const r = await moveOrderAction(o.id, o.status, to, why);
      if (r.error) setError(r.error);
      else setCancelling(false);
    });

  return (
    <article className={`order-card is-${o.status}${isNew ? " is-new" : ""}`} aria-labelledby={`o-${o.id}`}>
      <header>
        <h3 id={`o-${o.id}`}>{detail ? o.code : <Link href={`/staff/orders/${o.id}`}>{o.code}</Link>}</h3>
        <span className="order-card-when">{o.wantedAt ? `For ${time(o.wantedAt)}` : "ASAP"}</span>
      </header>
      {unread && !detail && (
        <Link href={`/staff/orders/${o.id}`} className="order-card-unread">
          <b>{plural(unread.count, "new message")}</b>
          <span>&ldquo;{unread.last}&rdquo;</span>
        </Link>
      )}
      <p className="order-card-meta">
        {delivery && <span className="order-card-kind">Delivery{o.distanceMeters != null && ` · ${formatDistance(o.distanceMeters)}`}</span>}
        {showBranch && <>{branches.find((b) => b.id === o.branchId)?.name.replace("Enero Marso ", "")} · </>}
        Placed {time(o.createdAt)}
        {minutes !== null && <> · {minutes < 1 ? "just now" : `${minutes} min ago`}</>}
      </p>
      <p className="order-card-who">
        <b>{o.customerName}</b> <a href={`tel:${o.customerPhone}`}>{formatPhone(o.customerPhone)}</a>
      </p>
      <ul className="order-card-items">
        {o.items.map((i) => (
          <li key={i.id}>
            <b>{i.qty}×</b> {i.name}
            {(i.size || i.upsized || i.addons.length > 0) && <small>{[i.size, i.upsized && "upsized", ...i.addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(" · ")}</small>}
          </li>
        ))}
      </ul>
      {delivery && o.address && (
        <div className="order-card-address">
          <p>{o.address}{o.landmark && <small>{o.landmark}</small>}</p>
          {o.lat != null && o.lng != null && (
            <span>
              <a href={mapsLink({ lat: o.lat, lng: o.lng })} target="_blank" rel="noopener noreferrer">Open map</a>
              <CopyText text={[o.address, o.landmark && `(${o.landmark})`, o.plusCode].filter(Boolean).join(" ")} label="Copy address" className="order-link" />
            </span>
          )}
        </div>
      )}
      {o.notes && <p className="order-card-notes">“{o.notes}”</p>}
      <p className={`order-card-total${o.paymentStatus === "verified" ? " is-paid" : ""}`}>
        <span>{payLabel(o)}{delivery && o.deliveryFee != null && <small>{o.deliveryFee ? `incl. ${peso(o.deliveryFee)} delivery` : "free delivery"}</small>}</span>
        <b>{peso(o.total)}</b>
      </p>
      {live && (
        <DeliveryActions
          order={o}
          accountLabel={o.paymentAccountId ? (context.accounts[o.paymentAccountId] ?? null) : null}
          clashes={context.clashes[o.id]}
          riders={context.riders[o.branchId] ?? []}
          riderName={o.riderId ? (context.riderNames[o.riderId] ?? null) : null}
        />
      )}

      {cancelling ? (
        <div className="order-card-cancel">
          <label>
            {out ? "Why couldn't it be delivered?" : "Why are you cancelling?"}
            <select value={reason ?? reasons[0]} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <div className="order-card-actions">
            <button type="button" className="staff-btn is-danger" disabled={pending} onClick={() => go("cancelled", reason ?? reasons[0])}>
              {pending ? "…" : out ? "Call off the delivery" : "Cancel order"}
            </button>
            <button type="button" className="staff-btn is-quiet" onClick={() => setCancelling(false)}>Keep it</button>
          </div>
        </div>
      ) : (
        <div className="order-card-actions">
          {forward && (
            <button type="button" className="staff-btn is-primary" disabled={pending} onClick={() => go(forward)}>
              {pending ? "Saving…" : forwardLabel}
            </button>
          )}
          {canCancel && (
            <button type="button" className="staff-btn is-quiet" disabled={pending} onClick={() => setCancelling(true)}>{out ? "Couldn’t deliver" : "Cancel"}</button>
          )}
        </div>
      )}
      {error && <p className="staff-msg is-error" role="alert">{error}</p>}
      {!detail && !unread && <Link href={`/staff/orders/${o.id}`} className="order-card-open">Details &amp; chat</Link>}
    </article>
  );
}
