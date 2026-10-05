"use client";

import Image from "next/image";
import { useState } from "react";
import BrandArt from "@/components/BrandArt";
import RequestForm from "@/components/RequestForm";
import { BARISTA_FEE, CONTACT, SAMPLE_NOTE, boothDrinks, boothTerms, guestsText, offers, priceText, type Offer } from "@/data/events";

/**
 * Reserve & Cater: the coffee booth (from the owner's contract) leads as tear-off tickets,
 * reservations follow as printed invitations, trays as smaller tickets, then the request form.
 */
export default function Invitations() {
  const [offerId, setOfferId] = useState(offers[0].id);

  const choose = (o: Offer) => {
    setOfferId(o.id);
    document.getElementById("request")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const booth = offers.filter((o) => o.group === "booth");
  const reserve = offers.filter((o) => o.group === "reserve");
  const trays = offers.filter((o) => o.group === "cater");

  return (
    <>
      <section className="iv-hero" aria-labelledby="iv-title">
        <Image src="/photos/barista-hero.jpg" alt="" fill priority sizes="100vw" className="iv-hero-photo" />
        <div className="iv-hero-shade" />
        <div className="iv-hero-copy">
          <h1 id="iv-title">Celebrate with us</h1>
          <p className="iv-hero-script">Our baristas, at your event</p>
          <p className="iv-hero-body">
            Bring the Enero Marso coffee booth to your wedding, debut or company party, or book a table at the cafe.
          </p>
          <div className="iv-hero-actions">
            <a className="ghost-btn" href="#booth">Coffee booth</a>
            <a className="ghost-btn" href="#reserve">Reserve</a>
          </div>
        </div>
      </section>

      <section id="booth" className="iv-band iv-band--brown" aria-labelledby="iv-booth">
        <header className="iv-band-head">
          <h2 id="iv-booth">Coffee booth</h2>
          <p className="iv-band-tag">
            <BrandArt kind="cup" className="iv-band-icon" />
            Three baristas, up to 150 cups
          </p>
        </header>

        <div className="iv-sizes">
          {([12, 16] as const).map((oz) => (
            <div key={oz} className="iv-size" role="group" aria-labelledby={`iv-oz-${oz}`}>
              <p id={`iv-oz-${oz}`} className="iv-size-label"><b>{oz} oz</b><small>cup size</small></p>
              <ul className="iv-pkgs">
                {booth.filter((o) => o.cups!.oz === oz).map((o) => (
                  <li key={o.id} className="iv-pkg">
                    <div className="iv-pkg-top">
                      <h3>{o.name}</h3>
                      <p><b>{o.cups!.count}</b> cups</p>
                    </div>
                    <div className="iv-pkg-stub">
                      <b>{priceText(o)}</b>
                      <button type="button" onClick={() => choose(o)} aria-label={`Request ${o.name}, ${o.line}`}>Request</button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="iv-booth-fee">
          Package prices cover the drinks. Add <b>₱{BARISTA_FEE.toLocaleString("en-PH")}</b> for the three baristas.
        </p>

        <div className="iv-booth-info">
          <section className="iv-sheet" aria-labelledby="iv-drinks">
            <h3 id="iv-drinks">Drinks on the booth menu</h3>
            <div className="iv-drinks">
              {boothDrinks.map((g) => (
                <div key={g.title}>
                  <h4>{g.title}</h4>
                  <ul>{g.items.map((i) => <li key={i}>{i}</li>)}</ul>
                </div>
              ))}
            </div>
          </section>
          <section className="iv-sheet" aria-labelledby="iv-terms">
            <h3 id="iv-terms">Good to know</h3>
            <ul className="iv-terms">{boothTerms.map((t) => <li key={t}>{t}</li>)}</ul>
          </section>
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
                <ul>{o.includes.map((i) => <li key={i}>{i}</li>)}</ul>
                <div className="iv-card-rsvp">
                  <p><b>{priceText(o)}</b><small>{o.unit}</small></p>
                  <button type="button" className="pill-btn" onClick={() => choose(o)}>Request</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="trays" className="iv-band iv-band--brown" aria-labelledby="iv-trays">
        <header className="iv-band-head">
          <h2 id="iv-trays">Trays</h2>
          <p>For meetings and parties, picked up or sent by Lalamove. {SAMPLE_NOTE}</p>
        </header>
        <ul className="iv-tickets">
          {trays.map((o) => (
            <li key={o.id} className="iv-ticket">
              <div className="iv-ticket-main">
                <h3>{o.name}</h3>
                <p>{o.line}</p>
                <ul>{o.includes.map((i) => <li key={i}>{i}</li>)}</ul>
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
          <p>
            Tell us the when and the where. We confirm every booking by message, or call us at{" "}
            <a href={`tel:${CONTACT.tel}`}>{CONTACT.phone}</a>.
          </p>
        </header>
        <RequestForm offerId={offerId} onOfferChange={setOfferId} className="rq--ink" />
      </section>
    </>
  );
}
