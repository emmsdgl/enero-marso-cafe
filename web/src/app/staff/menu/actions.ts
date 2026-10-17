"use server";

import { and, asc, eq, max, notExists } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { branches, db, menuAddons, menuCategories, menuItems } from "@/db";
import { isBranchId } from "@/lib/menu";
import { andList, checkSizes, hasPrice, moved, reshapePrices, sameSizes, slugFor } from "@/lib/menu-rules";
import { MENU_TAG } from "@/lib/menu-store";
import { audit, canActOnBranch, requireStaff } from "@/lib/staff";
import type { ActionState } from "../actions";

const s = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const NOT_YOURS = { error: "You can only change your own branch's menu." };
const SIZES_CHANGED = { error: "Someone changed this group's sizes while you were editing. Close this and open it again." };
const EDITORS = ["admin", "manager"] as const;

/** The website shows the change on the next visit; the staff page refreshes now */
function menuChanged() {
  updateTag(MENU_TAG);
  revalidatePath("/staff/menu");
}

/** "" = not offered in that size; otherwise a whole number of pesos */
function readPrice(v: string): number | null | "bad" {
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 && n <= 100_000 ? n : "bad";
}

/** The sizes a form was drawn with, so prices typed in it still line up with the right sizes */
function drawnWith(form: FormData): string[] | null | "bad" {
  try {
    const v = JSON.parse(s(form.get("was")) || "null");
    return v === null || (Array.isArray(v) && v.every((x) => typeof x === "string")) ? v : "bad";
  } catch {
    return "bad";
  }
}

async function itemWithBranch(itemId: string) {
  const [row] = await db
    .select({ item: menuItems, branchId: menuCategories.branchId, sizes: menuCategories.sizes })
    .from(menuItems)
    .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(eq(menuItems.id, itemId))
    .limit(1);
  return row;
}

async function groupById(id: string) {
  if (!id) return undefined;
  const [g] = await db.select().from(menuCategories).where(eq(menuCategories.id, id)).limit(1);
  return g;
}

// ——— Sold out / back in stock: anyone working at the branch ———
export async function setItemAvailable(itemId: string, available: boolean): Promise<ActionState> {
  const me = await requireStaff();
  const row = await itemWithBranch(itemId);
  if (!row) return { error: "That item is no longer on the menu." };
  if (!canActOnBranch(me, row.branchId)) return NOT_YOURS;
  await db.update(menuItems).set({ available, updatedAt: new Date(), updatedBy: me.id }).where(eq(menuItems.id, itemId));
  await audit(me.id, available ? "menu.back-in-stock" : "menu.sold-out", { itemId, name: row.item.name, branchId: row.branchId });
  menuChanged();
  return { ok: available ? `${row.item.name} is back on the menu.` : `${row.item.name} is marked sold out.` };
}

export async function setAddonAvailable(addonId: string, available: boolean): Promise<ActionState> {
  const me = await requireStaff();
  const [addon] = await db.select().from(menuAddons).where(eq(menuAddons.id, addonId)).limit(1);
  if (!addon) return { error: "That add-on is no longer on the menu." };
  if (!canActOnBranch(me, addon.branchId)) return NOT_YOURS;
  await db.update(menuAddons).set({ available }).where(eq(menuAddons.id, addonId));
  await audit(me.id, available ? "menu.back-in-stock" : "menu.sold-out", { addonId, name: addon.name, branchId: addon.branchId });
  menuChanged();
  return { ok: available ? `${addon.name} is back on the menu.` : `${addon.name} is marked sold out.` };
}

// ——— Groups (Caffeinated, Signature…): managers (their branch) and the admin ———

/**
 * Adds a group, or changes one: name, note, drinks or food, upsize price and sizes.
 * When sizes are removed, added or reordered, every item's prices move with them in the same save.
 */
