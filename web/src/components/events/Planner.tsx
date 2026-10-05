"use client";

import { useState } from "react";
import BrandArt from "@/components/BrandArt";
import RequestForm from "@/components/RequestForm";
import { SAMPLE_NOTE, estimate, guestsText, offers, peso, type Offer } from "@/data/events";

type Plan = { id: string; label: string; hint: string; art: "cup" | "cutlery" | "sprig"; offerIds: string[] };

const plans: Plan[] = [
  { id: "table", label: "A table", hint: "2 to 10 guests at the cafe", art: "cup", offerIds: ["table"] },
  { id: "private", label: "The whole cafe", hint: "A private night for 15 to 40", art: "sprig", offerIds: ["private"] },
  { id: "cart", label: "The coffee cart", hint: "Noir comes to your venue", art: "cup", offerIds: ["cart-classic", "cart-premier"] },
  { id: "coffee", label: "Coffee trays", hint: "Drinks for a meeting or class", art: "cup", offerIds: ["coffee-tray"] },
  { id: "snacks", label: "Snack trays", hint: "Finger food for a party", art: "cutlery", offerIds: ["snack-tray"] },
  { id: "office", label: "Office break", hint: "Coffee and snacks for the team", art: "cutlery", offerIds: ["office-morning"] },
];

const byId = (id: string) => offers.find((o) => o.id === id)!;
const rangeOf = (p: Plan) => ({ min: byId(p.offerIds[0]).guests.min, max: byId(p.offerIds.at(-1)!).guests.max });
/** The smallest package in the plan that fits the guest count */
const fitFor = (p: Plan, guests: number): Offer =>
  p.offerIds.map(byId).find((o) => guests <= o.guests.max) ?? byId(p.offerIds.at(-1)!);

/** Design C: answer two questions, see the matching package and a running estimate, then send */
export default function Planner() {
  const [planId, setPlanId] = useState(plans[0].id);
  const [guests, setGuests] = useState(4);
  const plan = plans.find((p) => p.id === planId)!;
  const range = rangeOf(plan);
  const offer = fitFor(plan, guests);
  const total = estimate(offer, guests);

  const pickPlan = (p: Plan) => {
    setPlanId(p.id);
    const r = rangeOf(p);
    setGuests((g) => Math.min(r.max, Math.max(r.min, g)));
  };
  // The form can switch package too; keep the planner in step with it
  const fromForm = (id: string) => {
    const p = plans.find((x) => x.offerIds.includes(id))!;
    setPlanId(p.id);
    const o = byId(id);
    setGuests((g) => Math.min(o.guests.max, Math.max(o.guests.min, g)));
  };

  return (
    <div className="pl">
      <div className="pl-steps">
        <fieldset className="pl-step">
          <legend>What are you planning?</legend>
          <div className="pl-choices">
            {plans.map((p) => (
              <label key={p.id} className="pl-choice">
                <input type="radio" name="plan" checked={p.id === planId} onChange={() => pickPlan(p)} />
                <BrandArt kind={p.art} className="pl-choice-art" />
                <b>{p.label}</b>
                <small>{p.hint}</small>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="pl-step">
          <legend>How many guests?</legend>
          <div className="pl-guests">
            <input
              type="range"
              min={range.min}
              max={range.max}
              value={guests}
              onChange={(e) => setGuests(Number(e.target.value))}
              aria-label="Guests"
              style={{ "--fill": `${((guests - range.min) / (range.max - range.min || 1)) * 100}%` } as React.CSSProperties}
            />
            <output aria-live="polite">{guests}<small>guests</small></output>
          </div>
          <p className="pl-range">{range.min} to {range.max} for {plan.label.toLowerCase()}</p>
        </fieldset>

        <section className="pl-step pl-match" aria-labelledby="pl-match">
          <h2 id="pl-match">{offer.name}</h2>
          <p className="pl-match-line">{offer.line} · {guestsText(offer)} · {offer.where}</p>
          <ul>
            {offer.includes.map((i) => <li key={i}>{i}</li>)}
          </ul>
        </section>

        <section className="pl-step" aria-labelledby="pl-send">
          <h2 id="pl-send" className="pl-step-title">Your details</h2>
          <RequestForm
            offerId={offer.id}
            onOfferChange={fromForm}
            guests={guests}
            onGuestsChange={setGuests}
            className="rq--paper"
          />
        </section>
      </div>

      <aside className="pl-slip" aria-label="Your plan so far">
        <h2>Your plan</h2>
        <dl>
          <div><dt>Package</dt><dd>{offer.name}</dd></div>
          <div><dt>Guests</dt><dd>{guests}</dd></div>
          <div><dt>Where</dt><dd>{offer.where}</dd></div>
          <div><dt>Rate</dt><dd>{peso(offer.price)} <small>{offer.unit}</small></dd></div>
        </dl>
        <p className="pl-slip-total"><span>Estimate</span><b>{peso(total)}</b></p>
        <p className="pl-slip-note">{SAMPLE_NOTE}</p>
      </aside>
    </div>
  );
}
