"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { placeOrderAction } from "@/app/order/actions";
import PinMap from "@/components/map/PinMap";
import { branches } from "@/data/branches";
import { checkDelivery, formatDistance, type LatLng } from "@/lib/delivery";
import { isBranchId, peso, type BranchId, type MenuCategory, type MenuItem, type Menus } from "@/lib/menu";
import type { OrderSettings } from "@/lib/orders";
import { pickupWindow, type PickupWindow } from "@/lib/pickup";

type Choice = { size: number; upsize: boolean; addons: string[] };
type Line = Choice & { key: string; itemId: string; name: string; sizeName: string | null; detail: string; unit: number; qty: number };

const manilaTime = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
const firstSize = (i: MenuItem) => Math.max(0, i.prices.findIndex((p) => p !== null));

/** Online order for pickup or delivery: branch, time, items, details. Prices and distances are re-checked on the server. */
export default function Checkout({ menus, settings, initialBranch }: { menus: Menus; settings: OrderSettings; initialBranch?: string }) {
  // Times depend on the clock, so they're worked out in the browser only (and refreshed every 30 s)
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const t = window.setInterval(tick, 30_000);
    return () => window.clearInterval(t);
  }, []);

  const windows = useMemo(
    () => (now ? (Object.fromEntries(branches.map((b) => [b.id, pickupWindow(settings[b.id].schedule, now, settings[b.id].cutoff)])) as Record<BranchId, PickupWindow>) : null),
    [now, settings],
  );
  const canOrder = (id: BranchId) => !!windows && settings[id].ordersOpen && (windows[id].asap || windows[id].slots.length > 0);

  const [branch, setBranch] = useState<BranchId>(() =>
    isBranchId(initialBranch) ? initialBranch : (branches.find((b) => settings[b.id].ordersOpen)?.id ?? "main"),
  );
  const [catId, setCatId] = useState<string | null>(null);
  const [choices, setChoices] = useState<Record<string, Choice>>({});
  const [lines, setLines] = useState<Line[]>([]);
  const [when, setWhen] = useState("asap");
  const [mode, setMode] = useState<"pickup" | "delivery">("pickup");
  const [pin, setPin] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, start] = useTransition();

  const menu = menus[branch];
  const cat = menu.categories.find((c) => c.id === catId) ?? menu.categories[0];
  const win = windows?.[branch] ?? { asap: false, slots: [], opensAt: null };
  const open = canOrder(branch);
  // Keep the chosen time valid as the clock moves on
  const whenValid = when === "asap" ? win.asap : win.slots.some((s) => s.toISOString() === when);
  const effectiveWhen = whenValid ? when : win.asap ? "asap" : (win.slots[0]?.toISOString() ?? "");
  const total = lines.reduce((n, l) => n + l.unit * l.qty, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const rules = settings[branch].delivery;
  const delivers = (id: BranchId) => settings[id].delivery.open && !!settings[id].delivery.store;
  // Switching to a branch that doesn't deliver falls back to pickup without losing the pin
  const how = mode === "delivery" && delivers(branch) ? "delivery" : "pickup";
  const reach = how === "delivery" ? checkDelivery(rules, pin, total) : null;
  // Nothing is wrong before there's a pin (the map says what to do), and an empty cart isn't "below the minimum" yet
  const reachError = reach && !reach.ok && pin && (lines.length > 0 || !reach.error.startsWith("Delivery needs")) ? reach.error : null;
  const deliveryReady = how === "pickup" || (reach?.ok === true && address.trim().length >= 5);

  const pickBranch = (id: BranchId) => {
    if (id === branch) return;
    setBranch(id); setCatId(null); setChoices({}); setLines([]); setError(null);
  };

  const choiceOf = (i: MenuItem): Choice => choices[i.id] ?? { size: firstSize(i), upsize: false, addons: [] };
  const setChoice = (i: MenuItem, patch: Partial<Choice>) => setChoices((c) => ({ ...c, [i.id]: { ...choiceOf(i), ...patch } }));

  const add = (c: MenuCategory, i: MenuItem) => {
    const ch = choiceOf(i);
    const addons = menu.addOns.filter((a) => ch.addons.includes(a.id));
    const unit = (i.prices[ch.size] ?? 0) + (ch.upsize ? (c.upsizePrice ?? 0) : 0) + addons.reduce((n, a) => n + a.price, 0);
    const detail = [c.sizes?.[ch.size], ch.upsize && "upsized", ...addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(" · ");
    const key = [i.id, ch.size, ch.upsize ? 1 : 0, [...ch.addons].sort().join(",")].join("|");
    setError(null);
    setLines((ls) => {
      const hit = ls.find((l) => l.key === key);
      if (hit) return ls.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + 1) } : l));
      return [...ls, { key, itemId: i.id, name: i.name, sizeName: c.sizes?.[ch.size] ?? null, detail, unit, qty: 1, ...ch }];
    });
  };
  const bump = (key: string, d: number) => setLines((ls) => ls.flatMap((l) => (l.key !== key ? [l] : l.qty + d <= 0 ? [] : [{ ...l, qty: Math.min(20, l.qty + d) }])));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await placeOrderAction({
        branch,
        fulfillment: how,
        wantedAt: effectiveWhen === "asap" ? null : effectiveWhen,
        lines: lines.map(({ itemId, size, sizeName, upsize, addons, qty }) => ({ itemId, size, sizeName, upsize, addons, qty })),
        name,
        phone,
        notes,
        delivery: how === "delivery" && pin ? { ...pin, address, landmark } : null,
      });
      if (r?.error) setError(r.error);
    });
  };

  const chosen = branches.find((b) => b.id === branch)!;
  const otherOpen = branches.find((b) => b.id !== branch && canOrder(b.id));

  return (
    <form className="checkout" onSubmit={submit}>
      <div className="checkout-main">
        {/* Branch, pickup or delivery, and time: one line until they want to change it (open by itself when this branch can't take orders) */}
        <details className="checkout-setup" open={!!windows && !open}>
          <summary>
            <span className="checkout-setup-label">{how === "delivery" ? "Delivery from" : "Pickup at"}</span>
            <span className="checkout-setup-main">
              <b>{chosen.name}</b>
              <small>
                {!windows
                  ? "Checking times…"
                  : !open
                    ? settings[branch].ordersOpen ? "Closed for the rest of today" : "Not taking online orders right now"
                    : effectiveWhen === "asap"
                      ? how === "delivery" ? "As soon as possible" : "As soon as it\u2019s ready, about 20 min"
                      : `Today, ${manilaTime(new Date(effectiveWhen))}`}
              </small>
            </span>
            <span className="checkout-setup-change"><span className="is-open">Change</span><span className="is-shut">Done</span></span>
          </summary>
          <div className="checkout-setup-body">
                <fieldset className="slip-course">
                  <legend>Branch</legend>
                  <div className="order-choice">
                    {branches.map((b) => {
                      const w = windows?.[b.id];
                      const status = !settings[b.id].ordersOpen
                        ? "Not taking online orders right now"
                        : !w
                          ? "Checking hours…"
                          : w.asap
                            ? `Open now · last pickup ${w.slots.length ? manilaTime(w.slots.at(-1)!) : "soon"}`
                            : w.opensAt && w.slots.length
                              ? `Pre-order · opens ${manilaTime(w.opensAt)}`
                              : "Closed for today";
                      return (
                        <label key={b.id} className={canOrder(b.id) ? undefined : "is-off"}>
                          <input type="radio" name="branch" checked={branch === b.id} onChange={() => pickBranch(b.id)} />
                          <span><b>{b.name}</b><small>{b.serves} · {status}</small></span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset className="slip-course">
                  <legend>How</legend>
                  <div className="order-toggle">
                    <label>
                      <input type="radio" name="fulfillment" checked={how === "pickup"} onChange={() => setMode("pickup")} />
                      <span>Pickup</span>
                    </label>
                    {delivers(branch) ? (
                      <label>
                        <input type="radio" name="fulfillment" checked={how === "delivery"} onChange={() => setMode("delivery")} />
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
                      {rules.freeWithin ? `Free within ${formatDistance(rules.freeWithin)} of the branch. ` : ""}
                      We deliver up to {formatDistance(rules.maxDistance)}{rules.minOrder ? `, from ${peso(rules.minOrder)}` : ""}.
                    </p>
                  )}
                </fieldset>

                <fieldset className="slip-course">
                  <legend>When</legend>
                  {!windows ? (
                    <p className="order-hint">Checking pickup times…</p>
                  ) : open ? (
                    <label className="checkout-when">
                      <span className="sr-only">{how === "delivery" ? "Delivery time" : "Pickup time"}</span>
                      <select value={effectiveWhen} onChange={(e) => setWhen(e.target.value)}>
                        {win.asap && <option value="asap">{how === "delivery" ? "As soon as possible" : "As soon as it\u2019s ready (about 20 min)"}</option>}
                        {win.slots.map((s) => (
                          <option key={s.toISOString()} value={s.toISOString()}>Today, {manilaTime(s)}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <p className="checkout-note">
                      {settings[branch].ordersOpen ? `${chosen.name} is closed for the rest of today.` : `${chosen.name} isn't taking online orders right now.`}{" "}
                      {otherOpen ? `You can order from ${otherOpen.name} instead.` : "Please come back during opening hours, or drop by."}
                    </p>
                  )}
                </fieldset>
          </div>
        </details>

        {how === "delivery" && (
          <fieldset className="slip-course delivery-where">
            <legend>Deliver to</legend>
            <PinMap pin={pin} onPin={setPin} center={rules.store!} store={rules.store} freeRadius={rules.freeWithin} label="Where we should deliver" />
            {reach?.ok ? (
              <p className={`delivery-reach${reach.free ? " is-free" : ""}`} role="status">
                About {formatDistance(reach.distance)} from {chosen.name}.{" "}
                {reach.free ? "Free delivery. The cafe confirms the fee before you pay." : "The cafe tells you the delivery fee before you pay."}
              </p>
            ) : (
              reachError && <p className="delivery-reach is-off" role="status">{reachError}</p>
            )}
            <div className="slip-fields">
              <label>
                Address <small>house or unit, street, barangay</small>
                <input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" required minLength={5} maxLength={200} placeholder="12 Champaca St., Western Bicutan" />
              </label>
              <label>
                Landmark <small>optional</small>
                <input value={landmark} onChange={(e) => setLandmark(e.target.value)} maxLength={200} placeholder="Blue gate, beside the sari-sari store" />
              </label>
            </div>
          </fieldset>
        )}

        <fieldset className="slip-course" disabled={!open}>
          <legend>Menu</legend>
          <div className="order-cats" role="group" aria-label="Menu section">
            {menu.categories.map((c) => (
              <button key={c.id} type="button" aria-pressed={c.id === cat.id} onClick={() => setCatId(c.id)}>{c.title}</button>
            ))}
          </div>
          {cat.note && <p className="order-hint">{cat.note}</p>}
          <ul className="menu-picks">
            {cat.items.map((i) => {
              const ch = choiceOf(i);
              const addOns = cat.kind === "drink" ? menu.addOns.filter((a) => a.available) : [];
              const prices = i.prices.flatMap((p) => (p == null ? [] : [p]));
              const hasChoices = Boolean(cat.sizes) || cat.upsizePrice != null || addOns.length > 0;
              const unit = (i.prices[ch.size] ?? 0) + (ch.upsize ? (cat.upsizePrice ?? 0) : 0) + addOns.filter((a) => ch.addons.includes(a.id)).reduce((n, a) => n + a.price, 0);
              const name = (
                <span className="menu-pick-name">
                  <b>{i.name}</b>
                  {!i.available ? <small className="menu-pick-sold">Sold out</small> : i.note && <small>{i.note}</small>}
                </span>
              );
              const price = <span className="menu-pick-price">{prices.length > 1 ? `from ${peso(Math.min(...prices))}` : peso(prices[0] ?? 0)}</span>;
              if (!i.available) return <li key={i.id} className="menu-pick is-sold-out"><div className="menu-pick-row">{name}{price}</div></li>;
              if (!hasChoices) {
                return (
                  <li key={i.id} className="menu-pick">
                    <div className="menu-pick-row">
                      {name}
                      {price}
                      <button type="button" className="pick-add" onClick={() => add(cat, i)} aria-label={`Add ${i.name}`}>Add</button>
                    </div>
                  </li>
                );
              }
              return (
                <li key={i.id} className="menu-pick">
                  <details>
                    <summary className="menu-pick-row">
                      {name}
                      {price}
                      <span className="menu-pick-toggle"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span>
                    </summary>
                    <div className="menu-pick-options">
                      {cat.sizes && (
                        <fieldset className="menu-sizes">
                          <legend className="sr-only">{i.name} size</legend>
                          {cat.sizes.map((s, n) =>
                            i.prices[n] == null ? null : (
                              <label key={s} className="menu-size">
                                <input type="radio" name={`size-${i.id}`} checked={ch.size === n} onChange={() => setChoice(i, { size: n })} />
                                <span>{s}<small>{peso(i.prices[n]!)}</small></span>
                              </label>
                            ),
                          )}
                        </fieldset>
                      )}
                      {cat.upsizePrice != null && (
                        <label className="pick-check">
                          <input type="checkbox" checked={ch.upsize} onChange={(e) => setChoice(i, { upsize: e.target.checked })} />
                          Upsize +{peso(cat.upsizePrice)}
                        </label>
                      )}
                      {addOns.length > 0 && (
                        <div className="menu-addons">
                          <span className="menu-addons-title">Add-ons</span>
                          {addOns.map((a) => (
                            <label key={a.id} className="pick-check">
                              <input
                                type="checkbox"
                                checked={ch.addons.includes(a.id)}
                                onChange={(e) => setChoice(i, { addons: e.target.checked ? [...ch.addons, a.id] : ch.addons.filter((x) => x !== a.id) })}
                              />
                              {a.name} +{peso(a.price)}
                            </label>
                          ))}
                        </div>
                      )}
                      <button type="button" className="pick-add menu-pick-add" onClick={() => add(cat, i)}>Add · {peso(unit)}</button>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>

      <aside className="checkout-slip" id="your-order" aria-labelledby="your-order-title">
        <h2 id="your-order-title">Your order</h2>
        {how === "delivery" ? (
          <p className="slip-where">Delivery from {chosen.name}<small>{address.trim() || "Set your address and pin"}</small></p>
        ) : (
          <p className="slip-where">Pickup at {chosen.name}<small>{chosen.address}</small></p>
        )}
        {lines.length === 0 ? (
          <p className="slip-empty">Nothing yet. Choose a drink or a dish, then tap Add.</p>
        ) : (
          <ul className="slip-lines">
            {lines.map((l) => (
              <li key={l.key}>
                <span className="slip-line-name">{l.name}{l.detail && <small>{l.detail}</small>}</span>
                <span className="order-stepper">
                  <button type="button" onClick={() => bump(l.key, -1)} aria-label={`One less ${l.name}`}>−</button>
                  <output aria-live="polite" aria-label={`${l.name} quantity`}>{l.qty}</output>
                  <button type="button" onClick={() => bump(l.key, 1)} aria-label={`One more ${l.name}`}>+</button>
                </span>
                <span className="slip-line-total">{peso(l.unit * l.qty)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="slip-fields">
          <label>Name<input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required minLength={2} maxLength={60} placeholder="Juan Dela Cruz" /></label>
          <label>Mobile number<input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" required inputMode="tel" placeholder="0917 123 4567" /></label>
          <label>Notes <small>optional</small><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} placeholder={how === "delivery" ? "Less sugar, who receives it, gate code…" : "Less sugar, extra sauce, who's picking up…"} /></label>
        </div>

        {how === "delivery" ? (
          <>
            <p className="slip-fee">
              <span>Delivery</span>
              <b>{reach?.ok ? (reach.free ? "Free" : "Confirmed by the cafe") : "–"}</b>
            </p>
            <p className="slip-pay">Pay by GCash, Maya or bank transfer once the cafe confirms your order and the delivery fee.</p>
          </>
        ) : (
          <p className="slip-pay">Pay when you pick up: cash or GCash at the counter.</p>
        )}
        <div className="slip-total"><span>{how === "delivery" ? "Items" : "Total"}</span><b>{peso(total)}</b></div>
        {error && <p className="slip-error" role="alert">{error}</p>}
        <button type="submit" className="order-submit" disabled={!open || lines.length === 0 || sending || !deliveryReady}>
          {sending
            ? "Placing your order…"
            : lines.length === 0
              ? "Add an item to order"
              : !deliveryReady
                ? reach?.ok ? "Add your address" : "Set where to deliver"
                : how === "delivery" ? "Send order" : "Place order"}
        </button>
        <p className="slip-privacy">
          We use your name, number{how === "delivery" ? ", address and pin" : ""} only to prepare this order and reach you about it.
          Order details are kept for a year, then your personal details are removed. <a href="/privacy" target="_blank">Privacy notice</a>
        </p>
      </aside>

      {count > 0 && (
        <a className="checkout-bar" href="#your-order">
          <span>{count} item{count === 1 ? "" : "s"} · {peso(total)}</span>
          <b>Review order</b>
        </a>
      )}
    </form>
  );
}
