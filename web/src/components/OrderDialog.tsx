"use client";

import { useMemo, useRef, useState } from "react";
import { branches } from "@/data/branches";
import { coffee, food, peso } from "@/data/menu";
import { CloseIcon } from "./Icons";

type BranchId = "main" | "noir";

/**
 * Placeholder order form. Online ordering is not live yet, so "Place order" only shows a
 * confirmation preview and points people to the branch's Instagram; nothing is sent.
 */
export default function OrderDialog({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [branch, setBranch] = useState<BranchId>("main");
  const [mode, setMode] = useState<"pickup" | "dine-in">("pickup");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [sent, setSent] = useState(false);

  const items = useMemo(() => (branch === "noir" ? coffee : [...coffee, ...food]), [branch]);
  const lines = items.filter((i) => (qty[i.name] ?? 0) > 0);
  const total = lines.reduce((sum, i) => sum + i.price * qty[i.name], 0);
  const chosen = branches.find((b) => b.id === branch)!;

  const open = () => { setSent(false); ref.current?.showModal(); };
  const close = () => ref.current?.close();
  const step = (name: string, d: number) => setQty((q) => ({ ...q, [name]: Math.max(0, Math.min(20, (q[name] ?? 0) + d)) }));
  const pickBranch = (id: BranchId) => {
    setBranch(id);
    // Noir is a drinks-only cart: drop any food already in the order
    if (id === "noir") setQty((q) => Object.fromEntries(Object.entries(q).filter(([n]) => coffee.some((c) => c.name === n))));
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
              <ul className="order-lines">
                {lines.map((i) => (
                  <li key={i.name}><span>{qty[i.name]} × {i.name}</span><span>{peso(i.price * qty[i.name])}</span></li>
                ))}
                <li className="order-total"><span>Total</span><span>{peso(total)}</span></li>
              </ul>
              <div className="order-actions">
                <a className="order-submit" href={chosen.socials.instagram} target="_blank" rel="noopener noreferrer">
                  Message {chosen.socials.handle}
                </a>
                <button type="button" className="order-link" onClick={() => setSent(false)}>Edit order</button>
              </div>
            </div>
          ) : (
            <form className="order-form" onSubmit={(e) => { e.preventDefault(); if (lines.length) setSent(true); }}>
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
                <ul className="order-items">
                  {items.map((i) => {
                    const n = qty[i.name] ?? 0;
                    return (
                      <li key={i.name} className={n ? "is-picked" : ""}>
                        <span className="order-item-name">{i.name}<small>{peso(i.price)}</small></span>
                        <span className="order-stepper">
                          <button type="button" onClick={() => step(i.name, -1)} disabled={!n} aria-label={`One less ${i.name}`}>−</button>
                          <output aria-live="polite" aria-label={`${i.name} quantity`}>{n}</output>
                          <button type="button" onClick={() => step(i.name, 1)} aria-label={`One more ${i.name}`}>+</button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {branch === "noir" && <p className="order-hint">Cafe Noir is a drinks-only cart, so food isn&rsquo;t listed.</p>}
              </fieldset>

              <div className="order-fields">
                <label>Name<input name="name" autoComplete="name" required placeholder="Juan Dela Cruz" /></label>
                <label>Mobile number<input name="phone" type="tel" autoComplete="tel" required placeholder="09XX XXX XXXX" pattern="[0-9+ ]{10,15}" /></label>
                <label className="order-wide">Notes<textarea name="notes" rows={2} placeholder="Less sugar, extra ice, pickup time…" /></label>
              </div>

              <footer className="order-foot">
                <p><span>Total</span><b>{peso(total)}</b></p>
                <button type="submit" className="order-submit" disabled={!lines.length}>
                  {lines.length ? "Review order" : "Add an item to continue"}
                </button>
              </footer>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
