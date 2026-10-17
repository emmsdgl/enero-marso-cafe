"use client";

import { useState } from "react";
import Sheet from "@/components/Sheet";
import { peso, type MenuAddon, type MenuCategory, type MenuItem } from "@/lib/menu";

export type Choice = { size: number; upsize: boolean; addons: string[] };
export type Picked = { category: MenuCategory; item: MenuItem };

/** The first size an item is sold in (an item can skip a size, e.g. no Large) */
export const firstSize = (i: MenuItem) => Math.max(0, i.prices.findIndex((p) => p !== null));

/**
 * One item's choices, in a sheet: what it is (the description behind the (i)), its size, upsize,
 * add-ons and how many, then "Add · ₱X". A sold-out item shows only what it is.
 */
export default function ItemSheet({
  picked,
  open,
  addOns,
  onClose,
  onAdd,
}: {
  picked: Picked | null;
  open: boolean;
  addOns: MenuAddon[];
  onClose: () => void;
  onAdd: (c: MenuCategory, i: MenuItem, choice: Choice, qty: number) => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={picked?.item.name ?? ""}>
      {/* Keyed by item, so every item opens with fresh choices */}
      {picked && <Choices key={picked.item.id} picked={picked} addOns={addOns} onAdd={onAdd} />}
    </Sheet>
  );
}

function Choices({ picked: { category: c, item: i }, addOns, onAdd }: { picked: Picked; addOns: MenuAddon[]; onAdd: (c: MenuCategory, i: MenuItem, choice: Choice, qty: number) => void }) {
  const sizes = (c.sizes ?? []).flatMap((name, n) => (i.prices[n] == null ? [] : [{ name, n, price: i.prices[n]! }]));
  const extras = c.kind === "drink" ? addOns.filter((a) => a.available) : [];
  const [size, setSize] = useState(firstSize(i));
  const [upsize, setUpsize] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [qty, setQty] = useState(1);
  const unit = (i.prices[size] ?? 0) + (upsize ? (c.upsizePrice ?? 0) : 0) + extras.filter((a) => chosen.includes(a.id)).reduce((n, a) => n + a.price, 0);

  return (
    <>
      {(i.note || i.description) && (
        <div className="item-about">
          {i.note && <p className="item-note">{i.note}</p>}
          {i.description && <p>{i.description}</p>}
        </div>
      )}
      {!i.available ? (
        <p className="item-sold">Sold out for now. Please check back later, or choose something else.</p>
      ) : (
        <>
          {sizes.length > 0 && (
            <fieldset className="item-course">
              <legend>Size</legend>
              <div className="menu-sizes">
                {sizes.map((s) => (
                  <label key={s.n} className="menu-size">
                    <input type="radio" name="item-size" checked={size === s.n} onChange={() => setSize(s.n)} />
                    <span>{s.name}<small>{peso(s.price)}</small></span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          {c.upsizePrice != null && (
            <fieldset className="item-course">
              <legend>Cup</legend>
              <label className="pick-check item-check">
                <input type="checkbox" checked={upsize} onChange={(e) => setUpsize(e.target.checked)} />
                Upsize <span>+{peso(c.upsizePrice)}</span>
              </label>
            </fieldset>
          )}
          {extras.length > 0 && (
            <fieldset className="item-course">
              <legend>Add-ons</legend>
              <div className="item-addons">
                {extras.map((a) => (
                  <label key={a.id} className="pick-check item-check">
                    <input
                      type="checkbox"
                      checked={chosen.includes(a.id)}
                      onChange={(e) => setChosen((ids) => (e.target.checked ? [...ids, a.id] : ids.filter((x) => x !== a.id)))}
                    />
                    {a.name} <span>+{peso(a.price)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}
          <div className="item-foot">
            <span className="order-stepper" role="group" aria-label="How many">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="One less">−</button>
              <output aria-live="polite">{qty}</output>
              <button type="button" onClick={() => setQty((q) => Math.min(20, q + 1))} disabled={qty >= 20} aria-label="One more">+</button>
            </span>
            <button type="button" className="pick-add item-add" onClick={() => onAdd(c, i, { size, upsize, addons: chosen }, qty)}>
              Add · {peso(unit * qty)}
            </button>
          </div>
        </>
      )}
    </>
  );
}
