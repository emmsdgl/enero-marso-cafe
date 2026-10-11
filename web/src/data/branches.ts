/** The branches' profiles. Opening hours live in the database (lib/hours.ts, Staff > Branch). */
export type Branch = {
  id: "main" | "noir";
  name: string;
  tagline: string;
  kind: string;
  serves: string;
  address: string;
  landmark?: string;
  mapsUrl: string;
  socials: { instagram: string; facebook: string; handle: string };
};

export const branches: Branch[] = [
  {
    id: "main",
    name: "Enero Marso Cafe",
    tagline: "Coffee, comfort & good conversations",
    kind: "The cafe",
    serves: "Coffee and food",
    address: "126 Champaca St., Western Bicutan, Taguig",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=126+Champaca+St.+Western+Bicutan+Taguig",
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
    socials: {
      instagram: "https://www.instagram.com/eneromarsonoir/",
      handle: "@eneromarsonoir",
      facebook: "https://www.facebook.com/1216769311528466",
    },
  },
];
