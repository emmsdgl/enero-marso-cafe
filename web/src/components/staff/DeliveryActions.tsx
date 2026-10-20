"use client";

import { useState, useTransition } from "react";
import { acceptDeliveryAction, assignRiderAction, changeFeeAction, reviewPaymentAction, sendOutAction } from "@/app/staff/orders/actions";
import CopyText from "@/components/CopyText";
import { cashLine } from "@/lib/cash";
import { NOT_FOUND_REASONS } from "@/lib/chat-cards";
import { formatDistance, MAX_DELIVERY_FEE } from "@/lib/delivery";
import { peso } from "@/lib/menu";
import type { FullOrder } from "@/lib/orders";
import type { RiderChoice } from "@/lib/riders";

type Props = { order: FullOrder; accountLabel: string | null; clashes: string[] | undefined; riders: RiderChoice[]; riderName: string | null };

const firstName = (name: string | null) => (name ?? "them").split(" ")[0];

/**
 * The delivery steps on an order card: accept (the fee comes from the distance), check an online
 * payment, choose who takes it, send it out. The other steps (preparing, ready, delivered, cancel)
 * use the card's usual buttons.
 */
export default function DeliveryActions({ order: o, accountLabel, clashes, riders, riderName }: Props) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [changingFee, setChangingFee] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [lalamove, setLalamove] = useState(false);
  const cash = o.paymentMethod === "cash";
  const run = (act: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const r = await act();
      if (r.error) setError(r.error);
      else after?.();
    });
  const feeWords = o.deliveryFee == null ? "Fee not set" : o.deliveryFee === 0 ? "Free delivery" : `${peso(o.deliveryFee)} delivery`;
  const far = o.distanceMeters != null ? ` (${formatDistance(o.distanceMeters)})` : "";
  const collect = cash && <p className="order-card-cash">{cashLine(o.total, o.cashTendered)}</p>;

  let body: React.ReactNode = null;
  if (o.status === "pending") {
    // An order from before fees came from the distance has none yet: staff give it
    body =
      changingFee || o.deliveryFee == null ? (
        <FeeForm order={o} pending={pending} submit="Accept with this fee" onSend={(fee) => run(() => acceptDeliveryAction(o.id, fee), () => setChangingFee(false))} onCancel={o.deliveryFee == null ? undefined : () => setChangingFee(false)} />
      ) : (
        <div className="order-card-step">
          <p>{feeWords}{far} · total <b>{peso(o.total)}</b></p>
          {cash ? collect : <small>They pay online once you accept.</small>}
          <div className="order-card-actions">
            <button type="button" className="staff-btn is-primary" disabled={pending} onClick={() => run(() => acceptDeliveryAction(o.id))}>
              {pending ? "Saving…" : "Accept"}
            </button>
            <button type="button" className="staff-btn is-quiet" disabled={pending} onClick={() => setChangingFee(true)}>Change fee</button>
          </div>
        </div>
      );
  } else if (o.status === "awaiting_payment" && o.paymentStatus === "unpaid") {
    body = changingFee ? (
      <FeeForm order={o} pending={pending} submit="Update the fee" onSend={(fee) => run(() => changeFeeAction(o.id, fee), () => setChangingFee(false))} onCancel={() => setChangingFee(false)} />
    ) : (
      <div className="order-card-step">
        <p>Waiting for the customer to pay <b>{peso(o.total)}</b> ({feeWords.toLowerCase()}).</p>
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
  } else if (["accepted", "preparing", "ready"].includes(o.status)) {
    const known = !o.riderId || riders.some((r) => r.id === o.riderId);
    body = (
      <div className="order-card-step order-card-rider">
        {riders.length === 0 && !o.riderId ? (
          <p>No riders, and nobody clocked in, at this branch.{cash ? " Clock someone in to take it." : " Book Lalamove, or clock someone in."}</p>
        ) : (
          <label>
            Taking it
            <select value={o.riderId ?? ""} disabled={pending} onChange={(e) => run(() => assignRiderAction(o.id, e.target.value))}>
              <option value="">Choose who…</option>
              {riders.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.role === "rider" ? "" : " (counter)"}
                  {r.onShift ? "" : " · not clocked in"}
                  {r.load ? ` · ${r.load} on now` : ""}
                </option>
              ))}
              {!known && <option value={o.riderId!}>{riderName ?? "Someone"}</option>}
            </select>
          </label>
        )}
        {collect}
        {cash &&
          (changingFee ? (
            <FeeForm order={o} pending={pending} submit="Update the fee" onSend={(fee) => run(() => changeFeeAction(o.id, fee), () => setChangingFee(false))} onCancel={() => setChangingFee(false)} />
          ) : (
            <button type="button" className="order-link" onClick={() => setChangingFee(true)}>Change the fee ({feeWords.toLowerCase()})</button>
          ))}
        {o.status === "ready" && (
          <div className="order-card-actions">
            {o.riderId ? (
              <button type="button" className="staff-btn is-primary" disabled={pending} onClick={() => run(() => sendOutAction(o.id, "own_rider", ""))}>
                {pending ? "Saving…" : `Send out with ${firstName(riderName)}`}
              </button>
            ) : (
              <small>Choose who&rsquo;s taking it, then send it out. They can also tap &ldquo;On my way&rdquo; themselves.</small>
            )}
          </div>
        )}
        {o.status === "ready" && !cash && (lalamove ? (
          <LalamoveForm pending={pending} onSend={(link) => run(() => sendOutAction(o.id, "lalamove", link))} onCancel={() => setLalamove(false)} />
        ) : (
          <button type="button" className="order-link" onClick={() => setLalamove(true)}>Book Lalamove instead</button>
        ))}
      </div>
    );
  } else if (o.status === "out_for_delivery") {
    body = (
      <div className="order-card-step">
        <p>
          {o.deliveryProvider === "lalamove" ? "With Lalamove" : `With ${riderName ?? "our rider"}`}
          {o.deliveryProvider === "lalamove" && o.trackingUrl && <> · <a href={o.trackingUrl} target="_blank" rel="noopener noreferrer">Tracking</a></>}
        </p>
        {collect}
      </div>
    );
  }

  return (
    <>
      {body}
      {error && <p className="staff-msg is-error" role="alert">{error}</p>}
    </>
  );
}