export async function saveGroup(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff([...EDITORS]);
  const title = s(form.get("title")).replace(/\s+/g, " ");
  const note = s(form.get("note")) || null;
  const kind = s(form.get("kind"));
  const upsize = readPrice(s(form.get("upsize")));
  if (!title || title.length > 40) return { error: "Give the group a name (up to 40 characters)." };
  if (note && note.length > 80) return { error: "Keep the note under 80 characters." };
  if (kind !== "drink" && kind !== "food") return { error: "Choose drinks or food." };
  if (upsize === "bad" || (upsize !== null && upsize > 500)) return { error: "The upsize price is whole pesos, like 15." };
  let input: unknown;
  try {
    input = JSON.parse(s(form.get("sizes")) || "[]");
  } catch {
    input = null;
  }

  const id = s(form.get("id"));
  if (!id) {
    const branch = s(form.get("branch"));
    if (!isBranchId(branch) || !canActOnBranch(me, branch)) return NOT_YOURS;
    // A new group has nothing to carry prices over from
    const sizes = checkSizes(null, Array.isArray(input) ? input.map((r) => ({ name: r?.name, from: null })) : input);
    if (!sizes.ok) return { error: sizes.error };
    const groups = await db.select({ slug: menuCategories.slug, sort: menuCategories.sort }).from(menuCategories).where(eq(menuCategories.branchId, branch));
    const [g] = await db
      .insert(menuCategories)
      .values({ branchId: branch, slug: slugFor(title, groups.map((x) => x.slug)), title, note, kind, sizes: sizes.sizes, upsizePrice: upsize, sort: Math.max(0, ...groups.map((x) => x.sort)) + 1 })
      .returning({ id: menuCategories.id });
    await audit(me.id, "menu.group-add", { groupId: g.id, branchId: branch, title, kind, sizes: sizes.sizes });
    menuChanged();
    return { ok: `Added ${title}. Add its items next.` };
  }

  const g = await groupById(id);
  if (!g) return { error: "That group is no longer on the menu." };
  if (!canActOnBranch(me, g.branchId)) return NOT_YOURS;
  const was = drawnWith(form);
  if (was === "bad" || !sameSizes(was, g.sizes)) return SIZES_CHANGED;
  const sizes = checkSizes(g.sizes, input);
  if (!sizes.ok) return { error: sizes.error };

  const items = sizes.changed ? await db.select({ id: menuItems.id, name: menuItems.name, prices: menuItems.prices }).from(menuItems).where(eq(menuItems.categoryId, g.id)) : [];
  const moving = items.map((i) => ({ ...i, next: reshapePrices(i.prices, sizes.rows) }));
  const next = { title, note, kind, upsizePrice: upsize, sizes: sizes.sizes } as const;
  await db.batch([
    db.update(menuCategories).set(next).where(eq(menuCategories.id, g.id)),
    ...moving.map((i) => db.update(menuItems).set({ prices: i.next, updatedAt: new Date(), updatedBy: me.id }).where(eq(menuItems.id, i.id))),
  ]);
  const unpriced = moving.filter((i) => hasPrice(i.prices) && !hasPrice(i.next)).map((i) => i.name);
  await audit(me.id, "menu.group-edit", {
    groupId: g.id,
    branchId: g.branchId,
    before: { title: g.title, note: g.note, kind: g.kind, upsizePrice: g.upsizePrice, sizes: g.sizes },
    after: next,
    ...(moving.length ? { pricesMoved: moving.length } : {}),
    ...(unpriced.length ? { unpriced } : {}),
  });
  menuChanged();
  if (!unpriced.length) return { ok: `Saved ${title}.` };
  const one = unpriced.length === 1;
  return { ok: `Saved ${title}. ${andList(unpriced)} ${one ? "needs a price" : "need prices"} before customers see ${one ? "it" : "them"}.` };
}

export async function moveGroup(id: string, dir: "up" | "down"): Promise<ActionState> {
  const me = await requireStaff([...EDITORS]);
  const g = await groupById(id);
  if (!g) return { error: "That group is no longer on the menu." };
  if (!canActOnBranch(me, g.branchId)) return NOT_YOURS;
  const groups = await db.select({ id: menuCategories.id }).from(menuCategories).where(eq(menuCategories.branchId, g.branchId)).orderBy(asc(menuCategories.sort));
  const order = moved(groups.map((x) => x.id), id, dir);
  if (!order) return { ok: "It's already there." };
  const [first, ...rest] = order.map((gid, i) => db.update(menuCategories).set({ sort: i + 1 }).where(eq(menuCategories.id, gid)));
  await db.batch([first, ...rest]);
  await audit(me.id, "menu.group-move", { groupId: g.id, branchId: g.branchId, title: g.title, dir });
  menuChanged();
  return { ok: `Moved ${g.title} ${dir}.` };
}

/** Only an empty group can go: deleting a group would delete its items with it */
export async function deleteGroup(id: string): Promise<ActionState> {
  const me = await requireStaff([...EDITORS]);
  const g = await groupById(id);
  if (!g) return { error: "That group is no longer on the menu." };
  if (!canActOnBranch(me, g.branchId)) return NOT_YOURS;
  const gone = await db
    .delete(menuCategories)
    .where(and(eq(menuCategories.id, g.id), notExists(db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.categoryId, g.id)))))
    .returning({ id: menuCategories.id });
  if (!gone.length) return { error: `Move or delete the items in ${g.title} first.` };
  await audit(me.id, "menu.group-delete", { groupId: g.id, branchId: g.branchId, title: g.title });
  menuChanged();
  return { ok: `Deleted ${g.title}.` };
}

