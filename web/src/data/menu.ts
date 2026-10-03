export type MenuItem = {
  name: string;
  price: number;
  /** Path under /public. Missing means the photo has not been supplied yet. */
  photo?: string;
};

export const coffee: MenuItem[] = [
  { name: "Iced Latte", price: 120, photo: "/photos/iced-latte.jpg" },
  { name: "Vanilla Latte", price: 140, photo: "/photos/vanilla-latte.jpg" },
  { name: "Choco Frappe", price: 160, photo: "/photos/choco-frappe.jpg" },
];

export const food: MenuItem[] = [
  { name: "Baked Lasagna", price: 180, photo: "/photos/baked-lasagna.jpg" },
  { name: "Carbonara Pasta", price: 160, photo: "/photos/carbonara-pasta.jpg" },
  { name: "Club Sandwich", price: 120, photo: "/photos/club-sandwich.jpg" },
];

export const peso = (n: number) => `₱${n}`;
