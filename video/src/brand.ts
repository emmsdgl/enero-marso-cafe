import { loadFont as loadAllura } from "@remotion/google-fonts/Allura";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { Easing } from "remotion";

/** The website's colors (web/src/app/globals.css). Nothing new. */
export const C = {
  ink: "#151211",
  cream: "#faf1e1",
  paper: "#fffaf1",
  sand: "#e1cdb3",
  card: "#d2b794",
  brown: "#834a22",
  cocoa: "#503225",
  gold: "#cf9d57",
  okBg: "#dcebd5",
  okText: "#24461a",
  line: "rgba(21, 18, 17, 0.14)",
} as const;

export const FONT = loadMontserrat("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin", "latin-ext"] }).fontFamily;
export const SCRIPT = loadAllura("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily;

/** The site's ease-out curve (--ease) */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** Uppercase, tracked labels like the site's ("ORDER", "BRANCH", "STEP 2 OF 5") */
export const label = (size: number, color: string = C.brown) => ({
  fontFamily: FONT,
  fontWeight: 700,
  fontSize: size,
  letterSpacing: "0.2em",
  textTransform: "uppercase" as const,
  color,
});
