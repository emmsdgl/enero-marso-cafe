"use client";

import { useState, useTransition } from "react";
import { reissueLinkAction } from "@/app/staff/orders/actions";
import { formatPhone } from "@/lib/pricing";

/**
 * For a customer who lost their order page: make a new private link and text it to them.
 * The new link is only shown here, once; the old one stops working.
 */
export default function ReissueLink({ orderId, code, phone }: { orderId: string; code: string; phone: string }) {
  const [asking, setAsking] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const make = () =>
    start(async () => {
      setError(null);
      const r = await reissueLinkAction(orderId);
      if (r.error || !r.path) return setError(r.error ?? "Couldn't make a new link. Try again.");
      setUrl(`${window.location.origin}${r.path}`);
      setAsking(false);
    });

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  if (url) {
    const sms = `sms:${phone}?&body=${encodeURIComponent(`Enero Marso: here's the new link to your order ${code}: ${url}`)}`;
    return (
      <div className="relink">
        <p className="staff-note is-ok">New link ready. Send it to the customer now: it&rsquo;s only shown here once.</p>
        <input className="relink-url" readOnly value={url} aria-label="New order link" onFocus={(e) => e.currentTarget.select()} />
        <div className="relink-actions">
          <button type="button" className="staff-btn is-primary" onClick={copy}>{copied ? "Copied" : "Copy link"}</button>
          <a className="staff-btn" href={sms}>Text it to {formatPhone(phone)}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="relink">
      <p className="staff-help">
        Customer lost their order page? Make a new link and text it to them. Their old link stops working, which also helps if it reached the wrong person.
      </p>
      {asking ? (
        <div className="staff-confirm" role="group" aria-label="Make a new link?">
          The current link will stop working.
          <button type="button" className="staff-btn is-primary is-small" disabled={pending} onClick={make}>{pending ? "Making…" : "Make new link"}</button>
          <button type="button" className="staff-btn is-quiet is-small" onClick={() => setAsking(false)}>Keep it</button>
        </div>
      ) : (
        <button type="button" className="staff-btn" onClick={() => setAsking(true)}>Make a new link</button>
      )}
      {error && <p className="staff-msg is-error" role="alert">{error}</p>}
    </div>
  );
}
