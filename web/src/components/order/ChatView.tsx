"use client";

import { useEffect, useId, useOptimistic, useState, useTransition } from "react";
import { MESSAGE_MAX, type Sender } from "@/lib/order-rules";

/** One chat line, ready to show. Times are formatted on the server, so both renders agree. */
export type ChatLine = { id: string; sender: Sender; body: string; time: string; who: string | null; sending?: boolean };

type Props = {
  side: "customer" | "staff";
  lines: ChatLine[];
  open: boolean;
  /** Messages from the other side this person hasn't seen yet */
  unread: number;
  myName: string;
  placeholder: string;
  emptyNote: React.ReactNode;
  closedNote: React.ReactNode;
  /** Ready-made replies that fill the box, for staff on a busy night */
  suggestions?: string[];
  send: (body: string) => Promise<{ error?: string }>;
  seen: () => Promise<void>;
};

/** The order chat, shared by the customer's order page and the staff order page */
export default function ChatView({ side, lines, open, unread, myName, placeholder, emptyNote, closedNote, suggestions, send, seen }: Props) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [shown, addSending] = useOptimistic(lines, (now: ChatLine[], line: ChatLine) => [...now, line]);

  // New messages count as read once this page is actually on screen
  const lastId = lines.at(-1)?.id;
  useEffect(() => {
    if (unread === 0) return;
    const look = () => { if (document.visibilityState === "visible") seen().catch(() => {}); };
    look();
    document.addEventListener("visibilitychange", look);
    return () => document.removeEventListener("visibilitychange", look);
  }, [unread, lastId, seen]);

  const submit = () => {
    const body = text.trim();
    if (!body || pending) return;
    setError(null);
    start(async () => {
      addSending({ id: `sending-${Date.now()}`, sender: side, body, time: "", who: myName, sending: true });
      setText("");
      const r = await send(body);
      if (r.error) {
        setError(r.error);
        setText(body);
      }
    });
  };

  const left = MESSAGE_MAX - text.length;

  return (
    <div className={`chat is-${side}`}>
      {shown.length > 0 ? (
        <ol className="chat-log" aria-label="Messages" aria-live="polite">
          {shown.map((l) =>
            l.sender === "system" ? (
              <li key={l.id} className="chat-line is-system">
                <p>{l.body} <small>· {l.time}</small></p>
              </li>
            ) : (
              <li key={l.id} className={`chat-line ${l.sender === side ? "is-mine" : "is-theirs"}${l.sending ? " is-sending" : ""}`}>
                <p className="chat-bubble">{l.body}</p>
                <small>{l.who} · {l.sending ? "Sending…" : l.time}</small>
              </li>
            ),
          )}
        </ol>
      ) : (
        open && <p className="chat-empty">{emptyNote}</p>
      )}

      {open ? (
        <form className="chat-compose" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          {suggestions && suggestions.length > 0 && (
            <div className="chat-quick" role="group" aria-label="Quick replies">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => { setText(s); setError(null); }}>{s}</button>
              ))}
            </div>
          )}
          <label htmlFor={`${id}-msg`} className="sr-only">Message</label>
          <div className="chat-box">
            <textarea
              id={`${id}-msg`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  submit();
                }
              }}
              rows={2}
              maxLength={MESSAGE_MAX}
              enterKeyHint="send"
              placeholder={placeholder}
            />
            <button type="submit" className="chat-send" disabled={pending || !text.trim()}>{pending ? "Sending…" : "Send"}</button>
          </div>
          {left < 80 && <small className="chat-left">{left} characters left</small>}
          {error && <p className="chat-error" role="alert">{error}</p>}
        </form>
      ) : (
        <p className="chat-closed">{closedNote}</p>
      )}
    </div>
  );
}
