import "server-only";
import { asc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { branches, db, menuAddons, menuCategories, menuItems } from "@/db";
import { fromPrice, type BranchId, type Highlight, type MenuCategory, type Menus } from "./menu";

/** Everything the public site shows from the menu carries this tag; staff edits expire it */
export const MENU_TAG = "menu";

/** Both menus straight from the database. Staff screens and order checks use this, never the cache. */
export async function loadMenus(): Promise<Menus> {
  const [cats, items, addons, notes] = await Promise.all([
    db.select().from(menuCategories).orderBy(asc(menuCategories.sort)),
    db.select().from(menuItems).orderBy(asc(menuItems.sort)),
    db.select().from(menuAddons).orderBy(asc(menuAddons.sort)),
    db.select({ id: branches.id, menuNotes: branches.menuNotes }).from(branches),
  ]);

  const menu = (branch: BranchId) => ({
    branch,
    categories: cats
      .filter((c) => c.branchId === branch)
      .map((c): MenuCategory => ({
        id: c.id,
        slug: c.slug,
        title: c.title,
        note: c.note,
        sizes: c.sizes,
        kind: c.kind,
        items: items
          .filter((i) => i.categoryId === c.id)
          .map((i) => ({ id: i.id, name: i.name, note: i.note, prices: i.prices, star: i.star, available: i.available, homePick: i.homePick })),
      })),
    addOns: addons
      .filter((a) => a.branchId === branch)
      .map((a) => ({ id: a.id, name: a.name, price: a.price, available: a.available })),
    notes: notes.find((n) => n.id === branch)?.menuNotes ?? [],
  });

  return { main: menu("main"), noir: menu("noir") };
}

/**
 * The public site's copy: kept in Next's data cache so page views don't wake the database,
 * refreshed the moment staff change the menu (and at least hourly).
 */
export const getMenus = unstable_cache(loadMenus, ["menus"], { tags: [MENU_TAG], revalidate: 3600 });

/** The homepage rows: the main cafe's featured drinks and food, in the order staff picked */
export async function getHighlights(): Promise<{ drinks: Highlight[]; food: Highlight[] }> {
  const { main } = await getMenus();
  const row = (kind: MenuCategory["kind"]) =>
    main.categories
      .filter((c) => c.kind === kind)
      .flatMap((c) => c.items)
      .filter((i) => i.homePick !== null)
      .sort((a, b) => a.homePick! - b.homePick!)
      .map((i) => ({ name: i.name, price: fromPrice(i), from: i.prices.filter((p) => p !== null).length > 1, available: i.available }));
  return { drinks: row("drink"), food: row("food") };
}
