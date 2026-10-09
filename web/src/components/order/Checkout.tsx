"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { placeOrderAction } from "@/app/order/actions";
import { branches } from "@/data/branches";
import { isBranchId, peso, type BranchId, type MenuCategory, type MenuItem, type Menus } from "@/lib/menu";
import type { OrderSettings } from "@/lib/orders";
import { pickupWindow, type PickupWindow } from "@/lib/pickup";

type Choice = { size: number; upsize: boolean; addons: string[] };
type Line = Choice & { key: string; itemId: string; name: string; detail: string; unit: number; qty: number };

const manilaTime = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });
const firstSize = (i: MenuItem) => Math.max(0, i.prices.findIndex((p) => p !== null));

/** Online order for pickup: branch, time, items, details. Prices shown here are re-checked on the server. */
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
    () => (now ? (Object.fromEntries(branches.map((b) => [b.id, pickupWindow(b, now, settings[b.id].cutoff)])) as Record<BranchId, PickupWindow>) : null),
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
      return [...ls, { key, itemId: i.id, name: i.name, detail, unit, qty: 1, ...ch }];
    });
  };
  const bump = (key: string, d: number) => setLines((ls) => ls.flatMap((l) => (l.key !== key ? [l] : l.qty + d <= 0 ? [] : [{ ...l, qty: Math.min(20, l.qty + d) }])));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await placeOrderAction({
        branch,
        fulfillment: "pickup",
        wantedAt: effectiveWhen === "asap" ? null : effectiveWhen,
        lines: lines.map(({ itemId, size, upsize, addons, qty }) => ({ itemId, size, upsize, addons, qty })),
        name,
        phone,
        notes,
      });
      if (r?.error) setError(r.error);
    });
  };

  const chosen = branches.find((b) => b.id === branch)!;
  const otherOpen = branches.find((b) => b.id !== branch && canOrder(b.id));

  return (
    <form className="checkout" onSubmit={submit}>
      <div className="checkout-main">
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
              <input type="radio" name="fulfillment" checked readOnly />
              <span>Pickup</span>
            </label>
            <label className="is-soon" aria-disabled="true">
              <input type="radio" name="fulfillment" disabled />
              <span>Delivery <small>soon</small></span>
            </label>
          </div>
        </fieldset>

        <fieldset className="slip-course">
          <legend>When</legend>
          {!windows ? (
            <p className="order-hint">Checking pickup times…</p>
          ) : open ? (
            <label className="checkout-when">
              <span className="sr-only">Pickup time</span>
              <select value={effectiveWhen} onChange={(e) => setWhen(e.target.value)}>
                {win.asap && <option value="asap">As soon as it&rsquo;s ready (about 20 min)</option>}
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

        <fieldset className="slip-course" disabled={!open}>
          <legend>Items</legend>
          <div className="order-cats" role="group" aria-label="Menu section">
            {menu.categories.map((c) => (
              <button key={c.id} type="button" aria-pressed={c.id === cat.id} onClick={() => setCatId(c.id)}>{c.title}</button>
            ))}
          </div>
          {cat.note && <p className="order-hint">{cat.note}</p>}
          <ul className="pick-list">
            {cat.items.map((i) => {
              const ch = choiceOf(i);
              const addOns = cat.kind === "drink" ? menu.addOns.filter((a) => a.available) : [];
              return (
                <li key={i.id} className={i.available ? undefined : "is-sold-out"}>
                  <div className="pick-name">
                    <b>{i.name}</b>
                    {!i.available ? <small className="pick-sold">Sold out</small> : i.note && <small>{i.note}</small>}
                  </div>
                  {i.available && (
                    <div className="pick-options">
                      {cat.sizes ? (
                        <select aria-label={`${i.name} size`} value={ch.size} onChange={(e) => setChoice(i, { size: Number(e.target.value) })}>
                          {cat.sizes.map((s, n) => (i.prices[n] == null ? null : <option key={s} value={n}>{s} · {peso(i.prices[n]!)}</option>))}
                        </select>
                      ) : (
                        <span className="pick-price">{peso(i.prices[0]!)}</span>
                      )}
                      {cat.upsizePrice != null && (
                        <label className="pick-check">
                          <input type="checkbox" checked={ch.upsize} onChange={(e) => setChoice(i, { upsize: e.target.checked })} />
                          Upsize +{peso(cat.upsizePrice)}
                        </label>
                      )}
                      {addOns.length > 0 && (
                        <details className="pick-addons">
                          <summary>Add-ons{ch.addons.length ? ` (${ch.addons.length})` : ""}</summary>
                          <div>
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
                        </details>
                      )}
                      <button type="button" className="pick-add" onClick={() => add(cat, i)} aria-label={`Add ${i.name}`}>Add</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </fieldset>
      </div>

      <aside className="checkout-slip" id="your-order" aria-labelledby="your-order-title">
        <h2 id="your-order-title">Your order</h2>
        <p className="slip-where">Pickup at {chosen.name}<small>{chosen.address}</small></p>
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
          <label>Notes <small>optional</small><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} placeholder="Less sugar, extra sauce, who's picking up…" /></label>
        </div>

        <p className="slip-pay">Pay when you pick up: cash or GCash at the counter.</p>
        <div className="slip-total"><span>Total</span><b>{peso(total)}</b></div>
        {error && <p className="slip-error" role="alert">{error}</p>}
        <button type="submit" className="order-submit" disabled={!open || lines.length === 0 || sending}>
          {sending ? "Placing your order…" : lines.length === 0 ? "Add an item to order" : "Place order"}
        </button>
        <p className="slip-privacy">
          We use your name and number only to prepare this order and reach you about it. Order details are kept for a year,
          then your name and number are removed.
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
