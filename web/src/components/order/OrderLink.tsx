"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { cancelOrderAction } from "@/app/order/actions";

const KEY = "em-orders";
type Remembered = { code: string; url: string; at: number };

/** Saves this order's private link on the phone, so the customer can get back to it */
export function rememberOrder(code: string, url: string) {
  try {
    const list: Remembered[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    const next = [{ code, url, at: Date.now() }, ...list.filter((o) => o.code !== code)].slice(0, 5);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage blocked: the copy and share buttons still work
  }
}

const noSubscribe = () => () => {};

export function OrderLink({ code }: { code: string }) {
  const url = useSyncExternalStore(noSubscribe, () => window.location.href, () => "");
  const canShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (url) rememberOrder(code, url);
  }, [code, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };
  const share = () => navigator.share({ title: `Enero Marso order ${code}`, url }).catch(() => {});

  return (
    <div className="track-link">
      <p>
        <b>Keep this page.</b> It&rsquo;s your private link to this order, and this phone remembers it. Anyone with the link can see the order, so share it only with whoever is picking up.
      </p>
      <div className="track-link-actions">
        <button type="button" className="pill-btn" onClick={copy} disabled={!url}>{copied ? "Link copied" : "Copy link"}</button>
        {canShare && <button type="button" className="pill-btn" onClick={share}>Share</button>}
      </div>
    </div>
  );
}

export function CancelOrder({ code, token }: { code: string; token: string }) {
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const go = () => start(async () => {
    const r = await cancelOrderAction(code, token);
    if (r.error) setError(r.error);
    setAsking(false);
  });

  return (
    <div className="track-cancel">
      {asking ? (
        <span role="group" aria-label="Cancel this order?">
          Cancel this order?
          <button type="button" className="track-cancel-yes" onClick={go} disabled={pending}>{pending ? "Cancelling…" : "Yes, cancel it"}</button>
          <button type="button" className="order-link" onClick={() => setAsking(false)}>Keep it</button>
        </span>
      ) : (
        <button type="button" className="order-link" onClick={() => setAsking(true)}>Cancel order</button>
      )}
      {error && <p className="slip-error" role="alert">{error}</p>}
    </div>
  );
}
