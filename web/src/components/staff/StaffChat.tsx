"use client";

import { useCallback } from "react";
import { markChatSeen, sendStaffMessage } from "@/app/staff/orders/actions";
import ChatView, { type ChatLine } from "@/components/order/ChatView";

/** Ready-made replies for a busy counter. They fill the box, so staff can still edit before sending. */
const QUICK = [
  "Got it, thank you!",
  "Sorry, that item just ran out. Would you like something else instead?",
  "We're a bit busy. Your order will take about 10 more minutes.",
  "Your order is ready at the counter.",
];

type Props = { orderId: string; lines: ChatLine[]; open: boolean; unread: number; myName: string; customer: string; closedNote: React.ReactNode };

export default function StaffChat({ orderId, lines, open, unread, myName, customer, closedNote }: Props) {
  const send = useCallback((body: string) => sendStaffMessage(orderId, body), [orderId]);
  const seen = useCallback(() => markChatSeen(orderId), [orderId]);
  return (
    <ChatView
      side="staff"
      lines={lines}
      open={open}
      unread={unread}
      myName={myName}
      placeholder={`Message ${customer}`}
      emptyNote={<>No messages yet. Anything you send here shows on {customer}&rsquo;s order page.</>}
      closedNote={closedNote}
      suggestions={QUICK}
      send={send}
      seen={seen}
    />
  );
}
