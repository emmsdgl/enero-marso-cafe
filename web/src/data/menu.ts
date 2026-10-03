/**
 * The real menus, transcribed from the printed menus the owner supplied:
 * "main menu.jpg" (Enero Marso Cafe) and "noir menu.jpg" (Enero Marso Cafe Noir).
 * prices[] lines up with the category's sizes[]; null = not offered in that size.
 */
export type Item = { name: string; note?: string; prices: (number | null)[]; star?: boolean };
export type Category = {
  id: string;
  title: string;
  note?: string;
  sizes?: string[];
  kind: "drink" | "food";
  items: Item[];
};
export type BranchMenu = {
  branch: "main" | "noir";
  categories: Category[];
  addOns: { name: string; price: number }[];
  notes: string[];
};

const one = (name: string, price: number, note?: string, star?: boolean): Item => ({ name, prices: [price], note, star });

export const mainMenu: BranchMenu = {
  branch: "main",
  categories: [
    {
      id: "caffeinated", title: "Caffeinated", note: "Hot or iced", sizes: ["Tall", "Medium", "Large"], kind: "drink",
      items: [
        { name: "Americano", prices: [90, 100, 115] },
        { name: "White Mocha", prices: [120, 130, 145] },
        { name: "Spanish Latte", prices: [115, 125, 140] },
        { name: "Sea Salt Spanish Latte", prices: [120, 130, 145] },
        { name: "Flavored Macchiato", note: "Salted caramel, caramel or hazelnut", prices: [120, 130, 145] },
        { name: "Café Mocha", prices: [125, 135, 150] },
        { name: "Biscoff Latte", prices: [125, 135, 150] },
        { name: "Matcha Latte", prices: [115, 125, 140] },
      ],
    },
    {
      id: "signature", title: "Signature", note: "Upsize +₱15", kind: "drink",
      items: [
        one("Iced Mont Blanc Espresso", 160),
        one("Iced Irish Cream Coffee", 150),
        one("Dark Hazelnut Cold Foam", 165),
        one("Ilonggo Brew Muscovado", 125, "Iced shaken espresso"),
        one("Brown Sugar", 120, "Iced shaken espresso"),
        one("Barista Drink", 135, "Hot or iced"),
        one("Peanut Butter Cloud", 175, "Hot or iced"),
      ],
    },
    {
      id: "affogato", title: "Gelato Affogato", kind: "drink",
      items: [
        one("Vanilla Cream", 110), one("Caramel", 115), one("Cookies and Cream", 120), one("Dark Chocolate", 120),
        one("Salted Caramel", 115), one("White Chocolate", 115), one("Biscoff", 145),
      ],
    },
    {
      id: "non-caffeinated", title: "Non Caffeinated", note: "Upsize +₱15", kind: "drink",
      items: [
        one("Hazelnut Chocolate", 120, "Hot or iced"),
        one("White Chocolate Milk", 125, "Hot or iced"),
        one("Signature Chocolate Milk", 110, "Hot or iced"),
        one("Sakura Milk", 110),
        one("Ube Milk Macapuno", 130),
      ],
    },
    {
      id: "refreshers", title: "Refreshers", note: "Upsize +₱15", kind: "drink",
      items: [
        one("Iced Tea with Grenadine", 90, "Apple, lemon or cranberry"),
        one("Blood Moon", 115), one("Sunrise", 115), one("Blueberry Spritz", 100), one("Simba", 115), one("Ocean Breeze", 125),
      ],
    },
    {
      id: "tea", title: "Tea Series", note: "Upsize +₱15", kind: "drink",
      items: [one("Thai Tea Latte", 130), one("Black Tea Latte", 125)],
    },
    {
      id: "yogurt", title: "Yogurt Series", kind: "drink",
      items: [one("Strawberry", 120), one("Blueberry", 120), one("Mango", 120)],
    },
    {
      id: "rice-meals", title: "Rice Meals", kind: "food",
      items: [one("Burgersteak", 185), one("German Franks Sausage", 200), one("Chicken Chipoleta", 200), one("Hungarian Sausage", 200)],
    },
    {
      id: "finger-snacks", title: "Finger Snacks", note: "+₱25 per sauce", kind: "food",
      items: [
        one("French Fries", 65), one("Chicken Nuggets", 115, "6 pcs"), one("Chicken Nuggets with Fries", 170),
        one("Nachos", 115), one("Nachos with Fries", 165), one("Onion Rings", 100), one("Mozza Sticks", 155),
      ],
    },
  ],
  addOns: [
    { name: "Extra shot", price: 25 },
    { name: "Double shot", price: 35 },
    { name: "Add sinkers", price: 25 },
  ],
  notes: [],
};

