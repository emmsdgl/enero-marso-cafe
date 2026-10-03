"use client";

import { useMemo, useState } from "react";
import { peso, type MenuItem } from "@/data/menu";
import BrandArt from "./BrandArt";
import { SearchIcon } from "./Icons";

type Group = { id: string; title: string; art: "cup" | "cutlery"; items: MenuItem[] };

/** The searchable courses of the menu label: search row, then one column per category */
export default function MenuSearch({ groups }: { groups: Group[] }) {
  const [q, setQ] = useState("");
  const term = q.trim().toLowerCase();
  const shown = useMemo(
    () => groups.map((g) => ({ ...g, items: g.items.filter((i) => i.name.toLowerCase().includes(term)) })),
    [groups, term],
  );
  const count = shown.reduce((n, g) => n + g.items.length, 0);

  return (
    <>
      <label className="ml-course ml-search" id="search">
        <SearchIcon />
        <span className="sr-only">Search the menu</span>
        <input type="search" placeholder="Search drinks and food" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <p className="sr-only" aria-live="polite">{term ? `${count} items match` : ""}</p>

      <div className="ml-course ml-columns">
        {count === 0 ? (
          <p className="ml-empty">
            Nothing on the menu matches “{q}”. Try another word, or{" "}
            <button type="button" onClick={() => setQ("")}>show everything</button>.
          </p>
        ) : (
          shown.map((g) =>
            g.items.length ? (
              <section key={g.id} id={g.id} className="ml-column" aria-labelledby={`${g.id}-list`}>
                <h2 id={`${g.id}-list`}>
                  {g.title}
                  <BrandArt kind={g.art} className="ml-column-art" />
                </h2>
                <ul>
                  {g.items.map((i) => (
                    <li key={i.name}>
                      <span className="ml-name">{i.name}</span>
                      <span className="ml-price">{peso(i.price)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null,
          )
        )}
      </div>
    </>
  );
}
