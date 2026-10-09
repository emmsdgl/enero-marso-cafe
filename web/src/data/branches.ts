/** Opening window in minutes from midnight; a close below the open time runs past midnight. */
export type Window = { open: number; close: number };

export type Branch = {
  id: "main" | "noir";
  name: string;
  tagline: string;
  kind: string;
  serves: string;
  address: string;
  landmark?: string;
  mapsUrl: string;
  /** Index 0 = Sunday … 6 = Saturday; null = closed that day */
  week: (Window | null)[];
  hoursText: { days: string; time: string }[];
  socials: { instagram: string; facebook: string; handle: string };
};

const h = (hh: number, mm = 0) => hh * 60 + mm;
const evening: Window = { open: h(18), close: h(1) }; // 6 PM – 1 AM
const day: Window = { open: h(9), close: h(1) }; // 9 AM – 1 AM
const tuesday: Window = { open: h(13), close: h(22) }; // 1 PM – 10 PM

export const branches: Branch[] = [
  {
    id: "main",
    name: "Enero Marso Cafe",
    tagline: "Coffee, comfort & good conversations",
    kind: "The cafe",
    serves: "Coffee and food",
    address: "126 Champaca St., Western Bicutan, Taguig",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=126+Champaca+St.+Western+Bicutan+Taguig",
    week: [evening, null, evening, evening, evening, evening, evening],
    hoursText: [
      { days: "Tuesday – Sunday", time: "6 PM – 1 AM" },
      { days: "Monday", time: "Closed" },
    ],
    socials: {
      instagram: "https://www.instagram.com/eneromarsocafe/",
      handle: "@eneromarsocafe",
      facebook: "https://www.facebook.com/profile.php?id=61569139323409",
    },
  },
  {
    id: "noir",
    name: "Enero Marso Cafe Noir",
    tagline: "Good coffee, great conversations",
    kind: "Trailer coffee cart",
    serves: "Drinks only",
    address: "Cayetano Blvd. cor. Bagong Calzada, Ususan, Taguig",
    landmark: "Across Vista Mall Taguig",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Cayetano+Blvd+corner+Bagong+Calzada+Ususan+Taguig",
    week: [day, day, tuesday, day, day, day, day],
    hoursText: [
      { days: "Mon & Wed – Sun", time: "9 AM – 1 AM" },
      { days: "Tuesday", time: "1 PM – 10 PM" },
    ],
    socials: {
      instagram: "https://www.instagram.com/eneromarsonoir/",
      handle: "@eneromarsonoir",
      facebook: "https://www.facebook.com/1216769311528466",
    },
  },
];

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Weekday (0 = Sunday) and minute of the day in the Philippines, whatever the device's own time zone */
export function manilaClock(at: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  return { weekday: DAYS.indexOf(get("weekday")), minute: Number(get("hour")) * 60 + Number(get("minute")) };
}

/**
 * Minutes until the branch closes, or null when it's closed at this Manila day/minute.
 * Checks today's window and last night's spill past midnight.
 */
export function minutesToClose(b: Pick<Branch, "week">, weekday: number, minute: number): number | null {
  const today = b.week[weekday];
  if (today && minute >= today.open) {
    if (today.close < today.open) return today.close + 24 * 60 - minute;
    if (minute < today.close) return today.close - minute;
  }
  const yesterday = b.week[(weekday + 6) % 7];
  if (yesterday && yesterday.close < yesterday.open && minute < yesterday.close) return yesterday.close - minute;
  return null;
}

export function isOpen(b: Pick<Branch, "week">, weekday: number, minute: number): boolean {
  return minutesToClose(b, weekday, minute) !== null;
}

/** Online orders stop this long before closing, so the last order can still be made */
export const ORDER_CUTOFF_MINUTES = 30;

export function takingOrders(b: Pick<Branch, "week">, weekday: number, minute: number, cutoff = ORDER_CUTOFF_MINUTES): boolean {
  const left = minutesToClose(b, weekday, minute);
  return left !== null && left > cutoff;
}
