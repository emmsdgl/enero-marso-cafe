"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { placeOrderAction } from "@/app/order/actions";
import { branches } from "@/data/branches";
import { checkDelivery, formatDistance, type LatLng } from "@/lib/delivery";
import { isBranchId, peso, type BranchId, type MenuCategory, type MenuItem, type Menus } from "@/lib/menu";
import type { OrderSettings } from "@/lib/orders";
import { pickupWindow, type PickupWindow } from "@/lib/pickup";
import HowStep, { type How } from "./HowStep";
import ItemSheet, { firstSize, type Choice, type Picked } from "./ItemSheet";
import MenuPicker from "./MenuPicker";

type Line = Choice & { key: string; itemId: string; name: string; sizeName: string | null; detail: string; unit: number; qty: number };

const manilaTime = (d: Date) => d.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

/**
 * Online order: the branch, then the menu, then pickup or delivery as the last step, beside the
 * order slip with the customer's details. Prices and distances are re-checked on the server.
 */
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
  const delivers = (id: BranchId) => settings[id].delivery.open && !!settings[id].delivery.store;

  const [branch, setBranch] = useState<BranchId>(() =>
    isBranchId(initialBranch) ? initialBranch : (branches.find((b) => settings[b.id].ordersOpen)?.id ?? "main"),
  );
  const [switching, setSwitching] = useState<BranchId | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justAdded, setJustAdded] = useState<{ id: string; said: string } | null>(null);
  const [when, setWhen] = useState("asap");
  const [mode, setMode] = useState<How | null>(null);
  const [pin, setPin] = useState<LatLng | null>(null);
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, start] = useTransition();

  // "Added" shows on the item's button for a moment
  useEffect(() => {
    if (!justAdded) return;
    const t = window.setTimeout(() => setJustAdded(null), 1600);
    return () => window.clearTimeout(t);
  }, [justAdded]);

  const menu = menus[branch];
  const win = windows?.[branch] ?? null;
  const open = canOrder(branch);
  // Keep the chosen time valid as the clock moves on
  const whenValid = win && (when === "asap" ? win.asap : win.slots.some((s) => s.toISOString() === when));
  const effectiveWhen = whenValid ? when : win?.asap ? "asap" : (win?.slots[0]?.toISOString() ?? "");
  const total = lines.reduce((n, l) => n + l.unit * l.qty, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  const rules = settings[branch].delivery;
  // Nothing is chosen for them; a branch that doesn't deliver asks for pickup again
  const how: How | null = mode === "delivery" ? (delivers(branch) ? "delivery" : null) : mode;
  const reach = how === "delivery" ? checkDelivery(rules, pin, total) : null;
  // Nothing is wrong before there's a pin (the map says what to do); the minimum has its own line
  const reachError = reach && !reach.ok && pin && !reach.error.startsWith("Delivery needs") ? reach.error : null;
  const deliveryReady = how === "pickup" || (how === "delivery" && reach?.ok === true && address.trim().length >= 5);

  const chosen = branches.find((b) => b.id === branch)!;
  const otherOpen = branches.find((b) => b.id !== branch && canOrder(b.id));

  const pickBranch = (id: BranchId) => {
    setSwitching(null);
    if (id === branch) return;
    // Each branch has its own menu, so the order starts over
    setBranch(id); setLines([]); setError(null);
  };

  const add = (c: MenuCategory, i: MenuItem, ch: Choice, qty: number) => {
    const addons = menu.addOns.filter((a) => ch.addons.includes(a.id));
    const unit = (i.prices[ch.size] ?? 0) + (ch.upsize ? (c.upsizePrice ?? 0) : 0) + addons.reduce((n, a) => n + a.price, 0);
    const detail = [c.sizes?.[ch.size], ch.upsize && "upsized", ...addons.map((a) => `+ ${a.name}`)].filter(Boolean).join(" · ");
    const key = [i.id, ch.size, ch.upsize ? 1 : 0, [...ch.addons].sort().join(",")].join("|");
    setError(null);
    setLines((ls) => {
      const hit = ls.find((l) => l.key === key);
      if (hit) return ls.map((l) => (l.key === key ? { ...l, qty: Math.min(20, l.qty + qty) } : l));
      return [...ls, { key, itemId: i.id, name: i.name, sizeName: c.sizes?.[ch.size] ?? null, detail, unit, qty, ...ch }];
    });
    setJustAdded({ id: i.id, said: `Added ${qty > 1 ? `${qty} ` : ""}${i.name}${detail ? `, ${detail}` : ""}.` });
  };
  const bump = (key: string, d: number) => setLines((ls) => ls.flatMap((l) => (l.key !== key ? [l] : l.qty + d <= 0 ? [] : [{ ...l, qty: Math.min(20, l.qty + d) }])));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!how) return;
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

  // One line under the branch's name: can they order now, and can it be delivered
  const availability = (id: BranchId) => {
    const w = windows?.[id];
    if (!settings[id].ordersOpen) return "Not taking online orders right now";
    if (!w) return "Checking hours…";
    if (!w.asap && !w.slots.length) return "Closed for the rest of today";
    const d = settings[id].delivery;
    const soon = w.asap ? "Pickup in about 20 min" : `Pre-order · opens ${w.opensAt ? manilaTime(w.opensAt) : "later"}`;
    const away = delivers(id) ? `Delivery up to ${formatDistance(d.maxDistance)}${d.minOrder ? `, from ${peso(d.minOrder)}` : ""}` : "Pickup only right now";
    return `${soon} · ${away}`;
  };
  const closedNote = !windows || open
    ? null
    : `${settings[branch].ordersOpen ? `${chosen.name} is closed for the rest of today.` : `${chosen.name} isn't taking online orders right now.`} ${otherOpen ? `You can order from ${otherOpen.name} instead.` : "Please come back during opening hours, or drop by."}`;

  return (
    <>
      <form className="checkout" onSubmit={submit}>
        <div className="checkout-main">
          {/* The branch: one line until they want another (open by itself when this branch can't take orders) */}
          <details className="checkout-setup" open={!!windows && !open}>
            <summary>
              <span className="checkout-setup-label">Ordering from</span>
              <span className="checkout-setup-main">
                <b>{chosen.name}</b>
                <small>{availability(branch)}</small>
              </span>
              <span className="checkout-setup-change"><span className="is-open">Change</span><span className="is-shut">Done</span></span>
            </summary>
            <div className="checkout-setup-body">
              <fieldset className="slip-course">
                <legend>Branch</legend>
                <div className="order-choice">
                  {branches.map((b) => (
                    <label key={b.id} className={canOrder(b.id) ? undefined : "is-off"}>
                      <input type="radio" name="branch" checked={branch === b.id} onChange={() => (lines.length && b.id !== branch ? setSwitching(b.id) : pickBranch(b.id))} />
                      <span><b>{b.name}</b><small>{b.serves} · {availability(b.id)}</small></span>
                    </label>
                  ))}
                </div>
                {switching && (
                  <div className="checkout-switch" role="alert">
                    <p>
                      Each branch has its own menu, so switching to {branches.find((b) => b.id === switching)!.name} empties your order
                      ({count} item{count === 1 ? "" : "s"}).
                    </p>
                    <span>
                      <button type="button" className="order-link" onClick={() => pickBranch(switching)}>Switch and start over</button>
                      <button type="button" className="order-link" onClick={() => setSwitching(null)}>Keep my order</button>
                    </span>
                  </div>
                )}
              </fieldset>
            </div>
          </details>

          <MenuPicker
            menu={menu}
            disabled={!open}
            justAdded={justAdded?.id ?? null}
            onOpen={(c, i) => { setPicked({ category: c, item: i }); setSheetOpen(true); }}
            onQuickAdd={(c, i) => add(c, i, { size: firstSize(i), upsize: false, addons: [] }, 1)}
          />
          <p className="sr-only" aria-live="polite">{justAdded?.said ?? ""}</p>

          <HowStep
            how={how}
            onHow={(h) => { setMode(h); setError(null); }}
            canDeliver={delivers(branch)}
            branchName={chosen.name}
            rules={rules}
            total={total}
            hasItems={lines.length > 0}
            win={win}
            when={effectiveWhen}
            onWhen={setWhen}
            closedNote={closedNote}
            pin={pin}
            onPin={setPin}
            reach={reach}
            reachError={reachError}
            address={address}
            onAddress={setAddress}
            landmark={landmark}
            onLandmark={setLandmark}
          />
        </div>

        <aside className="checkout-slip" id="your-order" aria-labelledby="your-order-title">
          <h2 id="your-order-title">Your order</h2>
          {how === "delivery" ? (
            <p className="slip-where">Delivery from {chosen.name}<small>{address.trim() || "Set your address and pin"}</small></p>
          ) : how === "pickup" ? (
            <p className="slip-where">Pickup at {chosen.name}<small>{chosen.address}</small></p>
          ) : (
            <p className="slip-where">From {chosen.name}<small>Pickup or delivery: choose it after the menu</small></p>
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
          ) : how === "pickup" ? (
            <p className="slip-pay">Pay when you pick up: cash or GCash at the counter.</p>
          ) : null}
          <div className="slip-total"><span>{how === "delivery" ? "Items" : "Total"}</span><b>{peso(total)}</b></div>
          {error && <p className="slip-error" role="alert">{error}</p>}
          <button type="submit" className="order-submit" disabled={!open || lines.length === 0 || sending || !how || !deliveryReady}>
            {sending
              ? "Placing your order…"
              : lines.length === 0
                ? "Add an item to order"
                : !how
                  ? "Choose pickup or delivery"
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
          // On a phone: the next thing to do, pickup or delivery first, then the order slip
          <a className="checkout-bar" href={how ? "#your-order" : "#how"}>
            <span>{count} item{count === 1 ? "" : "s"} · {peso(total)}</span>
            <b>{how ? "Review order" : "Pickup or delivery"}</b>
          </a>
        )}
      </form>

      {/* Outside the form, so nothing in it can send the order */}
      <ItemSheet
        picked={picked}
        open={sheetOpen}
        addOns={menu.addOns}
        onClose={() => setSheetOpen(false)}
        onAdd={(c, i, ch, qty) => { add(c, i, ch, qty); setSheetOpen(false); }}
      />
    </>
  );
}
