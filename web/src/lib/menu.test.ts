import { describe, expect, it } from "vitest";
import { searchMenu, type MenuCategory } from "./menu";

const item = (name: string, note: string | null = null, description: string | null = null) =>
  ({ id: name, name, note, description, prices: [100], star: false, available: true, homePick: null });
const cat = (title: string, items: ReturnType<typeof item>[]): MenuCategory =>
  ({ id: title, slug: title.toLowerCase(), title, note: null, sizes: null, kind: "drink", upsizePrice: null, items });

const menu = [
  cat("Caffeinated", [item("Café Mocha"), item("Spanish Latte"), item("Flavored Macchiato", "Salted caramel, caramel or hazelnut")]),
  cat("Refreshers", [item("Iced Lemonade", null, "Fresh calamansi and lemon, shaken with ice.")]),
  cat("Empty", []),
];
const names = (cs: MenuCategory[]) => cs.map((c) => [c.title, c.items.map((i) => i.name)]);

describe("searching the menu", () => {
  it("an empty search keeps every group that has items", () => {
    expect(names(searchMenu(menu, "  "))).toEqual([
      ["Caffeinated", ["Café Mocha", "Spanish Latte", "Flavored Macchiato"]],
      ["Refreshers", ["Iced Lemonade"]],
    ]);
  });

  it("matches names, notes and descriptions, ignoring case and accents", () => {
    expect(names(searchMenu(menu, "cafe"))).toEqual([["Caffeinated", ["Café Mocha"]]]);
    expect(names(searchMenu(menu, "HAZELNUT"))).toEqual([["Caffeinated", ["Flavored Macchiato"]]]);
    expect(names(searchMenu(menu, "calamansi"))).toEqual([["Refreshers", ["Iced Lemonade"]]]);
  });

  it("a group's title finds everything in it, and every word has to match", () => {
    expect(names(searchMenu(menu, "refreshers"))).toEqual([["Refreshers", ["Iced Lemonade"]]]);
    expect(names(searchMenu(menu, "latte spanish"))).toEqual([["Caffeinated", ["Spanish Latte"]]]);
    expect(searchMenu(menu, "latte pizza")).toEqual([]);
  });
});
