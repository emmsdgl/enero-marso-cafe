"use client";

import { useMemo, useState } from "react";
import { InfoIcon, SearchIcon } from "@/components/Icons";
import { peso, searchMenu, type BranchMenu, type MenuCategory, type MenuItem } from "@/lib/menu";

/**
 * The menu at checkout: a search box, the group chips, and one line per item. Items with sizes or
 * extras open their sheet with +; the rest are added in one tap. (i) opens the sheet to read about it.
 */
export default function MenuPicker({
  menu,
  disabled,
  justAdded,
  onOpen,
  onQuickAdd,
}: {
  menu: BranchMenu;
  disabled: boolean;
  /** The item just added, to say so on its button for a moment */
  justAdded: string | null;
  onOpen: (c: MenuCategory, i: MenuItem) => void;
  onQuickAdd: (c: MenuCategory, i: MenuItem) => void;
}) {
  const [catId, setCatId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const results = useMemo(() => searchMenu(menu.categories, q), [menu, q]);
  const searching = q.trim().length > 0;
  const found = results.reduce((n, c) => n + c.items.length, 0);
  const cat = menu.categories.find((c) => c.id === catId) ?? menu.categories[0];
  const groups = searching ? results : cat ? [cat] : [];
  const extrasOn = menu.addOns.some((a) => a.available);

  return (
    <fieldset className="slip-course" disabled={disabled}>
      <legend>Menu</legend>
      <label className="order-search">
        <SearchIcon />
        <span className="sr-only">Search the menu</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          // Enter would send the whole order form
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          placeholder="Search, e.g. latte or fries"
          enterKeyHint="search"
        />
      </label>
      <p className="sr-only" aria-live="polite">{searching ? `${found} item${found === 1 ? "" : "s"} match` : ""}</p>

      {!searching && (
        <>
          <div className="order-cats" role="group" aria-label="Menu section">
            {menu.categories.map((c) => (
              <button key={c.id} type="button" aria-pressed={c.id === cat?.id} onClick={() => setCatId(c.id)}>{c.title}</button>
            ))}
          </div>
          {cat?.note && <p className="order-hint">{cat.note}</p>}
        </>
      )}

      {searching && found === 0 ? (
        <p className="order-empty">
          Nothing on the menu matches &ldquo;{q.trim()}&rdquo;. Try another word, or{" "}
          <button type="button" onClick={() => setQ("")}>show everything</button>.
        </p>
      ) : (
        groups.map((c) => (
          <div key={c.id} className="order-group">
            {searching && <h3 className="order-group-title">{c.title}</h3>}
            <ul className="menu-picks">
              {c.items.map((i) => (
                <PickRow
                  key={i.id}
                  c={c}
                  i={i}
                  hasChoices={Boolean(c.sizes) || c.upsizePrice != null || (c.kind === "drink" && extrasOn)}
                  added={justAdded === i.id}
                  onOpen={onOpen}
                  onQuickAdd={onQuickAdd}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </fieldset>
  );
}

function PickRow({ c, i, hasChoices, added, onOpen, onQuickAdd }: {
  c: MenuCategory; i: MenuItem; hasChoices: boolean; added: boolean;
  onOpen: (c: MenuCategory, i: MenuItem) => void; onQuickAdd: (c: MenuCategory, i: MenuItem) => void;
}) {
  const prices = i.prices.filter((p): p is number => p !== null);
  return (
    <li className={`menu-pick${i.available ? "" : " is-sold-out"}`}>
      <div className="menu-pick-row">
        <span className="menu-pick-name">
          <span className="menu-pick-title">
            <b>{i.name}</b>
            {i.description && (
              <button type="button" className="menu-pick-info" onClick={() => onOpen(c, i)} aria-label={`About ${i.name}`}>
                <InfoIcon />
              </button>
            )}
          </span>
          {!i.available ? <small className="menu-pick-sold">Sold out</small> : i.note && <small>{i.note}</small>}
        </span>
        <span className="menu-pick-price">{prices.length > 1 ? `from ${peso(Math.min(...prices))}` : peso(prices[0] ?? 0)}</span>
        {i.available &&
          (hasChoices ? (
            <button type="button" className={`menu-pick-toggle${added ? " is-added" : ""}`} onClick={() => onOpen(c, i)} aria-label={`Choose ${i.name}`}>
              {added ? <Check /> : <Plus />}
            </button>
          ) : (
            <button type="button" className={`pick-add${added ? " is-added" : ""}`} onClick={() => onQuickAdd(c, i)} aria-label={`Add ${i.name}`}>
              {added ? "Added" : "Add"}
            </button>
          ))}
      </div>
    </li>
  );
}

const Plus = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
