"use client";

import { useState, useTransition } from "react";
import { quoteDeliveryAction, reviewPaymentAction, sendOutAction } from "@/app/staff/orders/actions";
import CopyText from "@/components/CopyText";
import { NOT_FOUND_REASONS } from "@/lib/chat-cards";
import { formatDistance, MAX_DELIVERY_FEE } from "@/lib/delivery";
import { peso } from "@/lib/menu";
import type { FullOrder } from "@/lib/orders";

type Props = { order: FullOrder; freeWithin: number; accountLabel: string | null; clashes: string[] | undefined };

/**
 * The delivery steps on an order card: confirm the fee, check the payment, send it out.
 * The other steps (preparing, ready, delivered, cancel) use the card's usual buttons.
 */
export default function DeliveryActions({ order: o, freeWithin, accountLabel, clashes }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [changingFee, setChangingFee] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const run = (act: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await act();
      if (r.error) setError(r.error);
      else after?.();
    });

  let body: React.ReactNode = null;
  if (o.status === "pending" || (o.status === "awaiting_payment" && o.paymentStatus === "unpaid" && changingFee)) {
    body = <FeeForm order={o} freeWithin={freeWithin} pending={pending} requote={o.status === "awaiting_payment"} onSend={(fee) => run(() => quoteDeliveryAction(o.id, fee), () => setChangingFee(false))} onCancelEdit={() => setChangingFee(false)} />;
  } else if (o.status === "awaiting_payment" && o.paymentStatus === "unpaid") {
    body = (
      <div className="order-card-step">
        <p>Waiting for the customer to pay <b>{peso(o.total)}</b>{o.deliveryFee ? ` (${peso(o.deliveryFee)} delivery)` : " (free delivery)"}.</p>
        <button type="button" className="order-link" onClick={() => setChangingFee(true)}>Change the fee</button>
      </div>
    );
  } else if (o.status === "awaiting_payment" && o.paymentStatus === "submitted") {
    body = (
      <div className="order-card-step is-payment">
        <p><b>Check the payment</b></p>
        <p>
          Paid to {accountLabel ?? "the cafe"} · reference <b className="nowrap">{o.gcashRef}</b> {o.gcashRef && <CopyText text={o.gcashRef} />}
        </p>
        {clashes && clashes.length > 0 && (
          <p className="staff-msg is-error">This reference number was also sent for {clashes.join(", ")}. Check carefully.</p>
        )}
        <small>Find it in the account&rsquo;s app history, with the same amount, before you accept.</small>
        {notFound ? (
          // The customer reads the reason on their page, with the form to send the payment again
          <div className="order-card-reasons" role="group" aria-label="Why wasn't it found?">
            <small>Tell the customer why:</small>
            {NOT_FOUND_REASONS.map((r) => (
              <button key={r} type="button" className="staff-btn is-small is-quiet" disabled={pending} onClick={() => run(() => reviewPaymentAction(o.id, false, r), () => setNotFound(false))}>
                {r}
              </button>
            ))}
            <button type="button" className="order-link" onClick={() => setNotFound(false)}>Back</button>
          </div>
        ) : (
          <div className="order-card-actions">
            <button type="button" className="staff-btn is-primary" disabled={pending} onClick={() => run(() => reviewPaymentAction(o.id, true))}>
              {pending ? "Saving…" : "Payment received"}
            </button>
            <button type="button" className="staff-btn is-quiet" disabled={pending} onClick={() => setNotFound(true)}>Not found</button>
          </div>
        )}
      </div>
    );
  } else if (o.status === "ready") {
    body = <SendOutForm pending={pending} onSend={(provider, link) => run(() => sendOutAction(o.id, provider, link))} />;
  }

  return (
    <>
      {body}
      {error && <p className="staff-msg is-error" role="alert">{error}</p>}
    </>
  );
}

function FeeForm({ order: o, freeWithin, pending, requote, onSend, onCancelEdit }: {
  order: FullOrder; freeWithin: number; pending: boolean; requote: boolean; onSend: (fee: string) => void; onCancelEdit: () => void;
}) {
  const inFreeArea = o.distanceMeters != null && freeWithin > 0 && o.distanceMeters <= freeWithin;
  const [fee, setFee] = useState(requote && o.deliveryFee != null ? String(o.deliveryFee) : inFreeArea ? "0" : "");
  const n = Number(fee);
  const valid = fee.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= MAX_DELIVERY_FEE;
  return (
    <form className="order-card-step" onSubmit={(e) => { e.preventDefault(); if (valid) onSend(fee); }}>
      <label className="order-card-fee">
        Delivery fee
        <span className="peso-input">
          <span aria-hidden="true">₱</span>
          <input value={fee} onChange={(e) => setFee(e.target.value.replace(/\D/g, ""))} inputMode="numeric" maxLength={4} required aria-label="Delivery fee in pesos" placeholder="0" />
        </span>
      </label>
      <small>
        {inFreeArea
          ? `Inside the free area (${formatDistance(freeWithin)}). Add a fee only if the rider charges.`
          : "Check Lalamove using the address and the map pin, then enter its fee."}
        {valid && ` The customer pays ${peso(o.subtotal + n)}.`}
      </small>
      <div className="order-card-actions">
        <button type="submit" className="staff-btn is-primary" disabled={pending || !valid}>
          {pending ? "Saving…" : requote ? "Update the fee" : "Confirm and send fee"}
        </button>
        {requote && <button type="button" className="staff-btn is-quiet" onClick={onCancelEdit}>Keep it</button>}
      </div>
    </form>
  );
}

function SendOutForm({ pending, onSend }: { pending: boolean; onSend: (provider: string, link: string) => void }) {
  const [provider, setProvider] = useState<"lalamove" | "own_rider">("lalamove");
  const [link, setLink] = useState("");
  return (
    <form className="order-card-step" onSubmit={(e) => { e.preventDefault(); onSend(provider, link); }}>
      <fieldset className="order-card-who-delivers">
        <legend>Who&rsquo;s delivering?</legend>
        <label><input type="radio" name="provider" checked={provider === "lalamove"} onChange={() => setProvider("lalamove")} /> Lalamove</label>
        <label><input type="radio" name="provider" checked={provider === "own_rider"} onChange={() => setProvider("own_rider")} /> Our staff</label>
      </fieldset>
      {provider === "lalamove" && (
        <label className="order-card-link">
          Tracking link <small>optional, from the Lalamove app</small>
          <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" inputMode="url" />
        </label>
      )}
      <div className="order-card-actions">
        <button type="submit" className="staff-btn is-primary" disabled={pending}>{pending ? "Saving…" : "Out for delivery"}</button>
      </div>
    </form>
  );
}
