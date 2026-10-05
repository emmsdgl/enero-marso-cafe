/**
 * Reservations and catering offers.
 * SAMPLE CONTENT: every package, price and inclusion below is a placeholder agreed with the owner
 * (Oct 2026) until the final offers are set. The pages say so on screen.
 */
export type OfferGroup = "reserve" | "cater";

export type Offer = {
  id: string;
  group: OfferGroup;
  name: string;
  /** One short line on who it is for */
  line: string;
  guests: { min: number; max: number };
  /** null = free */
  price: number | null;
  /** What the price covers, e.g. "consumable", "per tray" */
  unit: string;
  where: string;
  includes: string[];
  /** Needs the guest's venue address (cart or delivery) */
  atVenue: boolean;
  /** Priced per this many guests (trays); otherwise one flat price */
  per?: number;
};

export const SAMPLE_NOTE = "Sample packages and prices. Final offers are coming soon.";

export const offers: Offer[] = [
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
    atVenue: false,
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
    atVenue: false,
  },
  {
    id: "cart-classic",
    group: "cater",
    name: "Noir Cart · Classic",
    line: "Our coffee cart at your party",
    guests: { min: 30, max: 50 },
    price: 9500,
    unit: "50 cups",
    where: "Your venue in Metro Manila",
    includes: ["One barista for 2 hours", "Choose 4 drinks from the Noir menu", "Cups, straws and setup"],
    atVenue: true,
  },
  {
    id: "cart-premier",
    group: "cater",
    name: "Noir Cart · Premier",
    line: "Weddings, debuts, launches",
    guests: { min: 60, max: 100 },
    price: 17500,
    unit: "100 cups",
    where: "Your venue in Metro Manila",
    includes: ["Two baristas for 3 hours", "Choose 6 drinks, signatures included", "Branded cup sleeves"],
    atVenue: true,
  },
  {
    id: "coffee-tray",
    group: "cater",
    name: "Coffee by the tray",
    line: "Meetings, review sessions, the office",
    guests: { min: 10, max: 60 },
    price: 1100,
    unit: "per 10 cups",
    per: 10,
    where: "Pickup or Lalamove",
    includes: ["Mix any drinks from the menu", "Labelled cups, packed to travel", "Order a day ahead"],
    atVenue: true,
  },
  {
    id: "snack-tray",
    group: "cater",
    name: "Party snack trays",
    line: "Nachos, nuggets, fries, mozza sticks",
    guests: { min: 10, max: 30 },
    price: 1800,
    unit: "per tray of 10",
    per: 10,
    where: "Pickup or Lalamove",
    includes: ["Pick 3 finger snacks", "Two dipping sauces", "Order a day ahead"],
    atVenue: true,
  },
  {
    id: "office-morning",
    group: "cater",
    name: "Office coffee break",
    line: "Coffee and snacks for the team",
    guests: { min: 15, max: 40 },
    price: 4500,
    unit: "serves 15",
    where: "Pickup or Lalamove",
    includes: ["15 drinks of your choice", "One party snack tray", "Delivered at the time you set"],
    atVenue: true,
  },
];

export const offerGroups: { id: OfferGroup; title: string; line: string }[] = [
  { id: "reserve", title: "Reserve", line: "A table or the whole cafe" },
  { id: "cater", title: "Catering", line: "Our coffee, at your event" },
];

export const priceText = (o: Offer) => (o.price === null ? "Free" : `₱${o.price.toLocaleString("en-PH")}`);
export const guestsText = (o: Offer) => `${o.guests.min}–${o.guests.max} guests`;

/** Sample estimate for a guest count: trays scale by the tray, everything else is one price */
export const estimate = (o: Offer, guests: number) =>
  o.price === null ? null : o.per ? Math.ceil(guests / o.per) * o.price : o.price;
export const peso = (n: number | null) => (n === null ? "Free" : `₱${n.toLocaleString("en-PH")}`);
