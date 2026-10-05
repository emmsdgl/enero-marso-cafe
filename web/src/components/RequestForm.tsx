"use client";

import { useState } from "react";
import { branches } from "@/data/branches";
import { offerGroups, offers, priceText } from "@/data/events";

type Props = {
  /** Controlled package choice (the planner drives it); uncontrolled when omitted */
  offerId?: string;
  onOfferChange?: (id: string) => void;
  guests?: number;
  onGuestsChange?: (n: number) => void;
  submitLabel?: string;
  className?: string;
};

/**
 * Placeholder reservation / catering request. Online requests are not live yet, so sending only
 * shows a summary and points people to Instagram or Facebook; nothing leaves the browser.
 */
export default function RequestForm({ offerId, onOfferChange, guests, onGuestsChange, submitLabel = "Send request", className = "" }: Props) {
  const [ownOffer, setOwnOffer] = useState(offers[0].id);
  const [ownGuests, setOwnGuests] = useState(offers[0].guests.min);
  const [sent, setSent] = useState<null | Record<string, string>>(null);

  const id = offerId ?? ownOffer;
  const offer = offers.find((o) => o.id === id) ?? offers[0];
  const count = guests ?? ownGuests;
  const setOffer = (next: string) => {
    if (onOfferChange) onOfferChange(next);
    else setOwnOffer(next);
    const o = offers.find((x) => x.id === next)!;
    const clamped = Math.min(o.guests.max, Math.max(o.guests.min, count));
    if (clamped !== count) setCount(clamped);
  };
  const setCount = (n: number) => (onGuestsChange ? onGuestsChange(n) : setOwnGuests(n));
  const main = branches[0];
  const today = new Date().toISOString().slice(0, 10);

  if (sent) {
    return (
      <div className={`rq rq-done ${className}`} role="status">
        <p className="rq-done-big">Thank you, {sent.name.split(" ")[0]}!</p>
        <p>
          Online requests open soon, so this one hasn&rsquo;t been sent yet. Message us with the details below and we&rsquo;ll
          confirm the date, the package and the final price.
        </p>
        <dl className="rq-summary">
          <div><dt>Package</dt><dd>{offer.name}</dd></div>
          <div><dt>When</dt><dd>{fmtDate(sent.date)}{sent.time && `, ${fmtTime(sent.time)}`}</dd></div>
          <div><dt>Guests</dt><dd>{sent.guests}</dd></div>
          {sent.venue && <div><dt>Venue</dt><dd>{sent.venue}</dd></div>}
          <div><dt>Contact</dt><dd>{sent.name} · {sent.phone}</dd></div>
          {sent.notes && <div><dt>Notes</dt><dd>{sent.notes}</dd></div>}
        </dl>
        <div className="rq-actions">
          <a className="rq-submit" href={main.socials.instagram} target="_blank" rel="noopener noreferrer">Message {main.socials.handle}</a>
          <a className="rq-link" href={main.socials.facebook} target="_blank" rel="noopener noreferrer">or Facebook</a>
          <button type="button" className="rq-link" onClick={() => setSent(null)}>Edit request</button>
        </div>
      </div>
    );
  }

  return (
    <form
      className={`rq ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
        setSent({ ...data, guests: String(count) });
      }}
    >
      <label className="rq-wide">
        Package
        <select name="offer" value={offer.id} onChange={(e) => setOffer(e.target.value)}>
          {offerGroups.map((g) => (
            <optgroup key={g.id} label={g.title}>
              {offers.filter((o) => o.group === g.id).map((o) => (
                <option key={o.id} value={o.id}>{o.name} · {priceText(o)}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        Date
        <input name="date" type="date" min={today} required />
      </label>
      <label>
        Time
        <input name="time" type="time" required />
      </label>
      <label>
        Guests
        <input
          name="guests"
          type="number"
          inputMode="numeric"
          min={offer.guests.min}
          max={offer.guests.max}
          value={count}
          onChange={(e) => setCount(Number(e.target.value))}
          required
        />
        <small>{offer.guests.min} to {offer.guests.max} for this package</small>
      </label>
      {offer.atVenue ? (
        <label>
          {offer.id.startsWith("cart") ? "Event venue" : "Deliver to"}
          <input name="venue" autoComplete="street-address" required placeholder="Street, barangay, city" />
        </label>
      ) : (
        <label>
          Occasion
          <input name="venue" placeholder="Birthday, date night, meetup…" />
        </label>
      )}
      <label>
        Name
        <input name="name" autoComplete="name" required placeholder="Juan Dela Cruz" />
      </label>
      <label>
        Mobile number
        <input name="phone" type="tel" autoComplete="tel" required placeholder="09XX XXX XXXX" pattern="[0-9+ ]{10,15}" />
      </label>
      <label className="rq-wide">
        Notes
        <textarea name="notes" rows={2} placeholder="Drinks you want, dietary needs, setup time…" />
      </label>
      <div className="rq-foot rq-wide">
        <p><span>{offer.unit}</span><b>{priceText(offer)}</b></p>
        <button type="submit" className="rq-submit">{submitLabel}</button>
      </div>
    </form>
  );
}

function fmtDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-PH", { weekday: "short", month: "long", day: "numeric" });
}

function fmtTime(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}
