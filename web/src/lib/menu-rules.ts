/**
 * Rules for editing the menu (staff Menu page), safe to use on both server and client.
 * A group's prices line up with its sizes: prices[i] is the price in sizes[i]. A group without
 * sizes has one price per item, at prices[0]. Changing sizes moves every item's prices with them.
 */
import type { Menus } from "./menu";

export const MAX_SIZES = 4;
export const SIZE_NAME_MAX = 20;

/**
 * One size in a group being edited: its name, and which of the group's old sizes it keeps the
 * prices of (null = a new size, not priced yet). A size left out of the list is removed.
 */
export type SizeRow = { name: string; from: number | null };

type SizeCheck = { ok: true; rows: SizeRow[]; sizes: string[] | null; changed: boolean } | { ok: false; error: string };

/**
 * Checks a group's new sizes against its old ones (null = one price per item, kept at index 0).
 * Returns the sizes to save and whether any item's prices have to move.
 */
export function checkSizes(old: string[] | null, input: unknown): SizeCheck {
  if (!Array.isArray(input)) return { ok: false, error: "The sizes didn't come through. Please try again." };
  const slots = old?.length ?? 1;
  const rows: SizeRow[] = [];
  for (const r of input) {
    const name = String(r?.name ?? "").trim().replace(/\s+/g, " ");
    const from = r?.from === null || r?.from === undefined ? null : Number(r.from);
    if (!name) return { ok: false, error: "Give every size a name, like Medium or 16 oz." };
    if (name.length > SIZE_NAME_MAX) return { ok: false, error: `Keep size names under ${SIZE_NAME_MAX} characters.` };
    if (from !== null && !(Number.isInteger(from) && from >= 0 && from < slots)) return { ok: false, error: "The sizes didn't come through. Please try again." };
    rows.push({ name, from });
  }
  if (rows.length > MAX_SIZES) return { ok: false, error: `A group can have up to ${MAX_SIZES} sizes.` };
  if (old && rows.length === 0) return { ok: false, error: "Keep at least one size. To sell one size only, keep that one." };
  const names = rows.map((r) => r.name.toLowerCase());
  if (new Set(names).size !== names.length) return { ok: false, error: "Two sizes have the same name." };
  const froms = rows.flatMap((r) => (r.from === null ? [] : [r.from]));
  if (new Set(froms).size !== froms.length) return { ok: false, error: "The sizes didn't come through. Please try again." };

  const sizes = rows.length ? rows.map((r) => r.name) : null;
  // Prices only move when sizes are added, removed or reordered; a rename leaves them alone
  const changed = rows.length > 0 && !(old && rows.length === old.length && rows.every((r, i) => r.from === i));
  return { ok: true, rows, sizes, changed };
}

/** An item's prices after its group's sizes change */
export function reshapePrices(prices: (number | null)[], rows: SizeRow[]): (number | null)[] {
  if (rows.length === 0) return prices;
  return rows.map((r) => (r.from === null ? null : (prices[r.from] ?? null)));
}

export const hasPrice = (prices: (number | null)[]) => prices.some((p) => p !== null);

/** What customers see: items still waiting for a price, and groups with nothing in them, are left out */
export function forCustomers(menus: Menus): Menus {
  const trim = (m: Menus[keyof Menus]) => ({
    ...m,
    categories: m.categories.map((c) => ({ ...c, items: c.items.filter((i) => hasPrice(i.prices)) })).filter((c) => c.items.length > 0),
  });
  return { main: trim(menus.main), noir: trim(menus.noir) };
}

/** A web-address name for a new group ("Gelato Affogato" → "gelato-affogato"), unique in its branch */
export function slugFor(title: string, taken: string[]): string {
  const base =
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/, "") || "group";
  let slug = base;
  for (let n = 2; taken.includes(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** The list with one entry moved up or down a place, or null when it's already at that end */
export function moved(ids: string[], id: string, dir: "up" | "down"): string[] | null {
  const at = ids.indexOf(id);
  const to = dir === "up" ? at - 1 : at + 1;
  if (at < 0 || to < 0 || to >= ids.length) return null;
  const next = [...ids];
  [next[at], next[to]] = [next[to], next[at]];
  return next;
}

export const sameSizes = (a: string[] | null, b: string[] | null) => (a ?? []).join("\n") === (b ?? []).join("\n");

/** "Tall", "Tall and Medium", "Tall, Medium and Large" */
export const andList = (names: string[]) => (names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
