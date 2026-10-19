"use client";

import { useCallback, type ReactNode } from "react";
import { markOrderSeen, sendCustomerMessage } from "@/app/order/actions";
import { useTabTitle } from "@/components/useTabTitle";
import ChatView, { type ChatLine } from "./ChatView";

type Props = {
  code: string;
  token: string;
  lines: ChatLine[];
  open: boolean;
  unread: number;
  branchName: string;
  closedNote: ReactNode;
  intro: ReactNode;
  cards: Record<string, ReactNode>;
  outro?: ReactNode;
};

/** The customer's whole order page below the header: the order's steps as cards, and the chat with the branch */
export default function CustomerChat({ code, token, lines, open, unread, branchName, closedNote, intro, cards, outro }: Props) {
  const send = useCallback((body: string) => sendCustomerMessage(code, token, body), [code, token]);
  const seen = useCallback(() => markOrderSeen(code, token), [code, token]);
  // Seen from another tab: a new message, or a payment the cafe couldn't find
  useTabTitle(`${unread ? `(${unread}) ` : ""}Your order ${code} · Enero Marso`);
  return (
    <ChatView
      side="customer"
      lines={lines}
      open={open}
      unread={unread}
      myName="You"
      placeholder={`Message ${branchName}`}
      emptyNote={<>Need to change something, or running late? Message {branchName} here. The staff see it on their order screen.</>}
      closedNote={closedNote}
      send={send}
      seen={seen}
      intro={intro}
      cards={cards}
      outro={outro}
    />
  );
}