export const noirMenu: BranchMenu = {
  branch: "noir",
  categories: [
    {
      id: "caffeinated", title: "Caffeinated Drinks", sizes: ["16 oz", "22 oz", "Hot"], kind: "drink",
      items: [
        { name: "Americano", prices: [95, 105, 105] },
        { name: "Café Latte", prices: [115, 125, 125] },
        { name: "Café Mocha", prices: [120, 130, 130] },
        { name: "White Mocha", prices: [120, 130, 130] },
        { name: "Flavored Macchiato", note: "Salted caramel, caramel or hazelnut", prices: [120, 130, 130] },
        { name: "Spanish Latte", prices: [125, 135, 135], star: true },
        { name: "Biscoff Latte", prices: [130, 140, 140], star: true },
        { name: "Sea Salt Latte", prices: [130, 140, null] },
      ],
    },
    {
      id: "specialty", title: "Specialty Drinks", sizes: ["16 oz", "22 oz"], kind: "drink",
      items: [
        { name: "Barista Drink", prices: [130, 145], star: true },
        { name: "Ilonggo Brew Muscovado", note: "Iced shaken espresso", prices: [125, 140], star: true },
        { name: "Irish Cream", prices: [140, 155] },
        { name: "Mont Blanc", note: "Orange + espresso", prices: [150, 165] },
        { name: "Dark Hazelnut Cloud", note: "Americano-based", prices: [155, 170] },
        { name: "Peanut Butter Cloud Latte", prices: [155, 170], star: true },
      ],
    },
    {
      id: "milk", title: "Milk Series", note: "16 oz · upsize +₱15", kind: "drink",
      items: [
        one("Chocolate Milk", 110), one("Sakura Milk", 110), one("White Chocolate Milk", 120), one("Hazelnut Chocolate", 120),
        one("Ube Milk Macapuno", 120, undefined, true),
      ],
    },
    {
      id: "milk-tea", title: "Milk Teas & Matcha", note: "16 oz · upsize +₱15", kind: "drink",
      items: [
        one("Thai Milk Tea", 115, "ChaTraMue"), one("Black Tea Latte", 115), one("Matcha Latte", 125, undefined, true),
        one("Strawberry Matcha", 150),
      ],
    },
    {
      id: "refreshers", title: "Refreshers", note: "16 oz · upsize +₱15", kind: "drink",
      items: [
        one("Blueberry Spritz", 100, undefined, true), one("Sunrise", 105, "Orange"), one("Bloodmoon", 105, "Pineapple"),
        one("Iced Tea with Grenadine", 90),
      ],
    },
    {
      id: "yogurt", title: "Yogurt-based Refreshers", note: "16 oz", kind: "drink",
      items: [one("Strawberry", 110), one("Blueberry", 110)],
    },
  ],
  addOns: [
    { name: "Coconut jelly", price: 15 },
    { name: "Syrup", price: 20 },
    { name: "Breve", price: 25 },
    { name: "Extra espresso shot", price: 25 },
    { name: "Double shot", price: 40 },
    { name: "Sub oat milk", price: 40 },
  ],
  notes: ["All espresso drinks come with 2 shots of espresso."],
};

export const menus = { main: mainMenu, noir: noirMenu } as const;

export const peso = (n: number) => `₱${n}`;
export const fromPrice = (i: Item) => Math.min(...i.prices.filter((p): p is number => p !== null));

/** Homepage highlights: real items from the main cafe. Photos get added once the owner shoots them. */
export type Highlight = { name: string; price: number; from?: boolean; photo?: string };
const pick = (catId: string, name: string): Highlight => {
  const cat = mainMenu.categories.find((c) => c.id === catId)!;
  const item = cat.items.find((i) => i.name === name)!;
  return { name, price: fromPrice(item), from: item.prices.length > 1 };
};
export const homeDrinks: Highlight[] = [
  pick("caffeinated", "Spanish Latte"),
  pick("signature", "Peanut Butter Cloud"),
  pick("signature", "Ilonggo Brew Muscovado"),
  pick("caffeinated", "Biscoff Latte"),
];
export const homeFood: Highlight[] = [
  pick("rice-meals", "Burgersteak"),
  pick("finger-snacks", "Chicken Nuggets with Fries"),
  pick("finger-snacks", "Nachos with Fries"),
  pick("finger-snacks", "Mozza Sticks"),
];
