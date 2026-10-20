import type { Metadata } from "next";
import CopyText from "@/components/CopyText";
import LiveRefresh from "@/components/LiveRefresh";
import PinMap from "@/components/map/PinMap";
import ClockButton from "@/components/staff/ClockButton";
import RiderActions from "@/components/staff/RiderActions";
import StaffChat from "@/components/staff/StaffChat";
import { cashLine } from "@/lib/cash";
import { openShift } from "@/lib/clock";
import { formatDistance, mapsLink } from "@/lib/delivery";
import { peso } from "@/lib/menu";
import { listMessages } from "@/lib/order-chat";
import { chatState, unreadCount, type OrderStatus } from "@/lib/order-rules";
import { getOrderSettings, type FullOrder } from "@/lib/orders";
import { formatPhone } from "@/lib/pricing";
import { channels } from "@/lib/realtime";
import { myDeliveries } from "@/lib/riders";
import { ALL_ROLES, clocksIn } from "@/lib/roles";
import { manila, requireStaff } from "@/lib/staff";

export const metadata: Metadata = { title: "Deliveries" };

const STATE: Partial<Record<OrderStatus, string>> = {
  accepted: "Being made",
  preparing: "Being made",
  ready: "Ready to take",
  out_for_delivery: "On the way",
};

/** Ready-made replies for the road */
const QUICK = ["I'm on my way, about 10 minutes.", "I'm outside. Please come out to the gate.", "I can't find the place. Could you send a landmark?"];

/**
 * The rider's screen (riders, and counter staff sent out with a delivery): what to take where, what
 * to collect, the customer's number and chat, and two buttons. Only their own deliveries.
 */
export default async function DeliveriesPage({ searchParams }: PageProps<"/staff/deliveries">) {
  const me = await requireStaff(ALL_ROLES);
  const sp = await searchParams;
  const [{ active, finished }, shift, settings] = await Promise.all([
    myDeliveries(me),
    clocksIn(me.role) ? openShift(me.id) : null,
    getOrderSettings(),
  ]);
  const chats = await Promise.all(active.map((o) => listMessages(o.id)));
  const cash = finished.filter((o) => o.paymentMethod === "cash" && o.paymentVerifiedBy === me.id).reduce((n, o) => n + o.total, 0);
  const branchIds = [...new Set([...active, ...finished].map((o) => o.branchId).concat(me.branchId ? [me.branchId] : []))];

  return (
    <div className="staff-page">
      <LiveRefresh channels={branchIds.map(channels.branch)} />
      <header className="staff-head is-split">
        <div>
          <h1>Deliveries</h1>
          <p>
            {active.length
              ? `${active.length} to deliver`
              : "Nothing to deliver right now. New ones show up here, and on your phone if notifications are on (Account)."}
          </p>
        </div>
        {clocksIn(me.role) && <ClockButton clockedIn={!!shift} />}
      </header>
      {sp.welcome && <p className="staff-note is-ok">Your account is ready.</p>}

      {active.map((o, i) => (
        <RiderCard key={o.id} order={o} store={settings[o.branchId as "main" | "noir"]?.delivery.store ?? null} chat={chats[i]} myName={me.name} />
      ))}

      {finished.length > 0 && (
        <section className="staff-card rider-done" aria-labelledby="done-title">
          <h2 id="done-title">Delivered today</h2>
          <ul>
            {finished.map((o) => (
              <li key={o.id}>
                <b>{o.code}</b>
                <span>{o.doneAt && manila.time(o.doneAt)}</span>
                <span>{o.paymentMethod === "cash" ? "Cash" : "Paid online"}</span>
                <span className="num">{peso(o.total)}</span>
              </li>
            ))}
          </ul>
          {cash > 0 && <p className="rider-cash-total">Cash you collected: <b>{peso(cash)}</b>. Hand it to the counter before you clock out.</p>}
        </section>
      )}
    </div>
  );
}

function RiderCard({ order: o, store, chat, myName }: { order: FullOrder; store: { lat: number; lng: number } | null; chat: Awaited<ReturnType<typeof listMessages>>; myName: string }) {
  const first = o.customerName.split(" ")[0];
  const pin = o.lat != null && o.lng != null ? { lat: o.lat, lng: o.lng } : null;
  const state = chatState(o);
  const lines = chat.map((m) => ({
    id: m.id, sender: m.sender, body: m.body, time: manila.time(m.createdAt), kind: m.kind,
    who: m.sender === "customer" ? first : m.sender === "staff" ? (m.staffName ?? "Staff") : null,
  }));
  return (
    <article id={`order-${o.id}`} className={`staff-card rider-card is-${o.status}`} aria-labelledby={`r-${o.id}`}>
      <header className="rider-card-head">
        <h2 id={`r-${o.id}`}>{o.code}</h2>
        <span className={`tag${o.status === "out_for_delivery" ? " is-ok" : o.status === "ready" ? " is-warn" : ""}`}>{STATE[o.status]}</span>
        <span className="rider-card-when">{o.wantedAt ? `For ${manila.time(o.wantedAt)}` : "As soon as possible"}</span>
      </header>

      <p className={`rider-collect${o.paymentMethod === "cash" ? " is-cash" : ""}`}>
        {o.paymentMethod === "cash" ? cashLine(o.total, o.cashTendered) : "Paid online · nothing to collect"}
      </p>

      <div className="rider-where">
        <p>
          <b>{o.address}</b>
          {o.landmark && <small>{o.landmark}</small>}
          {o.distanceMeters != null && <small>About {formatDistance(o.distanceMeters)} from the branch</small>}
        </p>
        <div className="rider-where-do">
          {pin && <a className="staff-btn" href={mapsLink(pin)} target="_blank" rel="noopener noreferrer">Directions</a>}
          <a className="staff-btn" href={`tel:${o.customerPhone}`}>Call {first} · {formatPhone(o.customerPhone)}</a>
          {o.plusCode && <CopyText text={o.plusCode} label={`Copy ${o.plusCode}`} className="staff-btn" />}
        </div>
        {pin && <PinMap pin={pin} center={pin} store={store} label={`Where to deliver ${o.code}`} />}
      </div>

      <ul className="rider-items">
        {o.items.map((i) => (
          <li key={i.id}>
            <b>{i.qty}×</b> {i.name}
            {(i.size || i.upsized || i.addons.length > 0) && <small>{[i.size, i.upsized && "upsized", ...i.addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(" · ")}</small>}
          </li>
        ))}
      </ul>
      {o.notes && <p className="order-card-notes">&ldquo;{o.notes}&rdquo;</p>}

      <RiderActions id={o.id} status={o.status} cash={o.paymentMethod === "cash"} total={o.total} />

      <details className="rider-chat" open={unreadCount(chat, "staff", o.staffLastReadAt) > 0 || undefined}>
        <summary>Chat with {first}</summary>
        <StaffChat
          orderId={o.id}
          delivery
          lines={lines}
          open={state.open}
          unread={0}
          myName={myName}
          customer={first}
          quick={QUICK}
          closedNote={`This chat has closed. Call ${first} instead.`}
        />
      </details>
    </article>
  );
}
