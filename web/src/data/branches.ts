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

/** Is the branch open at this Manila day/minute? Checks today's window and last night's spill past midnight. */
export function isOpen(b: Branch, weekday: number, minute: number): boolean {
  const today = b.week[weekday];
  if (today) {
    const overnight = today.close < today.open;
    if (minute >= today.open && (overnight || minute < today.close)) return true;
  }
  const yesterday = b.week[(weekday + 6) % 7];
  return !!yesterday && yesterday.close < yesterday.open && minute < yesterday.close;
}
