"use client";

import PinMap from "@/components/map/PinMap";
import { readTendered } from "@/lib/cash";
import { feeSummary, formatDistance, type DeliveryCheck, type DeliverySettings, type LatLng } from "@/lib/delivery";
import { peso } from "@/lib/menu";
import type { PickupWindow } from "@/lib/pickup";

export type How = "pickup" | "delivery";
export type Pay = "online" | "cash";

const manilaTime = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

/**
 * The last step of the order: pickup or delivery (nothing is chosen for them), when, and for
 * delivery the pin, address and landmark, the fee, and how they'll pay. When the branch can't take
 * orders, it says so instead.
 */
export default function HowStep(props: {
  how: How | null;
  onHow: (h: How) => void;
  canDeliver: boolean;
  branchName: string;
  rules: DeliverySettings;
  /** The order's items so far, for the delivery minimum */
  total: number;
  hasItems: boolean;
  /** null while the clock isn't known yet (first render) */
  win: PickupWindow | null;
  when: string;
  onWhen: (v: string) => void;
  closedNote: string | null;
  pin: LatLng | null;
  onPin: (p: LatLng) => void;
  reach: DeliveryCheck | null;
  reachError: string | null;
  address: string;
  onAddress: (v: string) => void;
  landmark: string;
  onLandmark: (v: string) => void;
  /** Delivery: online (GCash, Maya or bank, after the cafe accepts) or cash to the rider */
  pay: Pay | null;
  onPay: (p: Pay) => void;
  /** Cash: "exact", or the amount they'll hand over */
  tender: string;
  onTender: (v: string) => void;
}) {
  const { how, rules, win, reach } = props;
  const short = how === "delivery" && props.hasItems && rules.minOrder ? rules.minOrder - props.total : 0;
  const grand = props.total + (reach?.ok ? reach.fee : 0);
  const otherAmount = props.tender !== "exact";
  const tenderError = props.pay === "cash" && otherAmount && props.tender.trim() !== "" && reach?.ok ? (() => {
    const t = readTendered(props.tender, grand);
    return t.ok ? null : t.error;
  })() : null;

  return (
    <fieldset className="slip-course checkout-how" id="how">
      <legend>How do you want it?</legend>
      {props.closedNote ? (
        <p className="checkout-note">{props.closedNote}</p>
      ) : (
        <>
          <div className="order-toggle">
            <label>
              <input type="radio" name="fulfillment" checked={how === "pickup"} onChange={() => props.onHow("pickup")} />
              <span>Pickup</span>
            </label>
            {props.canDeliver ? (
              <label>
                <input type="radio" name="fulfillment" checked={how === "delivery"} onChange={() => props.onHow("delivery")} />
                <span>Delivery</span>
              </label>
            ) : (
              <label className="is-soon" aria-disabled="true">
                <input type="radio" name="fulfillment" disabled />
                <span>Delivery <small>unavailable</small></span>
              </label>
            )}
          </div>

          {how === "delivery" && (
            <p className="order-hint">
              Delivery: {feeSummary(rules)}. We deliver up to {formatDistance(rules.maxDistance)}{rules.minOrder ? `, from ${peso(rules.minOrder)} in items` : ""}.
            </p>
          )}
          {short > 0 && (
            <p className="delivery-reach is-off" role="status">
              Add {peso(short)} more for delivery (the minimum is {peso(rules.minOrder)}), or choose pickup.
            </p>
          )}

          {how && win && (
            <label className="checkout-when">
              <span>{how === "delivery" ? "Delivery time" : "Pickup time"}</span>
              <select value={props.when} onChange={(e) => props.onWhen(e.target.value)}>
                {win.asap && <option value="asap">{how === "delivery" ? "As soon as possible" : "As soon as it’s ready (about 20 min)"}</option>}
                {win.slots.map((s) => (
                  <option key={s.toISOString()} value={s.toISOString()}>Today, {manilaTime(s)}</option>
                ))}
              </select>
            </label>
          )}

          {how === "delivery" && (
            <div className="delivery-where">
              <PinMap pin={props.pin} onPin={props.onPin} center={rules.store!} store={rules.store} freeRadius={rules.freeWithin} label="Where we should deliver" />
              {reach?.ok ? (
                <p className={`delivery-reach${reach.free ? " is-free" : ""}`} role="status">
                  About {formatDistance(reach.distance)} from {props.branchName}. {reach.free ? "Free delivery." : `Delivery ${peso(reach.fee)}.`}
                </p>
              ) : (
                props.reachError && short <= 0 && <p className="delivery-reach is-off" role="status">{props.reachError}</p>
              )}
              <div className="slip-fields">
                <label>
                  Address <small>house or unit, street, barangay</small>
                  <input value={props.address} onChange={(e) => props.onAddress(e.target.value)} autoComplete="street-address" required minLength={5} maxLength={200} placeholder="12 Champaca St., Western Bicutan" />
                </label>
                <label>
                  Landmark <small>optional</small>
                  <input value={props.landmark} onChange={(e) => props.onLandmark(e.target.value)} maxLength={200} placeholder="Blue gate, beside the sari-sari store" />
                </label>
              </div>

              <fieldset className="checkout-pay">
                <legend>How will you pay?</legend>
                <label className={props.pay === "online" ? "is-on" : undefined}>
                  <input type="radio" name="pay" checked={props.pay === "online"} onChange={() => props.onPay("online")} />
                  <span>GCash, Maya or bank <small>Pay in the chat once the cafe accepts your order</small></span>
                </label>
                {rules.cash && (
                  <label className={props.pay === "cash" ? "is-on" : undefined}>
                    <input type="radio" name="pay" checked={props.pay === "cash"} onChange={() => props.onPay("cash")} />
                    <span>Cash on delivery <small>Pay the rider when it arrives</small></span>
                  </label>
                )}
              </fieldset>
              {props.pay === "cash" && (
                <fieldset className="checkout-tender">
                  <legend>I&rsquo;ll pay with <small>so the rider brings the right change</small></legend>
                  <label>
                    <input type="radio" name="tender" checked={!otherAmount} onChange={() => props.onTender("exact")} />
                    <span>The exact amount{reach?.ok ? ` (${peso(grand)})` : ""}</span>
                  </label>
                  <label className="checkout-tender-other">
                    <input type="radio" name="tender" checked={otherAmount} onChange={() => props.onTender("")} />
                    <span>Another amount</span>
                    {otherAmount && (
                      <span className="peso-field">
                        <span aria-hidden="true">₱</span>
                        <input
                          value={props.tender}
                          onChange={(e) => props.onTender(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
                          inputMode="numeric"
                          aria-label="The amount you'll pay with, in pesos"
                          placeholder={reach?.ok ? String(Math.ceil(grand / 100) * 100) : "1000"}
                          autoFocus
                        />
                      </span>
                    )}
                  </label>
                  {tenderError && <p className="delivery-reach is-off" role="status">{tenderError}</p>}
                </fieldset>
              )}
            </div>
          )}
        </>
      )}
    </fieldset>
  );
}
