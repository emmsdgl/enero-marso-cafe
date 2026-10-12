"use client";

import { useState, useTransition } from "react";
import { blockNumberAction, unblockNumberAction } from "@/app/staff/orders/actions";
import { BLOCK_REASONS } from "@/lib/order-rules";
import { formatPhone } from "@/lib/pricing";

/** On an order's page, for managers: stop this number ordering online (both branches), or undo it */
export default function BlockNumber({ orderId, phone, blocked }: { orderId: string; phone: string; blocked: { reason: string; since: string } | null }) {
  const [reason, setReason] = useState<string>(BLOCK_REASONS[0]);
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; error?: string } | null>(null);
  const [pending, start] = useTransition();
  const run = (act: () => Promise<{ ok?: string; error?: string }>) =>
    start(async () => {
      setMsg(await act());
      setAsking(false);
    });

  return (
    <div className="block-number">
      <h3>Block this number</h3>
      {blocked ? (
        <>
          <p className="staff-note is-warn">
            {formatPhone(phone)} can&rsquo;t order online. Blocked {blocked.since}: {blocked.reason}.
          </p>
          <button type="button" className="staff-btn is-small is-quiet" disabled={pending} onClick={() => run(() => unblockNumberAction(phone))}>
            Unblock
          </button>
        </>
      ) : (
        <>
          <p className="staff-help">A prank order, or a customer who keeps not picking up? Stop this number from ordering online at both branches.</p>
          <label className="block-number-reason">
            Reason
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              {BLOCK_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </label>
          {asking ? (
            <div className="staff-confirm" role="group" aria-label="Block this number?">
              Block {formatPhone(phone)}?
              <button type="button" className="staff-btn is-danger is-small" disabled={pending} onClick={() => run(() => blockNumberAction(orderId, reason))}>
                {pending ? "Blocking…" : "Yes, block"}
              </button>
              <button type="button" className="staff-btn is-quiet is-small" onClick={() => setAsking(false)}>No</button>
            </div>
          ) : (
            <button type="button" className="staff-btn is-small" onClick={() => setAsking(true)}>Block {formatPhone(phone)}</button>
          )}
        </>
      )}
      {msg && <p className={`staff-msg ${msg.error ? "is-error" : "is-ok"}`} role="status">{msg.error ?? msg.ok}</p>}
    </div>
  );
}
