import { describe, expect, it } from "vitest";
import type { MenuCategory, Menus } from "./menu";
import { andList, checkSizes, forCustomers, moved, reshapePrices, sameSizes, slugFor } from "./menu-rules";

const sizes = ["Tall", "Medium", "Large"];
const keep = (names: string[]) => names.map((name, from) => ({ name, from }));

describe("changing a group's sizes", () => {
  it("removing Tall drops its price from every item, and the others keep theirs", () => {
    const r = checkSizes(sizes, [{ name: "Medium", from: 1 }, { name: "Large", from: 2 }]);
    expect(r).toMatchObject({ ok: true, sizes: ["Medium", "Large"], changed: true });
    if (!r.ok) return;
    expect(reshapePrices([115, 125, 140], r.rows)).toEqual([125, 140]);
    expect(reshapePrices([null, 125, 140], r.rows)).toEqual([125, 140]);
  });

  it("a rename keeps every price where it is", () => {
    const r = checkSizes(sizes, [{ name: "Small", from: 0 }, { name: "Medium", from: 1 }, { name: "Large", from: 2 }]);
    expect(r).toMatchObject({ ok: true, sizes: ["Small", "Medium", "Large"], changed: false });
  });

  it("a new size starts without prices, and a reorder moves prices with their size", () => {
    const added = checkSizes(sizes, [...keep(sizes), { name: "Venti", from: null }]);
    expect(added.ok && reshapePrices([1, 2, 3], added.rows)).toEqual([1, 2, 3, null]);
    const flipped = checkSizes(sizes, [{ name: "Large", from: 2 }, { name: "Medium", from: 1 }, { name: "Tall", from: 0 }]);
    expect(flipped).toMatchObject({ ok: true, changed: true });
    expect(flipped.ok && reshapePrices([1, 2, 3], flipped.rows)).toEqual([3, 2, 1]);
  });

  it("a one-price group can gain sizes, its price moving to the size it's given to", () => {
    const r = checkSizes(null, [{ name: "16 oz", from: 0 }, { name: "22 oz", from: null }]);
    expect(r).toMatchObject({ ok: true, sizes: ["16 oz", "22 oz"], changed: true });
    expect(r.ok && reshapePrices([175], r.rows)).toEqual([175, null]);
    expect(checkSizes(null, [])).toMatchObject({ ok: true, sizes: null, changed: false });
  });

  it("refuses empty, duplicate, too long or too many sizes, and a group losing all its sizes", () => {
    expect(checkSizes(sizes, [])).toMatchObject({ ok: false });
    expect(checkSizes(sizes, [{ name: " ", from: 0 }])).toMatchObject({ ok: false });
    expect(checkSizes(sizes, [{ name: "Medium", from: 0 }, { name: "medium", from: 1 }])).toMatchObject({ ok: false });
    expect(checkSizes(sizes, [{ name: "x".repeat(21), from: 0 }])).toMatchObject({ ok: false });
    expect(checkSizes(sizes, ["A", "B", "C", "D", "E"].map((name) => ({ name, from: null })))).toMatchObject({ ok: false });
    expect(checkSizes(sizes, [{ name: "A", from: 5 }])).toMatchObject({ ok: false });
    expect(checkSizes(sizes, [{ name: "A", from: 1 }, { name: "B", from: 1 }])).toMatchObject({ ok: false });
    expect(checkSizes(sizes, "nope")).toMatchObject({ ok: false });
  });

  it("knows when two groups have the same sizes", () => {
    expect(sameSizes(["Medium", "Large"], ["Medium", "Large"])).toBe(true);
    expect(sameSizes(["Medium", "Large"], ["Large", "Medium"])).toBe(false);
    expect(sameSizes(null, null)).toBe(true);
  });
});

describe("what customers see", () => {
  const cat = (id: string, items: [string, (number | null)[]][]): MenuCategory => ({
    id, slug: id, title: id, note: null, sizes: null, kind: "food", upsizePrice: null,
    items: items.map(([name, prices]) => ({ id: name, name, note: null, description: null, prices, star: false, available: true, homePick: null })),
  });
  const menus = (categories: MenuCategory[]): Menus => ({ main: { branch: "main", categories, addOns: [], notes: [] }, noir: { branch: "noir", categories: [], addOns: [], notes: [] } });

  it("leaves out items with no price yet, and groups with nothing to show", () => {
    const out = forCustomers(menus([cat("pastries", [["Croissant", [null]]]), cat("snacks", [["Fries", [65]], ["Nachos", [null]]])]));
    expect(out.main.categories.map((c) => [c.id, c.items.map((i) => i.name)])).toEqual([["snacks", ["Fries"]]]);
  });
});

describe("new groups and ordering", () => {
  it("makes a web-address name from the title, unique in the branch", () => {
    expect(slugFor("Gelato Affogato", [])).toBe("gelato-affogato");
    expect(slugFor("Café Specials!", [])).toBe("cafe-specials");
    expect(slugFor("Signature", ["signature", "signature-2"])).toBe("signature-3");
    expect(slugFor("★★", [])).toBe("group");
  });

  it("moves one entry up or down a place", () => {
    expect(moved(["a", "b", "c"], "b", "up")).toEqual(["b", "a", "c"]);
    expect(moved(["a", "b", "c"], "b", "down")).toEqual(["a", "c", "b"]);
    expect(moved(["a", "b", "c"], "a", "up")).toBeNull();
    expect(moved(["a", "b", "c"], "c", "down")).toBeNull();
    expect(moved(["a", "b"], "x", "up")).toBeNull();
  });

  it("lists names the way staff would say them", () => {
    expect(andList(["Tall"])).toBe("Tall");
    expect(andList(["Tall", "Medium"])).toBe("Tall and Medium");
    expect(andList(["Tall", "Medium", "Large"])).toBe("Tall, Medium and Large");
  });
});
