"use client";

import { useEffect, useMemo, useState } from "react";
import { branches } from "@/data/branches";
import { menus, peso, type Category } from "@/data/menu";
import { SearchIcon } from "./Icons";

type BranchId = "main" | "noir";

/** The label's working courses: branch switch, search, the categories, then add-ons */
export default function MenuBoard() {
  const [branch, setBranch] = useState<BranchId>("main");
  const [q, setQ] = useState("");

  // /menu#noir opens Cafe Noir's menu
  useEffect(() => {
    const fromHash = () => setBranch(location.hash === "#noir" ? "noir" : "main");
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, []);

  const menu = menus[branch];
  const info = branches.find((b) => b.id === branch)!;
  const term = q.trim().toLowerCase();
  const shown = useMemo<Category[]>(
    () =>
      menu.categories
        .map((c) => ({
          ...c,
          items: term
            ? c.items.filter((i) => `${i.name} ${i.note ?? ""} ${c.title}`.toLowerCase().includes(term))
            : c.items,
        }))
        .filter((c) => c.items.length),
    [menu, term],
  );
  const count = shown.reduce((n, c) => n + c.items.length, 0);
  const hasStars = menu.categories.some((c) => c.items.some((i) => i.star));

  const pick = (id: BranchId) => {
    setBranch(id);
    history.replaceState(null, "", id === "noir" ? "#noir" : location.pathname);
  };

  return (
    <>
      <div className="ml-course ml-branches" role="tablist" aria-label="Choose a branch">
        {branches.map((b) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            id={`tab-${b.id}`}
            aria-selected={branch === b.id}
            aria-controls="menu-panel"
            className="ml-branch"
            onClick={() => pick(b.id)}
          >
            <b>{b.name}</b>
            <small>{b.id === "noir" ? "Coffee cart · drinks only" : "The cafe · drinks and food"}</small>
          </button>
        ))}
      </div>

      <label className="ml-course ml-search" id="search">
        <SearchIcon />
        <span className="sr-only">Search the {info.name} menu</span>
        <input type="search" placeholder={`Search the ${branch === "noir" ? "Noir" : "cafe"} menu`} value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <p className="sr-only" aria-live="polite">{term ? `${count} items match` : ""}</p>

      <div id="menu-panel" role="tabpanel" aria-labelledby={`tab-${branch}`} className="ml-course ml-board">
        {count === 0 ? (
          <p className="ml-empty">
            Nothing on this menu matches “{q}”. Try another word, or{" "}
            <button type="button" onClick={() => setQ("")}>show everything</button>.
          </p>
        ) : (
          shown.map((c) => <MenuCategory key={c.id} category={c} />)
        )}
      </div>

      <div className="ml-course ml-extras">
        <section aria-labelledby="addons">
          <h2 id="addons">Add-ons</h2>
          <ul>
            {menu.addOns.map((a) => (
              <li key={a.name}><span>{a.name}</span><span>+{peso(a.price)}</span></li>
            ))}
          </ul>
        </section>
        <div className="ml-notes">
          {menu.notes.map((n) => <p key={n}>{n}</p>)}
          {hasStars && <p><span className="ml-star" aria-hidden="true">★</span> Recommended on the Noir menu.</p>}
          <p>Prices in Philippine pesos. Menu and prices may change.</p>
        </div>
      </div>
    </>
  );
}

function MenuCategory({ category: c }: { category: Category }) {
  const id = `cat-${c.id}`;
  return (
    <section className={`ml-cat${c.sizes ? " is-sized" : ""}`} aria-labelledby={id}>
      <header className="ml-cat-head">
        <h2 id={id}>{c.title}</h2>
        {c.note && <p>{c.note}</p>}
      </header>
      <table className="ml-table">
        {c.sizes && (
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Item</span></th>
              {c.sizes.map((s) => <th key={s} scope="col">{s}</th>)}
            </tr>
          </thead>
        )}
        <tbody>
          {c.items.map((i) => (
            <tr key={i.name}>
              <th scope="row">
                <span className="ml-name">
                  {i.name}
                  {i.star && <span className="ml-star" aria-label="Recommended"> ★</span>}
                </span>
                {i.note && <small>{i.note}</small>}
              </th>
              {i.prices.map((p, n) => (
                <td key={n}>{p === null ? <span aria-label="Not available">–</span> : peso(p)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
