"use client";

import Image from "next/image";
import { useState } from "react";
import BrandArt from "@/components/BrandArt";
import RequestForm from "@/components/RequestForm";
import { SAMPLE_NOTE, guestsText, offers, priceText, type Offer } from "@/data/events";

/** Design B: reservations as printed invitations, catering as tickets with a tear-off stub */
export default function Invitations() {
  const [offerId, setOfferId] = useState(offers[0].id);
  const [guests, setGuests] = useState(offers[0].guests.min);

  const choose = (o: Offer) => {
    setOfferId(o.id);
    setGuests((g) => Math.min(o.guests.max, Math.max(o.guests.min, g)));
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const reserve = offers.filter((o) => o.group === "reserve");
  const cater = offers.filter((o) => o.group === "cater");

  return (
    <>
      <section className="iv-hero" aria-labelledby="iv-title">
        <Image src="/photos/barista-hero.jpg" alt="" fill priority sizes="100vw" className="iv-hero-photo" />
        <div className="iv-hero-shade" />
        <div className="iv-hero-copy">
          <h1 id="iv-title">Celebrate with us</h1>
          <p className="iv-hero-script">Your table, our coffee</p>
          <p className="iv-hero-body">
            Book a table for a quiet date, close the cafe for your birthday, or bring the Noir coffee cart to your event.
          </p>
          <div className="iv-hero-actions">
            <a className="ghost-btn" href="#reserve">Reserve</a>
            <a className="ghost-btn" href="#cater">Catering</a>
          </div>
        </div>
      </section>

      <section id="reserve" className="iv-band iv-band--sand" aria-labelledby="iv-reserve">
        <header className="iv-band-head">
          <h2 id="iv-reserve">Reserve</h2>
          <p>{SAMPLE_NOTE}</p>
        </header>
        <div className="iv-cards">
          {reserve.map((o) => (
            <article key={o.id} className="iv-card" aria-labelledby={`iv-${o.id}`}>
              <div className="iv-card-frame">
                <h3 id={`iv-${o.id}`}>{o.name}</h3>
                <p className="iv-card-script">{o.line}</p>
                <p className="iv-card-guests">{guestsText(o)}</p>
                <ul>
                  {o.includes.map((i) => <li key={i}>{i}</li>)}
                </ul>
                <div className="iv-card-rsvp">
                  <p><b>{priceText(o)}</b><small>{o.unit}</small></p>
                  <button type="button" className="pill-btn" onClick={() => choose(o)}>Request</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="cater" className="iv-band iv-band--brown" aria-labelledby="iv-cater">
        <header className="iv-band-head">
          <h2 id="iv-cater">Catering</h2>
          <p className="iv-band-tag">
            <BrandArt kind="cup" className="iv-band-icon" />
            Our coffee, at your event
          </p>
        </header>
        <ul className="iv-tickets">
          {cater.map((o) => (
            <li key={o.id} className="iv-ticket">
              <div className="iv-ticket-main">
                <h3>{o.name}</h3>
                <p>{o.line}</p>
                <ul>
                  {o.includes.map((i) => <li key={i}>{i}</li>)}
                </ul>
                <p className="iv-ticket-where">{o.where}</p>
              </div>
              <div className="iv-ticket-stub">
                <span className="iv-ticket-guests">{guestsText(o)}</span>
                <b>{priceText(o)}</b>
                <small>{o.unit}</small>
                <button type="button" onClick={() => choose(o)}>Request</button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="request" className="iv-band iv-band--ink" aria-labelledby="iv-request">
        <header className="iv-band-head">
          <h2 id="iv-request">Request a date</h2>
          <p>Tell us the when and the how many. We confirm every booking by message.</p>
        </header>
        <RequestForm
          offerId={offerId}
          onOfferChange={setOfferId}
          guests={guests}
          onGuestsChange={setGuests}
          className="rq--ink"
        />
      </section>
    </>
  );
}