function FeeForm({ order: o, pending, submit, onSend, onCancel }: { order: FullOrder; pending: boolean; submit: string; onSend: (fee: string) => void; onCancel?: () => void }) {
  const [fee, setFee] = useState(o.deliveryFee != null ? String(o.deliveryFee) : "");
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
        {o.deliveryFee != null ? `Worked out from the distance: ${o.deliveryFee ? peso(o.deliveryFee) : "free"}.` : "This order came in before fees were worked out from the distance."}
        {valid && ` The customer pays ${peso(o.subtotal + n)}.`}
      </small>
      <div className="order-card-actions">
        <button type="submit" className="staff-btn is-primary" disabled={pending || !valid}>{pending ? "Saving…" : submit}</button>
        {onCancel && <button type="button" className="staff-btn is-quiet" onClick={onCancel}>Keep it</button>}
      </div>
    </form>
  );
}

/** The backup when our riders are busy: book it in the Lalamove app, paste the tracking link */
function LalamoveForm({ pending, onSend, onCancel }: { pending: boolean; onSend: (link: string) => void; onCancel: () => void }) {
  const [link, setLink] = useState("");
  return (
    <form className="order-card-step" onSubmit={(e) => { e.preventDefault(); onSend(link); }}>
      <label className="order-card-link">
        Lalamove tracking link <small>optional, from the Lalamove app</small>
        <input type="url" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://" inputMode="url" />
      </label>
      <div className="order-card-actions">
        <button type="submit" className="staff-btn is-primary" disabled={pending}>{pending ? "Saving…" : "Out with Lalamove"}</button>
        <button type="button" className="staff-btn is-quiet" onClick={onCancel}>Back</button>
      </div>
    </form>
  );
}
