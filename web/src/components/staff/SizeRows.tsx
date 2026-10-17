"use client";

import { useRef, useState } from "react";
import { andList, hasPrice, MAX_SIZES, reshapePrices, SIZE_NAME_MAX, type SizeRow } from "@/lib/menu-rules";

type Row = SizeRow & { key: string };

/**
 * A menu group's cup sizes, edited in place: rename, reorder, remove, add. They're sent as one
 * field; on save the server moves every item's prices to match. Before that, it warns which
 * prices a removal deletes and which items would be left with no price at all.
 */
export default function SizeRows({ initial, items }: { initial: string[] | null; items: { name: string; prices: (number | null)[] }[] }) {
  const [rows, setRows] = useState<Row[]>(() => (initial ?? []).map((name, from) => ({ name, from, key: `s${from}` })));
  const [draft, setDraft] = useState("");
  const made = useRef(0);

  const swap = (i: number, j: number) =>
    setRows((r) => {
      const next = [...r];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = () => {
    const name = draft.trim();
    if (!name || rows.length >= MAX_SIZES) return;
    // In a group with one price per item, that price becomes the first size's price
    setRows((r) => [...r, { name, from: !initial && r.length === 0 ? 0 : null, key: `n${made.current++}` }]);
    setDraft("");
  };

  const removed = (initial ?? []).filter((_, i) => !rows.some((r) => r.from === i));
  const priced = removed.filter((size) => items.some((it) => it.prices[(initial ?? []).indexOf(size)] != null));
  const stranded = rows.length ? items.filter((it) => hasPrice(it.prices) && !hasPrice(reshapePrices(it.prices, rows))).map((it) => it.name) : [];

  return (
    <fieldset className="size-rows">
      <legend>Sizes</legend>
      {rows.length === 0 ? (
        <p className="staff-help">One price per item. Add sizes for drinks sold in more than one cup.</p>
      ) : (
        <ol>
          {rows.map((r, i) => (
            <li key={r.key}>
              <input
                aria-label={`Size ${i + 1}`}
                value={r.name}
                maxLength={SIZE_NAME_MAX}
                onChange={(e) => setRows((rs) => rs.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              {r.from === null && initial && <small>new</small>}
              <span className="size-do">
                <button type="button" className="staff-btn is-small is-quiet size-arrow" onClick={() => swap(i, i - 1)} disabled={i === 0} aria-label={`Move ${r.name} up`}><Arrow /></button>
                <button type="button" className="staff-btn is-small is-quiet size-arrow is-down" onClick={() => swap(i, i + 1)} disabled={i === rows.length - 1} aria-label={`Move ${r.name} down`}><Arrow /></button>
                <button type="button" className="staff-btn is-small is-quiet" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label={`Remove ${r.name}`}>Remove</button>
              </span>
            </li>
          ))}
        </ol>
      )}
      {rows.length < MAX_SIZES && (
        <div className="size-add">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            maxLength={SIZE_NAME_MAX}
            placeholder={rows.length ? "Another size, e.g. 22 oz" : "A size, e.g. Medium"}
            aria-label="New size"
          />
          <button type="button" className="staff-btn is-small" onClick={add} disabled={!draft.trim()}>Add size</button>
        </div>
      )}
      {priced.length > 0 && (
        <p className="staff-note is-warn">
          Removing {andList(priced)} deletes {priced.length === 1 ? "its" : "their"} prices from every item in this group.
        </p>
      )}
      {stranded.length > 0 && (
        <p className="staff-note is-warn">
          {andList(stranded)} would have no price left, so customers won&rsquo;t see {stranded.length === 1 ? "it" : "them"} until you add one.
        </p>
      )}
      {!initial && rows[0]?.from === 0 && items.length > 0 && <p className="staff-help">Today&rsquo;s prices become the {rows[0].name.trim() || "first size"} price.</p>}
      <input type="hidden" name="sizes" value={JSON.stringify(rows.map(({ name, from }) => ({ name: name.trim(), from })))} />
      <input type="hidden" name="was" value={JSON.stringify(initial)} />
    </fieldset>
  );
}

const Arrow = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
    <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
