"use client";

import { useState, type ReactNode } from "react";

type Filter = { id: string; label: string; count: number };
type Person = { id: string; text: string; tags: string[] };

/**
 * Search box and filter chips over a server-rendered list. Each row carries data-person-id;
 * rows that don't match are hidden with a generated rule, so the rows themselves stay server components.
 */
export default function TeamFilter({ people, filters, children }: { people: Person[]; filters: Filter[]; children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hidden = people.filter((p) => !((filter === "all" || p.tags.includes(filter)) && words.every((w) => p.text.includes(w))));
  const shown = people.length - hidden.length;
  const reset = () => { setQuery(""); setFilter("all"); };

  return (
    <div className="team-filter">
      <div className="team-filter-bar">
        <label className="team-search">
          <span className="sr-only">Search the team</span>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><circle cx="7" cy="7" r="4.75" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="m10.6 10.6 3.4 3.4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          <input type="search" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        </label>
        <fieldset className="team-chips">
          <legend className="sr-only">Show</legend>
          {filters.map((f) => (
            <label key={f.id} className="team-chip">
              <input type="radio" name="team-filter" className="sr-only" checked={filter === f.id} onChange={() => setFilter(f.id)} />
              {f.label}
              <span>{f.count}</span>
            </label>
          ))}
        </fieldset>
      </div>
      {hidden.length > 0 && <style>{`${hidden.map((p) => `[data-person-id="${p.id}"]`).join(",")}{display:none}`}</style>}
      <p className="team-shown" aria-live="polite">{shown < people.length && shown > 0 ? `Showing ${shown} of ${people.length}` : ""}</p>
      {children}
      {shown === 0 && (
        <p className="team-empty">
          No one matches{query ? ` “${query}”` : ""}.{" "}
          <button type="button" onClick={reset}>Show everyone</button>
        </p>
      )}
    </div>
  );
}