// ——— Items: managers (their branch) and the admin ———

/**
 * Adds an item to a group, or changes one (name, note, description, prices, ★, and which group it's in).
 * Moving to a group with other sizes clears its prices, so it waits off the website until they're added there.
 */
export async function saveMenuItem(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff([...EDITORS]);
  const name = s(form.get("name")).replace(/\s+/g, " ");
  const note = s(form.get("note")) || null;
  const description = s(form.get("description")).replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n") || null;
  const star = form.get("star") === "on";
  if (!name || name.length > 60) return { error: "Give the item a name (up to 60 characters)." };
  if (note && note.length > 80) return { error: "Keep the note under 80 characters." };
  if (description && description.length > 300) return { error: "Keep the description under 300 characters." };

  const group = await groupById(s(form.get("group")));
  if (!group) return { error: "That group is no longer on the menu." };
  if (!canActOnBranch(me, group.branchId)) return NOT_YOURS;

  const id = s(form.get("id"));
  const row = id ? await itemWithBranch(id) : undefined;
  if (id && !row) return { error: "That item is no longer on the menu." };
  if (row && row.branchId !== group.branchId) return { error: "Items can only move to a group in the same branch." };

  // The price boxes belong to the sizes the form was drawn with: the item's own group
  const drawn = row ? row.sizes : group.sizes;
  const was = drawnWith(form);
  if (was === "bad" || !sameSizes(was, drawn)) return SIZES_CHANGED;
  const prices = Array.from({ length: drawn?.length ?? 1 }, (_, i) => readPrice(s(form.get(`price-${i}`))));
  if (prices.includes("bad")) return { error: "Prices are whole pesos, like 120." };
  if (!hasPrice(prices as (number | null)[])) return { error: "Give the item at least one price." };

  const lastIn = async (groupId: string) => (await db.select({ n: max(menuItems.sort) }).from(menuItems).where(eq(menuItems.categoryId, groupId)))[0]?.n ?? 0;

  if (!row) {
    const [added] = await db
      .insert(menuItems)
      .values({ categoryId: group.id, name, note, description, prices: prices as (number | null)[], star, sort: (await lastIn(group.id)) + 1, updatedBy: me.id })
      .returning({ id: menuItems.id });
    await audit(me.id, "menu.item-add", { itemId: added.id, branchId: group.branchId, group: group.title, name, prices });
    menuChanged();
    return { ok: `Added ${name} to ${group.title}.` };
  }

  const moving = group.id !== row.item.categoryId;
  const keepPrices = !moving || sameSizes(row.sizes, group.sizes);
  const next = {
    name,
    note,
    description,
    star,
    prices: keepPrices ? (prices as (number | null)[]) : Array<number | null>(group.sizes?.length ?? 1).fill(null),
    ...(moving ? { categoryId: group.id, sort: (await lastIn(group.id)) + 1 } : {}),
  };
  await db.update(menuItems).set({ ...next, updatedAt: new Date(), updatedBy: me.id }).where(eq(menuItems.id, row.item.id));
  await audit(me.id, "menu.edit", {
    itemId: row.item.id,
    branchId: row.branchId,
    before: { name: row.item.name, note: row.item.note, description: row.item.description, prices: row.item.prices, star: row.item.star, ...(moving ? { group: row.item.categoryId } : {}) },
    after: { name, note, description, prices: next.prices, star, ...(moving ? { group: group.id } : {}) },
  });
  menuChanged();
  if (moving && !keepPrices) return { ok: `Moved ${name} to ${group.title}. Add its prices there; customers won't see it until you do.` };
  return { ok: moving ? `Moved ${name} to ${group.title}.` : `Saved ${name}.` };
}

