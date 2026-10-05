"use client";

import { useState } from "react";
import RequestForm from "@/components/RequestForm";
import { guestsText, offerGroups, offers, priceText } from "@/data/events";

/** Design A: the offers printed as one rate card, the request form as its last course */
export default function RateCard() {
  const [offerId, setOfferId] = useState(offers[0].id);
  const [guests, setGuests] = useState(offers[0].guests.min);

  const choose = (id: string) => {
    const o = offers.find((x) => x.id === id)!;
    setOfferId(id);
    setGuests((g) => Math.min(o.guests.max, Math.max(o.guests.min, g)));
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      {offerGroups.map((g) => (
        <section key={g.id} className="ml-course rc-group" aria-labelledby={`rc-${g.id}`}>
          <div className="ml-cat-head">
            <h2 id={`rc-${g.id}`}>{g.title}</h2>
            <p>{g.line}</p>
          </div>
          <ul className="rc-list">
            {offers.filter((o) => o.group === g.id).map((o) => (
              <li key={o.id} className="rc-row">
                <div className="rc-what">
                  <h3>{o.name}</h3>
                  <p>{o.line}</p>
                  <ul className="rc-includes">
                    {o.includes.map((i) => <li key={i}>{i}</li>)}
                  </ul>
                </div>
                <dl className="rc-facts">
                  <div><dt>Good for</dt><dd>{guestsText(o)}</dd></div>
                  <div><dt>Where</dt><dd>{o.where}</dd></div>
                </dl>
                <div className="rc-price">
                  <b>{priceText(o)}</b>
                  <small>{o.unit}</small>
                  <button type="button" onClick={() => choose(o.id)}>Request</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section id="request" className="ml-course rc-request" aria-labelledby="rc-request-title">
        <div className="ml-cat-head">
          <h2 id="rc-request-title">Request a date</h2>
          <p>We confirm every booking by message</p>
        </div>
        <RequestForm
          offerId={offerId}
          onOfferChange={setOfferId}
          guests={guests}
          onGuestsChange={setGuests}
          className="rq--paper"
        />
      </section>
    </>
  );
}
