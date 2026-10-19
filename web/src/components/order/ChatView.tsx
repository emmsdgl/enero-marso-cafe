"use client";

import { useEffect, useId, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import { MESSAGE_MAX, type Sender } from "@/lib/order-rules";

/** One chat line, ready to show. Times are formatted on the server, so both renders agree. */
export type ChatLine = { id: string; sender: Sender; body: string; time: string; who: string | null; kind?: string; sending?: boolean };

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
  /** The customer's page: a card before the first line (the order itself) */
  intro?: ReactNode;
  /** Cards drawn by the page for system lines, by line id; lines without one show as text */
  cards?: Record<string, ReactNode>;
  /** A card after the last line (a pay form the order's lines don't carry) */
  outro?: ReactNode;
};

/** The order chat, shared by the customer's order page and the staff order page */
export default function ChatView({ side, lines, open, unread, myName, placeholder, emptyNote, closedNote, suggestions, send, seen, intro, cards, outro }: Props) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [shown, addSending] = useOptimistic(lines, (now: ChatLine[], line: ChatLine) => [...now, line]);

  // New messages count as read once the end of the chat is on screen, and the page is in front
  const lastId = lines.at(-1)?.id;
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const spot = end.current;
    if (unread === 0 || !spot) return;
    let inView = false;
    const look = () => { if (inView && document.visibilityState === "visible") seen().catch(() => {}); };
    const watch = new IntersectionObserver(([e]) => { inView = e.isIntersecting; look(); });
    watch.observe(spot);
    document.addEventListener("visibilitychange", look);
    return () => {
      watch.disconnect();
      document.removeEventListener("visibilitychange", look);
    };
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
      {shown.length > 0 || intro ? (
        <ol className="chat-log" aria-label="Messages" aria-live="polite">
          {intro && <li className="chat-line is-card">{intro}</li>}
          {shown.map((l) =>
            l.sender === "system" ? (
              cards?.[l.id] ? (
                <li key={l.id} className="chat-line is-card">{cards[l.id]}</li>
              ) : (
                <li key={l.id} className={`chat-line is-system${l.kind && l.kind !== "text" ? ` is-${l.kind.replace("_", "-")}` : ""}`}>
                  <p>{l.body} <small>· {l.time}</small></p>
                </li>
              )
            ) : (
              <li key={l.id} className={`chat-line ${l.sender === side ? "is-mine" : "is-theirs"}${l.sending ? " is-sending" : ""}`}>
                <p className="chat-bubble">{l.body}</p>
                <small>{l.who} · {l.sending ? "Sending…" : l.time}</small>
              </li>
            ),
          )}
          {outro && <li className="chat-line is-card">{outro}</li>}
        </ol>
      ) : null}
      {open && shown.length === 0 && <p className="chat-empty">{emptyNote}</p>}
      <div ref={end} id="chat-end" className="chat-end" />

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
