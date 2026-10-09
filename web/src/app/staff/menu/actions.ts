"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { db, menuAddons, menuCategories, menuItems } from "@/db";
import { MENU_TAG } from "@/lib/menu-store";
import { audit, canActOnBranch, requireStaff } from "@/lib/staff";
import type { ActionState } from "../actions";

const s = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const NOT_YOURS = { error: "You can only change your own branch's menu." };

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

async function itemWithBranch(itemId: string) {
  const [row] = await db
    .select({ item: menuItems, branchId: menuCategories.branchId, sizes: menuCategories.sizes })
    .from(menuItems)
    .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(eq(menuItems.id, itemId))
    .limit(1);
  return row;
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

// ——— Names and prices: managers (their branch) and the admin ———
export async function saveMenuItem(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const row = await itemWithBranch(s(form.get("id")));
  if (!row) return { error: "That item is no longer on the menu." };
  if (!canActOnBranch(me, row.branchId)) return NOT_YOURS;

  const name = s(form.get("name"));
  const note = s(form.get("note")) || null;
  if (!name || name.length > 60) return { error: "Give the item a name (up to 60 characters)." };
  if (note && note.length > 80) return { error: "Keep the note under 80 characters." };

  const slots = row.sizes?.length ?? 1;
  const prices = Array.from({ length: slots }, (_, i) => readPrice(s(form.get(`price-${i}`))));
  if (prices.includes("bad")) return { error: "Prices are whole pesos, like 120." };
  if (prices.every((p) => p === null)) return { error: "Give the item at least one price." };

  const next = { name, note, prices: prices as (number | null)[], star: form.get("star") === "on" };
  await db.update(menuItems).set({ ...next, updatedAt: new Date(), updatedBy: me.id }).where(eq(menuItems.id, row.item.id));
  await audit(me.id, "menu.edit", {
    itemId: row.item.id,
    branchId: row.branchId,
    before: { name: row.item.name, note: row.item.note, prices: row.item.prices, star: row.item.star },
    after: next,
  });
  menuChanged();
  return { ok: `Saved ${name}.` };
}

export async function saveAddon(_: ActionState, form: FormData): Promise<ActionState> {
  const me = await requireStaff(["admin", "manager"]);
  const [addon] = await db.select().from(menuAddons).where(eq(menuAddons.id, s(form.get("id")))).limit(1);
  if (!addon) return { error: "That add-on is no longer on the menu." };
  if (!canActOnBranch(me, addon.branchId)) return NOT_YOURS;

  const name = s(form.get("name"));
  const price = readPrice(s(form.get("price")));
  if (!name || name.length > 40) return { error: "Give the add-on a name (up to 40 characters)." };
  if (price === null || price === "bad") return { error: "The price is whole pesos, like 25." };

  await db.update(menuAddons).set({ name, price }).where(eq(menuAddons.id, addon.id));
  await audit(me.id, "menu.edit", { addonId: addon.id, branchId: addon.branchId, before: { name: addon.name, price: addon.price }, after: { name, price } });
  menuChanged();
  return { ok: `Saved ${name}.` };
}