export async function moveItem(id: string, dir: "up" | "down"): Promise<ActionState> {
  const me = await requireStaff([...EDITORS]);
  const row = await itemWithBranch(id);
  if (!row) return { error: "That item is no longer on the menu." };
  if (!canActOnBranch(me, row.branchId)) return NOT_YOURS;
  const items = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.categoryId, row.item.categoryId)).orderBy(asc(menuItems.sort));
  const order = moved(items.map((x) => x.id), id, dir);
  if (!order) return { ok: "It's already there." };
  const [first, ...rest] = order.map((iid, i) => db.update(menuItems).set({ sort: i + 1 }).where(eq(menuItems.id, iid)));
  await db.batch([first, ...rest]);
  await audit(me.id, "menu.item-move", { itemId: id, branchId: row.branchId, name: row.item.name, dir });
  menuChanged();
  return { ok: `Moved ${row.item.name} ${dir}.` };
}

/** Removes an item for good. Past orders keep their own copy of its name and price. */
export async function deleteItem(id: string): Promise<ActionState> {
  const me = await requireStaff([...EDITORS]);
  const row = await itemWithBranch(id);
  if (!row) return { error: "That item is no longer on the menu." };
  if (!canActOnBranch(me, row.branchId)) return NOT_YOURS;
  await db.delete(menuItems).where(eq(menuItems.id, id));
  await audit(me.id, "menu.item-delete", { itemId: id, branchId: row.branchId, name: row.item.name, note: row.item.note, prices: row.item.prices });
  menuChanged();
  return { ok: `Removed ${row.item.name} from the menu.` };
}

// ——— Add-ons and fine print: managers (their branch) and the admin ———

export async function saveAddon(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff([...EDITORS]);
  const name = s(form.get("name")).replace(/\s+/g, " ");
  const price = readPrice(s(form.get("price")));
  if (!name || name.length > 40) return { error: "Give the add-on a name (up to 40 characters)." };
  if (price === null || price === "bad") return { error: "The price is whole pesos, like 25." };

  const id = s(form.get("id"));
  if (!id) {
    const branch = s(form.get("branch"));
    if (!isBranchId(branch) || !canActOnBranch(me, branch)) return NOT_YOURS;
    const [last] = await db.select({ n: max(menuAddons.sort) }).from(menuAddons).where(eq(menuAddons.branchId, branch));
    const [added] = await db.insert(menuAddons).values({ branchId: branch, name, price, sort: (last?.n ?? 0) + 1 }).returning({ id: menuAddons.id });
    await audit(me.id, "menu.addon-add", { addonId: added.id, branchId: branch, name, price });
    menuChanged();
    return { ok: `Added ${name}.` };
  }

  const [addon] = await db.select().from(menuAddons).where(eq(menuAddons.id, id)).limit(1);
  if (!addon) return { error: "That add-on is no longer on the menu." };
  if (!canActOnBranch(me, addon.branchId)) return NOT_YOURS;
  await db.update(menuAddons).set({ name, price }).where(eq(menuAddons.id, addon.id));
  await audit(me.id, "menu.edit", { addonId: addon.id, branchId: addon.branchId, before: { name: addon.name, price: addon.price }, after: { name, price } });
  menuChanged();
  return { ok: `Saved ${name}.` };
}

/** Removes an add-on for good. Past orders keep their own copy of it. */
export async function deleteAddon(id: string): Promise<ActionState> {
  const me = await requireStaff([...EDITORS]);
  const [addon] = await db.select().from(menuAddons).where(eq(menuAddons.id, id)).limit(1);
  if (!addon) return { error: "That add-on is no longer on the menu." };
  if (!canActOnBranch(me, addon.branchId)) return NOT_YOURS;
  await db.delete(menuAddons).where(eq(menuAddons.id, id));
  await audit(me.id, "menu.addon-delete", { addonId: id, branchId: addon.branchId, name: addon.name, price: addon.price });
  menuChanged();
  return { ok: `Removed ${addon.name}.` };
}

/** The short lines under the menu ("Prices include VAT"), one per line */
export async function saveMenuNotes(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff([...EDITORS]);
  const branch = s(form.get("branch"));
  if (!isBranchId(branch) || !canActOnBranch(me, branch)) return NOT_YOURS;
  const notes = s(form.get("notes")).split(/\r?\n/).map((l) => l.trim().replace(/\s+/g, " ")).filter(Boolean);
  if (notes.length > 8) return { error: "Keep it to 8 lines or fewer." };
  if (notes.some((l) => l.length > 200)) return { error: "Keep each line under 200 characters." };
  const [before] = await db.select({ notes: branches.menuNotes }).from(branches).where(eq(branches.id, branch)).limit(1);
  await db.update(branches).set({ menuNotes: notes }).where(eq(branches.id, branch));
  await audit(me.id, "menu.notes", { branchId: branch, before: before?.notes ?? [], after: notes });
  menuChanged();
  return { ok: "Saved the fine print." };
}
