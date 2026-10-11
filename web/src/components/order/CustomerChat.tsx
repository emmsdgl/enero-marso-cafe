"use client";

import { useCallback } from "react";
import { markOrderSeen, sendCustomerMessage } from "@/app/order/actions";
import ChatView, { type ChatLine } from "./ChatView";

type Props = {
  code: string;
  token: string;
  lines: ChatLine[];
  open: boolean;
  unread: number;
  branchName: string;
  closedNote: React.ReactNode;
};

export default function CustomerChat({ code, token, lines, open, unread, branchName, closedNote }: Props) {
  const send = useCallback((body: string) => sendCustomerMessage(code, token, body), [code, token]);
  const seen = useCallback(() => markOrderSeen(code, token), [code, token]);
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
    />
  );
}
