"use client";

import { useRef, useState } from "react";
import { branches } from "@/data/branches";
import { peso, type BranchId, type MenuCategory, type MenuItem, type Menus } from "@/lib/menu";
import { CloseIcon } from "./Icons";

type Line = { key: string; name: string; size?: string; unit: number; qty: number };

const keyOf = (cat: MenuCategory, item: MenuItem, size: number) => `${cat.id}|${item.id}|${size}`;

/**
 * Placeholder order form. Online ordering is not live yet, so "Review order" only shows a
 * summary and points people to the branch's Instagram; nothing is sent.
 */
export default function OrderDialog({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [branch, setBranch] = useState<BranchId>("main");
  const [mode, setMode] = useState<"pickup" | "dine-in">("pickup");
  const [menus, setMenus] = useState<Menus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [catId, setCatId] = useState<string | null>(null);
  const [sizeOf, setSizeOf] = useState<Record<string, number>>({});
  const [lines, setLines] = useState<Record<string, Line>>({});
  const [sent, setSent] = useState(false);

  const menu = menus?.[branch];
  const cat = menu?.categories.find((c) => c.id === catId) ?? menu?.categories[0];
  const chosen = branches.find((b) => b.id === branch)!;
  const list = Object.values(lines).filter((l) => l.qty > 0);
  const total = list.reduce((sum, l) => sum + l.unit * l.qty, 0);

  // The menu (with today's sold-out items) loads the first time the form opens
  const load = () => {
    setLoadFailed(false);
    fetch("/api/v1/menu")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((m: Menus) => setMenus(m))
      .catch(() => setLoadFailed(true));
  };
  const open = () => { setSent(false); ref.current?.showModal(); if (!menus) load(); };
  const close = () => ref.current?.close();

  const pickBranch = (id: BranchId) => {
    if (id === branch) return;
    // Each branch has its own menu and prices, so start a fresh order
    setBranch(id); setCatId(null); setLines({}); setSizeOf({});
  };

  const change = (item: MenuItem, d: number) => {
    if (!cat) return;
    const size = sizeOf[`${cat.id}|${item.name}`] ?? firstSize(item);
    const key = keyOf(cat, item, size);
    setLines((ls) => {
      const cur = ls[key] ?? { key, name: item.name, size: cat.sizes?.[size], unit: item.prices[size]!, qty: 0 };
      return { ...ls, [key]: { ...cur, qty: Math.max(0, Math.min(20, cur.qty + d)) } };
    });
  };

  return (
    <>
      <button type="button" className={className} onClick={open}>Order here</button>

      <dialog ref={ref} className="order" aria-labelledby="order-title" onClick={(e) => e.target === ref.current && close()}>
        <div className="order-sheet">
          <header className="order-head">
            <h2 id="order-title">{sent ? "Order preview" : "Place an order"}</h2>
            <button type="button" className="icon-btn" onClick={close} aria-label="Close order form"><CloseIcon /></button>
          </header>

          {sent ? (
            <div className="order-done">
              <p className="order-done-big">Online ordering is coming soon.</p>
              <p>
                This form is a preview, so your order hasn&rsquo;t been sent. To order now, message{" "}
                <b>{chosen.name}</b> on Instagram with the list below.
              </p>
              <OrderLines lines={list} total={total} />
              <div className="order-actions">
                <a className="order-submit" href={chosen.socials.instagram} target="_blank" rel="noopener noreferrer">
                  Message {chosen.socials.handle}
                </a>
                <button type="button" className="order-link" onClick={() => setSent(false)}>Edit order</button>
              </div>
            </div>
          ) : (
            <form className="order-form" onSubmit={(e) => { e.preventDefault(); if (list.length) setSent(true); }}>
              <fieldset>
                <legend>Branch</legend>
                <div className="order-choice">
                  {branches.map((b) => (
                    <label key={b.id}>
                      <input type="radio" name="branch" checked={branch === b.id} onChange={() => pickBranch(b.id)} />
                      <span><b>{b.name}</b><small>{b.serves} · {b.hoursText[0].time}</small></span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>How</legend>
                <div className="order-toggle">
                  {(["pickup", "dine-in"] as const).map((m) => (
                    <label key={m}>
                      <input type="radio" name="mode" checked={mode === m} onChange={() => setMode(m)} />
                      <span>{m === "pickup" ? "Pickup" : "Dine in"}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend>Items</legend>
                {!menu || !cat ? (
                  <p className="order-hint" role="status">
                    {loadFailed ? (
                      <>The menu didn&rsquo;t load. <button type="button" className="order-link" onClick={load}>Try again</button></>
                    ) : (
                      "Loading the menu…"
                    )}
                  </p>
                ) : (
                  <>
                    <div className="order-cats" role="group" aria-label="Menu category">
                      {menu.categories.map((c) => (
                        <button key={c.id} type="button" aria-pressed={c.id === cat.id} onClick={() => setCatId(c.id)}>{c.title}</button>
                      ))}
                    </div>
                    {cat.note && <p className="order-hint">{cat.note}</p>}
                    <ul className="order-items">
                      {cat.items.map((i) => {
                        const sk = `${cat.id}|${i.name}`;
                        const size = sizeOf[sk] ?? firstSize(i);
                        const n = lines[keyOf(cat, i, size)]?.qty ?? 0;
                        return (
                          <li key={i.id} className={`${n ? "is-picked" : ""}${i.available ? "" : " is-sold-out"}`}>
                            <span className="order-item-name">
                              {i.name}
                              {!i.available ? <small>Sold out</small> : !cat.sizes && <small>{peso(i.prices[0]!)}</small>}
                            </span>
                            {cat.sizes && i.available && (
                              <select
                                className="order-size"
                                aria-label={`${i.name} size`}
                                value={size}
                                onChange={(e) => setSizeOf((s) => ({ ...s, [sk]: Number(e.target.value) }))}
                              >
                                {cat.sizes.map((label, idx) =>
                                  i.prices[idx] === null ? null : <option key={label} value={idx}>{label} · {peso(i.prices[idx]!)}</option>,
                                )}
                              </select>
                            )}
                            <span className="order-stepper">
                              <button type="button" onClick={() => change(i, -1)} disabled={!n} aria-label={`One less ${i.name}`}>−</button>
                              <output aria-live="polite" aria-label={`${i.name} quantity`}>{n}</output>
                              <button type="button" onClick={() => change(i, 1)} disabled={!i.available} aria-label={`One more ${i.name}`}>+</button>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </fieldset>

              {list.length > 0 && (
                <section className="order-summary" aria-label="Your order">
                  <h3>Your order</h3>
                  <OrderLines lines={list} />
                </section>
              )}

              <div className="order-fields">
                <label>Name<input name="name" autoComplete="name" required placeholder="Juan Dela Cruz" /></label>
                <label>Mobile number<input name="phone" type="tel" autoComplete="tel" required placeholder="09XX XXX XXXX" pattern="[0-9+ ]{10,15}" /></label>
                <label className="order-wide">Notes<textarea name="notes" rows={2} placeholder="Add-ons, less sugar, pickup time…" /></label>
              </div>

              <footer className="order-foot">
                <p><span>Total</span><b>{peso(total)}</b></p>
                <button type="submit" className="order-submit" disabled={!list.length}>
                  {list.length ? "Review order" : "Add an item to continue"}
                </button>
              </footer>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

function firstSize(i: MenuItem) {
  const idx = i.prices.findIndex((p) => p !== null);
  return idx < 0 ? 0 : idx;
}

function OrderLines({ lines, total }: { lines: Line[]; total?: number }) {
  return (
    <ul className="order-lines">
      {lines.map((l) => (
        <li key={l.key}>
          <span>{l.qty} × {l.name}{l.size && <small> · {l.size}</small>}</span>
          <span>{peso(l.unit * l.qty)}</span>
        </li>
      ))}
      {total !== undefined && <li className="order-total"><span>Total</span><span>{peso(total)}</span></li>}
    </ul>
  );
}
