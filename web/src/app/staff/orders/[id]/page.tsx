import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LiveRefresh from "@/components/LiveRefresh";
import { OrderCard } from "@/components/staff/OrderBoard";
import ReissueLink from "@/components/staff/ReissueLink";
import StaffChat from "@/components/staff/StaffChat";
import { listMessages } from "@/lib/order-chat";
import { STATUS_LABEL, chatState, unreadCount } from "@/lib/order-rules";
import { getStaffOrder } from "@/lib/orders";
import { channels } from "@/lib/realtime";
import { manila, requireStaff } from "@/lib/staff";

export const metadata: Metadata = { title: "Order" };

/** One order: its details and buttons, the chat with the customer, and a way to resend their link */
export default async function OrderDetailPage({ params }: PageProps<"/staff/orders/[id]">) {
  const me = await requireStaff();
  const order = await getStaffOrder(me, (await params).id);
  if (!order) notFound();

  const messages = await listMessages(order.id);
  const chat = chatState(order);
  const firstName = order.customerName.split(" ")[0];
  const lines = messages.map((m) => ({
    id: m.id, sender: m.sender, body: m.body, time: manila.time(m.createdAt),
    who: m.sender === "customer" ? order.customerName : m.sender === "staff" ? (m.staffName ?? "Staff") : null,
  }));

  return (
    <div className="staff-page">
      <LiveRefresh channels={[channels.order(order.id)]} />
      <header className="staff-head">
        <Link href="/staff/orders" className="staff-back">&larr; All orders</Link>
        <h1>Order {order.code}</h1>
        <p>{STATUS_LABEL[order.status]} · placed {manila.date(order.createdAt)}, {manila.time(order.createdAt)}</p>
      </header>

      <div className="order-detail">
        <div className="order-detail-card">
          <OrderCard order={order} showBranch={me.role === "admin"} detail />
        </div>
        <section className="staff-card order-detail-link" aria-labelledby="link-title">
          <h2 id="link-title">Customer&rsquo;s link</h2>
          <ReissueLink orderId={order.id} code={order.code} phone={order.customerPhone} />
        </section>

        <section className="staff-card order-detail-chat" aria-labelledby="chat-title">
          <h2 id="chat-title">Chat with {firstName}</h2>
          <StaffChat
            orderId={order.id}
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
