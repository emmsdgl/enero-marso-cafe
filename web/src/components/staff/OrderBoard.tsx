"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { moveOrderAction } from "@/app/staff/orders/actions";
import { branches } from "@/data/branches";
import { peso } from "@/lib/menu";
import { nextStatuses, type OrderStatus } from "@/lib/order-rules";
import { formatPhone } from "@/lib/pricing";
import type { FullOrder } from "@/lib/orders";

const STEP_LABEL: Partial<Record<OrderStatus, string>> = {
  accepted: "Accept",
  preparing: "Start preparing",
  ready: "Mark ready",
  out_for_delivery: "Out for delivery",
  done: "Picked up",
};
const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "New",
  awaiting_payment: "Awaiting payment",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "Out for delivery",
  done: "Picked up",
  cancelled: "Cancelled",
};
const REASONS = ["An item ran out", "Too busy right now", "We're closing soon", "Customer asked to cancel", "Couldn't reach the customer"];

const noSubscribe = () => () => {};
const time = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
const due = (o: FullOrder) => (o.wantedAt ?? o.createdAt).getTime();

/** Two rising notes from the Web Audio API: no sound file to load, works offline */
function useChime() {
  const ctx = useRef<AudioContext | null>(null);
  const [on, setOn] = useState(false);
  const play = useCallback(() => {
    const c = ctx.current;
    if (!c || c.state !== "running") return;
    [784, 1047].forEach((freq, i) => {
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
function useWakeLock() {
  const lock = useRef<WakeLockSentinel | null>(null);
  const supported = useSyncExternalStore(noSubscribe, () => "wakeLock" in navigator, () => false);
  const [awake, setAwake] = useState(false);
  useEffect(() => {
    if (!awake) {
      lock.current?.release().catch(() => {});
      lock.current = null;
      return;
    }
    const grab = () => navigator.wakeLock.request("screen").then((l) => { lock.current = l; }).catch(() => setAwake(false));
    grab();
    const again = () => document.visibilityState === "visible" && grab();
    document.addEventListener("visibilitychange", again);
    return () => document.removeEventListener("visibilitychange", again);
  }, [awake]);
  return { supported, awake, toggle: () => setAwake((a) => !a) };
}

export default function OrderBoard({ orders, showBranch }: { orders: FullOrder[]; showBranch: boolean }) {
  const chime = useChime();
  const screen = useWakeLock();
  const [now, setNow] = useState<number | null>(null);
  const [fresh, setFresh] = useState<string[]>([]);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, []);

  // Chime and highlight when an order arrives that wasn't on the board before
  const { play } = chime;
  useEffect(() => {
    const known = seen.current;
    seen.current = new Set(orders.map((o) => o.id));
    if (!known) return;
    const arrived = orders.filter((o) => !known.has(o.id)).map((o) => o.id);
    if (arrived.length === 0) return;
    setFresh((f) => [...f, ...arrived]);
    play();
    // Not cleared on the next refresh, so the highlight always lasts its full 15 seconds
    window.setTimeout(() => setFresh((f) => f.filter((id) => !arrived.includes(id))), 15_000);
  }, [orders, play]);

  const waiting = orders.filter((o) => o.status === "pending");
  const oldestWaiting = waiting.length ? Math.min(...waiting.map((o) => o.createdAt.getTime())) : null;
  // Keep reminding while a new order sits unaccepted for more than a minute
  useEffect(() => {
    if (!chime.on || oldestWaiting === null) return;
    const t = window.setInterval(() => {
      if (Date.now() - oldestWaiting > 60_000) play();
    }, 30_000);
    return () => window.clearInterval(t);
  }, [chime.on, oldestWaiting, play]);

  // The tab title counts waiting orders; Next sets its own title after us, so keep ours in place
  useEffect(() => {
    const want = waiting.length ? `(${waiting.length}) New order${waiting.length > 1 ? "s" : ""} · Orders` : "Orders · Staff · Enero Marso";
    const apply = () => { if (document.title !== want) document.title = want; };
    apply();
    const watch = new MutationObserver(apply);
    watch.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => watch.disconnect();
  }, [waiting.length]);

  const byDue = (list: FullOrder[]) => [...list].sort((a, b) => due(a) - due(b));
  const columns = [
    { key: "new", title: "New", empty: "No new orders.", list: byDue(orders.filter((o) => o.status === "pending" || o.status === "awaiting_payment")) },
    { key: "work", title: "In progress", empty: "Nothing being made.", list: byDue(orders.filter((o) => o.status === "accepted" || o.status === "preparing")) },
    { key: "ready", title: "Ready", empty: "Nothing waiting for pickup.", list: byDue(orders.filter((o) => o.status === "ready" || o.status === "out_for_delivery")) },
  ];
  const finished = orders.filter((o) => o.status === "done" || o.status === "cancelled");

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

      <div className="board">
        {columns.map((c) => (
          <section key={c.key} className={`board-col is-${c.key}`} aria-labelledby={`col-${c.key}`}>
            <h2 id={`col-${c.key}`}>{c.title} <span className="board-count">{c.list.length}</span></h2>
            {c.list.length === 0 ? (
              <p className="board-empty">{c.empty}</p>
            ) : (
              c.list.map((o) => <OrderCard key={o.id} order={o} showBranch={showBranch} now={now} isNew={fresh.includes(o.id)} />)
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
                <b>{o.code}</b>
                <span>{o.customerName}</span>
                <span>{STATUS_LABEL[o.status]} {time(o.doneAt ?? o.cancelledAt ?? o.updatedAt)}{o.cancelReason && ` · ${o.cancelReason}`}</span>
                <span className="num">{peso(o.total)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function OrderCard({ order: o, showBranch, now, isNew }: { order: FullOrder; showBranch: boolean; now: number | null; isNew: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const steps = nextStatuses(o.fulfillment, o.status);
  const forward = steps.find((s) => s !== "cancelled" && STEP_LABEL[s]);
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
        <h3 id={`o-${o.id}`}>{o.code}</h3>
        <span className="order-card-when">{o.wantedAt ? `For ${time(o.wantedAt)}` : "ASAP"}</span>
      </header>
      <p className="order-card-meta">
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
      {o.notes && <p className="order-card-notes">“{o.notes}”</p>}
      <p className="order-card-total"><span>Pay at counter</span><b>{peso(o.total)}</b></p>

      {cancelling ? (
        <div className="order-card-cancel">
          <label>
            Why are you cancelling?
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          <div className="order-card-actions">
            <button type="button" className="staff-btn is-danger" disabled={pending} onClick={() => go("cancelled", reason)}>{pending ? "…" : "Cancel order"}</button>
            <button type="button" className="staff-btn is-quiet" onClick={() => setCancelling(false)}>Keep it</button>
          </div>
        </div>
      ) : (
        <div className="order-card-actions">
          {forward && (
            <button type="button" className="staff-btn is-primary" disabled={pending} onClick={() => go(forward)}>
              {pending ? "Saving…" : STEP_LABEL[forward]}
            </button>
          )}
          {steps.includes("cancelled") && (
            <button type="button" className="staff-btn is-quiet" disabled={pending} onClick={() => setCancelling(true)}>Cancel</button>
          )}
        </div>
      )}
      {error && <p className="staff-msg is-error" role="alert">{error}</p>}
    </article>
  );
}
