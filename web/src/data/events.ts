/**
 * Reservations, the coffee booth and catering.
 * The coffee booth packages, drinks and terms come from the owner's "Enero Marso Contract" (Canva, Oct 2026).
 * Offers marked `sample` are placeholders agreed with the owner until final offers are set; the page says so.
 */
export type OfferGroup = "booth" | "reserve" | "cater";

export type Offer = {
  id: string;
  group: OfferGroup;
  name: string;
  /** One short line on what it is */
  line: string;
  /** null = free */
  price: number | null;
  /** What the price covers, e.g. "consumable", "per tray of 10" */
  unit: string;
  where: string;
  includes: string[];
  /** Booth cups */
  cups?: { oz: 12 | 16; count: number };
  guests?: { min: number; max: number };
  /** Placeholder until the owner sets the final offer */
  sample?: boolean;
};

export const CONTACT = { phone: "0915 954 1360", tel: "+639159541360" };
/** Owner confirmed (Oct 2026): charged on top of every booth package */
export const BARISTA_FEE = 3000;
export const SAMPLE_NOTE = "Sample packages and prices. Final offers are coming soon.";

const booth = (n: number, oz: 12 | 16, count: number, price: number): Offer => ({
  id: `booth-${n}`,
  group: "booth",
  name: `Package ${n}`,
  line: `${oz} oz · ${count} cups`,
  price,
  unit: `${count} cups, ${oz} oz`,
  where: "Your venue",
  includes: [],
  cups: { oz, count },
});

export const offers: Offer[] = [
  booth(1, 12, 100, 10500),
  booth(2, 12, 120, 11500),
  booth(3, 12, 150, 13500),
  booth(4, 16, 100, 12000),
  booth(5, 16, 120, 14500),
  booth(6, 16, 150, 16500),
  {
    id: "table",
    group: "reserve",
    name: "Table reservation",
    line: "Dates, study groups, family nights",
    guests: { min: 2, max: 10 },
    price: null,
    unit: "no fee",
    where: "Enero Marso Cafe",
    includes: ["Your table held 15 minutes past your time", "Order from the full menu", "Tuesday to Sunday, 6 PM to 1 AM"],
    sample: true,
  },
  {
    id: "private",
    group: "reserve",
    name: "Private night",
    line: "The whole cafe, just for your group",
    guests: { min: 15, max: 40 },
    price: 15000,
    unit: "consumable",
    where: "Enero Marso Cafe",
    includes: ["Cafe closed to walk-ins for 3 hours", "Spend the full amount on food and drinks", "Bring your own decor and playlist"],
    sample: true,
  },
  {
    id: "coffee-tray",
    group: "cater",
    name: "Coffee by the tray",
    line: "Meetings, review sessions, the office",
    guests: { min: 10, max: 60 },
    price: 1100,
    unit: "per 10 cups",
    where: "Pickup or Lalamove",
    includes: ["Mix any drinks from the menu", "Labelled cups, packed to travel", "Order a day ahead"],
    sample: true,
  },
  {
    id: "snack-tray",
    group: "cater",
    name: "Party snack trays",
    line: "Nachos, nuggets, fries, mozza sticks",
    guests: { min: 10, max: 30 },
    price: 1800,
    unit: "per tray of 10",
    where: "Pickup or Lalamove",
    includes: ["Pick 3 finger snacks", "Two dipping sauces", "Order a day ahead"],
    sample: true,
  },
];

export const offerGroups: { id: OfferGroup; title: string }[] = [
  { id: "booth", title: "Coffee booth" },
  { id: "reserve", title: "Reserve" },
  { id: "cater", title: "Trays" },
];

/** Drinks guests can order at the booth (contract: Inclusions) */
export const boothDrinks: { title: string; items: string[] }[] = [
  { title: "Caffeinated", items: ["Spanish Latte", "Cafe Latte", "Americano", "Matcha Latte"] },
  { title: "Flavored macchiato", items: ["Salted Caramel", "Caramel", "Hazelnut"] },
  { title: "Non-caffeinated", items: ["Hazelnut Chocolate", "Chocolate Milk", "Sakura Milk", "Blood Moon"] },
];

/** The contract's terms, in plain words */
export const boothTerms: string[] = [
  "Three baristas serve for 2 to 4 hours, depending on stock",
  "Plus a ₱3,000 barista fee (₱1,000 for each of the three baristas), not included in the package price",
  "You provide a 2 × 3 m space and a standard table",
  "We arrive 2 hours early to set up and stay 1.5 hours after to pack up",
  "You cover the round-trip transport and meals for the three baristas",
  "A 20% non-refundable deposit reserves your date; the balance is due 3 days before",
  "Pay by cash, GCash or bank transfer",
  "Cancel at least 14 days before the event",
];

export const priceText = (o: Offer) => (o.price === null ? "Free" : `₱${o.price.toLocaleString("en-PH")}`);
export const guestsText = (o: Offer) => (o.guests ? `${o.guests.min}–${o.guests.max} guests` : "");
