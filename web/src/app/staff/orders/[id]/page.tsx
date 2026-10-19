import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CopyText from "@/components/CopyText";
import LiveRefresh from "@/components/LiveRefresh";
import BlockNumber from "@/components/staff/BlockNumber";
import PinMap from "@/components/map/PinMap";
import { OrderCard } from "@/components/staff/OrderBoard";
import ReissueLink from "@/components/staff/ReissueLink";
import StaffChat from "@/components/staff/StaffChat";
import { blockedEntry } from "@/lib/blocklist";
import { formatDistance, mapsLink } from "@/lib/delivery";
import { listMessages } from "@/lib/order-chat";
import { chatState, statusLabel, unreadCount } from "@/lib/order-rules";
import { getOrderSettings, getStaffOrder } from "@/lib/orders";
import { channels } from "@/lib/realtime";
import { manila, requireStaff } from "@/lib/staff";
import { boardContext } from "../board-context";

export const metadata: Metadata = { title: "Order" };

/** One order: its details and buttons, where to deliver it, the chat with the customer, and a way to resend their link */
export default async function OrderDetailPage({ params }: PageProps<"/staff/orders/[id]">) {
  const me = await requireStaff();
  const order = await getStaffOrder(me, (await params).id);
  if (!order) notFound();

  const manager = me.role === "manager" || me.role === "admin";
  const [messages, context, settings, blocked] = await Promise.all([
    listMessages(order.id),
    boardContext([order], [order.branchId]),
    getOrderSettings(),
    manager && order.customerPhone ? blockedEntry(order.customerPhone) : null,
  ]);
  const chat = chatState(order);
  const firstName = order.customerName.split(" ")[0];
  const lines = messages.map((m) => ({
    id: m.id, sender: m.sender, body: m.body, time: manila.time(m.createdAt), kind: m.kind,
    who: m.sender === "customer" ? order.customerName : m.sender === "staff" ? (m.staffName ?? "Staff") : null,
  }));
  const pin = order.lat != null && order.lng != null ? { lat: order.lat, lng: order.lng } : null;
  const rules = settings[order.branchId as "main" | "noir"].delivery;

  return (
    <div className="staff-page">
      <LiveRefresh channels={[channels.order(order.id)]} />
      <header className="staff-head">
        <Link href="/staff/orders" className="staff-back">&larr; All orders</Link>
        <h1>Order {order.code}</h1>
        <p>
          {order.fulfillment === "delivery" ? "Delivery" : "Pickup"} · {statusLabel(order.status, order.fulfillment)} · placed {manila.date(order.createdAt)},{" "}
          {manila.time(order.createdAt)}
        </p>
      </header>

      <div className={`order-detail${pin ? " has-delivery" : ""}`}>
        <div className="order-detail-card">
          <OrderCard order={order} showBranch={me.role === "admin"} detail context={context} />
        </div>

        {pin && (
          <section className="staff-card order-detail-delivery" aria-labelledby="where-title">
            <h2 id="where-title">Deliver to</h2>
            <PinMap pin={pin} center={pin} store={rules.store} freeRadius={rules.freeWithin} label={`Where to deliver order ${order.code}`} />
            <dl className="delivery-facts">
              <div><dt>Address</dt><dd>{order.address}{order.landmark && <small>{order.landmark}</small>}</dd></div>
              {order.distanceMeters != null && <div><dt>Distance</dt><dd>About {formatDistance(order.distanceMeters)} from the branch, in a straight line</dd></div>}
              {order.plusCode && <div><dt>Plus Code</dt><dd><span className="nowrap">{order.plusCode}</span> <CopyText text={order.plusCode} /></dd></div>}
              {order.trackingUrl && <div><dt>Rider</dt><dd><a href={order.trackingUrl} target="_blank" rel="noopener noreferrer">Lalamove tracking</a></dd></div>}
            </dl>
            <div className="relink-actions">
              <a className="staff-btn" href={mapsLink(pin)} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
              <CopyText text={[order.address, order.landmark && `(${order.landmark})`, order.plusCode].filter(Boolean).join(" ")} label="Copy for Lalamove" className="staff-btn" />
            </div>
          </section>
        )}

        <section className="staff-card order-detail-link" aria-labelledby="link-title">
          <h2 id="link-title">Customer&rsquo;s link</h2>
          <ReissueLink orderId={order.id} code={order.code} phone={order.customerPhone} />
          {manager && order.customerPhone && (
            <BlockNumber
              orderId={order.id}
              phone={order.customerPhone}
              blocked={blocked ? { reason: blocked.reason, since: manila.date(blocked.createdAt) } : null}
            />
          )}
        </section>

        <section className="staff-card order-detail-chat" aria-labelledby="chat-title">
          <h2 id="chat-title">Chat with {firstName}</h2>
          <StaffChat
            orderId={order.id}
            delivery={order.fulfillment === "delivery"}
            lines={lines}
            open={chat.open}
            unread={unreadCount(messages, "staff", order.staffLastReadAt)}
            myName={me.name}
            customer={firstName}
            closedNote={
              chat.reason === "cancelled"
                ? "This chat closed when the order was cancelled."
                : `This chat closed at ${manila.time(chat.closesAt)}. To reach ${firstName} now, call them.`
            }
          />
        </section>
      </div>
    </div>
  );
}
