/**
 * The menu's shape and small helpers, safe to use on both server and client.
 * The menus themselves live in the database (see lib/menu-store.ts); staff edit them on /staff/menu.
 */
export type BranchId = "main" | "noir";

/** prices[i] is the price in the category's sizes[i]; null = not offered in that size */
export type MenuItem = {
  id: string;
  name: string;
  note: string | null;
  prices: (number | null)[];
  star: boolean;
  available: boolean;
  homePick: number | null;
};

export type MenuCategory = {
  id: string;
  slug: string;
  title: string;
  note: string | null;
  sizes: string[] | null;
  kind: "drink" | "food";
  items: MenuItem[];
};

export type MenuAddon = { id: string; name: string; price: number; available: boolean };

export type BranchMenu = { branch: BranchId; categories: MenuCategory[]; addOns: MenuAddon[]; notes: string[] };

export type Menus = Record<BranchId, BranchMenu>;

/** A homepage card */
export type Highlight = { name: string; price: number; from?: boolean; photo?: string; available: boolean };

export const peso = (n: number) => `₱${n.toLocaleString("en-PH")}`;

export const fromPrice = (i: Pick<MenuItem, "prices">) => Math.min(...i.prices.filter((p): p is number => p !== null));

export const isBranchId = (v: unknown): v is BranchId => v === "main" || v === "noir";
