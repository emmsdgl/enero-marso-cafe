"use client";

import { useState } from "react";
import { branches } from "@/data/branches";
import { CONTACT, offerGroups, offers, priceText } from "@/data/events";

type Props = {
  /** Controlled package choice; uncontrolled when omitted */
  offerId?: string;
  onOfferChange?: (id: string) => void;
  className?: string;
};

/**
 * Placeholder booking request, following the fields of the owner's printed order form.
 * Online requests are not live yet, so sending only shows a summary and points people to
 * Facebook or the cafe's phone; nothing leaves the browser.
 */
export default function RequestForm({ offerId, onOfferChange, className = "" }: Props) {
  const [ownOffer, setOwnOffer] = useState(offers[0].id);
  const [sent, setSent] = useState<null | Record<string, string>>(null);

  const offer = offers.find((o) => o.id === (offerId ?? ownOffer)) ?? offers[0];
  const setOffer = (id: string) => (onOfferChange ? onOfferChange(id) : setOwnOffer(id));
  const isBooth = offer.group === "booth";
  const main = branches[0];
  const today = new Date().toISOString().slice(0, 10);

  if (sent) {
    const times = [sent.start, sent.end].filter(Boolean).map(fmtTime).join(" to ");
    return (
      <div className={`rq rq-done ${className}`} role="status">
        <p className="rq-done-big">Thank you, {sent.name.split(" ")[0]}!</p>
        <p>
          Online requests open soon, so this one hasn&rsquo;t been sent yet. Message or call us with the details below and
          we&rsquo;ll confirm your date{isBooth ? " and the deposit" : ""}.
        </p>
        <dl className="rq-summary">
          <div><dt>Package</dt><dd>{isBooth ? `Coffee booth ${offer.name}, ${offer.line}` : offer.name} · {priceText(offer)}</dd></div>
          {sent.event && <div><dt>{isBooth ? "Event" : "Occasion"}</dt><dd>{sent.event}</dd></div>}
          <div><dt>When</dt><dd>{fmtDate(sent.date)}{times && `, ${times}`}</dd></div>
          {sent.guests && <div><dt>Guests</dt><dd>{sent.guests}</dd></div>}
          {sent.venue && <div><dt>{isBooth ? "Venue" : "Deliver to"}</dt><dd>{sent.venue}</dd></div>}
          <div><dt>Contact</dt><dd>{sent.name} · {sent.phone}{sent.email && ` · ${sent.email}`}</dd></div>
          {sent.notes && <div><dt>Notes</dt><dd>{sent.notes}</dd></div>}
        </dl>
        <div className="rq-actions">
          <a className="rq-submit" href={main.socials.facebook} target="_blank" rel="noopener noreferrer">Message us on Facebook</a>
          <a className="rq-link" href={`tel:${CONTACT.tel}`}>or call {CONTACT.phone}</a>
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
        setSent(Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>);
      }}
    >
      <label className="rq-wide">
        Package
        <select name="offer" value={offer.id} onChange={(e) => setOffer(e.target.value)}>
          {offerGroups.map((g) => (
            <optgroup key={g.id} label={g.title}>
              {offers.filter((o) => o.group === g.id).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}{o.group === "booth" ? ` · ${o.line}` : ""} · {priceText(o)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {isBooth ? (
        <>
          <label>
            Type of event
            <input name="event" required placeholder="Wedding, debut, company party…" />
          </label>
          <label>
            Event date
            <input name="date" type="date" min={today} required />
          </label>
          <label className="rq-wide">
            Event address
            <input name="venue" autoComplete="street-address" required placeholder="Venue, street, city" />
          </label>
          <label>
            Start time
            <input name="start" type="time" required />
          </label>
          <label>
            End time
            <input name="end" type="time" required />
          </label>
        </>
      ) : (
        <>
          <label>
            Date
            <input name="date" type="date" min={today} required />
          </label>
          <label>
            Time
            <input name="start" type="time" required />
          </label>
          <label>
            Guests
            <input
              key={offer.id}
              name="guests"
              type="number"
              inputMode="numeric"
              min={offer.guests?.min}
              max={offer.guests?.max}
              defaultValue={offer.guests?.min}
              required
            />
            {offer.guests && <small>{offer.guests.min} to {offer.guests.max} for this package</small>}
          </label>
          {offer.group === "cater" ? (
            <label>
              Deliver to
              <input name="venue" autoComplete="street-address" placeholder="Leave blank for pickup" />
            </label>
          ) : (
            <label>
              Occasion
              <input name="event" placeholder="Birthday, date night, meetup…" />
            </label>
          )}
        </>
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
        <span>Email <small>optional</small></span>
        <input name="email" type="email" autoComplete="email" placeholder="you@example.com" />
      </label>
      <label className="rq-wide">
        Notes
        <textarea name="notes" rows={2} placeholder={isBooth ? "Drinks you'd like, setup details…" : "Dietary needs, setup time…"} />
      </label>
      <div className="rq-foot rq-wide">
        <p><span>{offer.unit}</span><b>{priceText(offer)}</b></p>
        <button type="submit" className="rq-submit">Send request</button>
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
