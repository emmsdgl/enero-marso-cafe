"use client";

import { useMemo, useState } from "react";
import { peso, type MenuItem } from "@/data/menu";
import { SearchIcon } from "./Icons";

type Group = { id: string; title: string; items: MenuItem[] };

export default function MenuSearch({ groups }: { groups: Group[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = useMemo(
    () => groups.map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(term)) })),
    [groups, term],
  );
  const count = shown.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="full-menu">
      <label className="menu-search" id="search">
        <SearchIcon />
        <span className="sr-only">Search the menu</span>
        <input type="search" placeholder="Search drinks and food" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <p className="sr-only" aria-live="polite">{term ? `${count} items match` : ""}</p>

      {count === 0 && (
        <p className="menu-empty">
          Nothing on the menu matches “{q}”. Try another word, or <button type="button" onClick={() => setQ("")}>show everything</button>.
        </p>
      )}

      {shown.map((g) =>
        g.items.length ? (
          <section key={g.id} id={g.id} className="menu-list" aria-labelledby={`${g.id}-list`}>
            <h2 id={`${g.id}-list`}>{g.title}</h2>
            <ul>
              {g.items.map((i) => (
                <li key={i.name}>
                  <span>{i.name}</span>
                  <span className="dots" aria-hidden="true" />
                  <span className="price">{peso(i.price)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
