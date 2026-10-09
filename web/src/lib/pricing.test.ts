import { describe, expect, it } from "vitest";
import type { BranchMenu } from "./menu";
import { formatPhone, normalizePhone, priceCart, type CartLine } from "./pricing";

const item = (id: string, name: string, prices: (number | null)[], available = true) =>
  ({ id, name, note: null, prices, star: false, available, homePick: null });

const menu: BranchMenu = {
  branch: "main",
  notes: [],
  addOns: [
    { id: "shot", name: "Extra shot", price: 25, available: true },
    { id: "sinkers", name: "Add sinkers", price: 25, available: false },
  ],
  categories: [
    {
      id: "c1", slug: "caffeinated", title: "Caffeinated", note: null, sizes: ["Tall", "Medium", "Large"], kind: "drink", upsizePrice: null,
      items: [item("americano", "Americano", [90, 100, 115]), item("sea-salt", "Sea Salt Latte", [130, 140, null]), item("mocha", "White Mocha", [120, 130, 145], false)],
    },
    {
      id: "c2", slug: "signature", title: "Signature", note: "Upsize +₱15", sizes: null, kind: "drink", upsizePrice: 15,
      items: [item("pb", "Peanut Butter Cloud", [175])],
    },
    {
      id: "c3", slug: "rice-meals", title: "Rice Meals", note: null, sizes: null, kind: "food", upsizePrice: null,
      items: [item("burger", "Burgersteak", [185])],
    },
  ],
};
const line = (over: Partial<CartLine>): CartLine => ({ itemId: "americano", size: 0, upsize: false, addons: [], qty: 1, ...over });

describe("pricing an order on the server", () => {
  it("takes every price from the menu, with sizes, upsizes and add-ons", () => {
    const r = priceCart(menu, [line({ size: 2, qty: 2, addons: ["shot"] }), line({ itemId: "pb", upsize: true }), line({ itemId: "burger" })]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.lines.map((l) => [l.name, l.size, l.unitPrice, l.lineTotal])).toEqual([
      ["Americano", "Large", 140, 280],
      ["Peanut Butter Cloud", null, 190, 190],
      ["Burgersteak", null, 185, 185],
    ]);
    expect(r.subtotal).toBe(655);
  });

  it("ignores any price the browser might try to send", () => {
    const tampered = { ...line({}), price: 1, unitPrice: 1 } as unknown as CartLine;
    const r = priceCart(menu, [tampered]);
    expect(r.ok && r.subtotal).toBe(90);
  });

  it("refuses sold-out items and add-ons", () => {
    expect(priceCart(menu, [line({ itemId: "mocha" })])).toMatchObject({ ok: false, error: expect.stringContaining("sold out") });
    expect(priceCart(menu, [line({ addons: ["sinkers"] })])).toMatchObject({ ok: false, error: expect.stringContaining("ran out") });
  });

  it("refuses items from another branch or that don't exist", () => {
    expect(priceCart(menu, [line({ itemId: "noir-only" })]).ok).toBe(false);
  });

  it("refuses a size the item isn't offered in", () => {
    expect(priceCart(menu, [line({ itemId: "sea-salt", size: 2 })]).ok).toBe(false);
    expect(priceCart(menu, [line({ size: 3 })]).ok).toBe(false);
    expect(priceCart(menu, [line({ itemId: "burger", size: 1 })]).ok).toBe(false);
  });

  it("only upsizes where the menu offers it, and only puts add-ons on drinks", () => {
    expect(priceCart(menu, [line({ upsize: true })]).ok).toBe(false);
    expect(priceCart(menu, [line({ itemId: "burger", addons: ["shot"] })]).ok).toBe(false);
    expect(priceCart(menu, [line({ addons: ["shot", "shot"] })]).ok).toBe(false);
  });

  it("keeps quantities sensible", () => {
    expect(priceCart(menu, []).ok).toBe(false);
    expect(priceCart(menu, [line({ qty: 0 })]).ok).toBe(false);
    expect(priceCart(menu, [line({ qty: 21 })]).ok).toBe(false);
    expect(priceCart(menu, [line({ qty: 1.5 })]).ok).toBe(false);
    expect(priceCart(menu, Array.from({ length: 4 }, () => line({ qty: 20 }))).ok).toBe(false); // 80 items
  });
});

describe("mobile numbers", () => {
  it("accepts the usual ways of writing a PH mobile number", () => {
    for (const n of ["09171234567", "0917 123 4567", "0917-123-4567", "+639171234567", "639171234567", "+63 917 123 4567"]) {
      expect(normalizePhone(n)).toBe("09171234567");
    }
  });
  it("shows a stored number in readable groups", () => {
    expect(formatPhone("09171234567")).toBe("0917 123 4567");
    expect(formatPhone("weird")).toBe("weird");
  });
  it("refuses anything else", () => {
    for (const n of ["", "1234", "0817123456", "091712345678", "(02) 8123 4567", "hello"]) expect(normalizePhone(n)).toBeNull();
  });
});
