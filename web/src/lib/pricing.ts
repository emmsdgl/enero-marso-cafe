import type { BranchMenu } from "./menu";

/** What the browser sends: which item, which size, extras and how many. Never a price. */
export type CartLine = { itemId: string; size: number; upsize: boolean; addons: string[]; qty: number };

export type PricedLine = {
  itemId: string;
  name: string;
  size: string | null;
  upsized: boolean;
  addons: { name: string; price: number }[];
  unitPrice: number;
  qty: number;
  lineTotal: number;
};

export const MAX_LINES = 30;
export const MAX_QTY = 20;
export const MAX_ITEMS = 60;

/**
 * Prices an order from the branch's current menu. Every peso comes from the menu here on the
 * server; anything the menu doesn't offer right now (sold out, wrong size, other branch) is refused.
 */
export function priceCart(menu: BranchMenu, lines: CartLine[]): { ok: true; lines: PricedLine[]; subtotal: number } | { ok: false; error: string } {
  if (!Array.isArray(lines) || lines.length === 0) return { ok: false, error: "Add at least one item." };
  if (lines.length > MAX_LINES) return { ok: false, error: `That's a big order! Please keep it to ${MAX_LINES} different items, or call us.` };
  if (lines.reduce((n, l) => n + (Number(l?.qty) || 0), 0) > MAX_ITEMS) return { ok: false, error: `For more than ${MAX_ITEMS} items, please call us or book catering.` };

  const priced: PricedLine[] = [];
  for (const l of lines) {
    const category = menu.categories.find((c) => c.items.some((i) => i.id === l?.itemId));
    const item = category?.items.find((i) => i.id === l.itemId);
    if (!category || !item) return { ok: false, error: "Something in your order is no longer on this branch's menu. Please check it again." };
    if (!item.available) return { ok: false, error: `Sorry, ${item.name} just sold out. Please remove it to continue.` };
    if (!Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY) return { ok: false, error: `Choose 1 to ${MAX_QTY} of ${item.name}.` };

    const slots = category.sizes?.length ?? 1;
    const price = Number.isInteger(l.size) && l.size >= 0 && l.size < slots ? item.prices[l.size] : null;
    if (price == null) return { ok: false, error: `Choose a size for ${item.name}.` };

    if (l.upsize && category.upsizePrice == null) return { ok: false, error: `${item.name} can't be upsized.` };
    const ids = Array.isArray(l.addons) ? l.addons : [];
    if (new Set(ids).size !== ids.length) return { ok: false, error: `An add-on is listed twice for ${item.name}.` };
    if (ids.length > 0 && category.kind !== "drink") return { ok: false, error: `Add-ons are for drinks only.` };
    const addons = ids.map((id) => menu.addOns.find((a) => a.id === id));
    if (addons.some((a) => !a)) return { ok: false, error: "An add-on in your order is no longer offered." };
    const off = addons.find((a) => !a!.available);
    if (off) return { ok: false, error: `Sorry, ${off.name} just ran out. Please remove it to continue.` };

    const unitPrice = price + (l.upsize ? category.upsizePrice! : 0) + addons.reduce((n, a) => n + a!.price, 0);
    priced.push({
      itemId: item.id,
      name: item.name,
      size: category.sizes ? category.sizes[l.size] : null,
      upsized: Boolean(l.upsize),
      addons: addons.map((a) => ({ name: a!.name, price: a!.price })),
      unitPrice,
      qty: l.qty,
      lineTotal: unitPrice * l.qty,
    });
  }
  return { ok: true, lines: priced, subtotal: priced.reduce((n, l) => n + l.lineTotal, 0) };
}

/** "09171234567" → "0917 123 4567", for reading out over the phone */
export const formatPhone = (p: string) => (/^09\d{9}$/.test(p) ? `${p.slice(0, 4)} ${p.slice(4, 7)} ${p.slice(7)}` : p);

/** Philippine mobile numbers in any common format → "09XXXXXXXXX", or null */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s\-().]/g, "");
  const m = /^(?:\+?63|0)?(9\d{9})$/.exec(digits);
  return m ? `0${m[1]}` : null;
}
