import type { Metadata, Viewport } from "next";
import { Allura, Montserrat } from "next/font/google";
import Loader from "@/components/Loader";
import "./loader.css";
import "./globals.css";

// Brand faces, matched to the logo: Montserrat for "ENERO MARSO / CAFE", Allura for the "Premier" script.
const montserrat = Montserrat({ variable: "--font-brand", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const allura = Allura({ variable: "--font-script", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Enero Marso Cafe", template: "%s · Enero Marso Cafe" },
  description: "Coffee, comfort & good conversations. Enero Marso Cafe, 126 Champaca St., Western Bicutan, Taguig.",
};

export const viewport: Viewport = { themeColor: "#151211", viewportFit: "cover" };

// Runs before paint so the loader never flashes once it has played this session
const seenScript = `try{if(sessionStorage.getItem("em-loaded"))document.documentElement.classList.add("em-seen")}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${montserrat.variable} ${allura.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: seenScript }} />
      </head>
      <body>
        <Loader />
        {children}
      </body>
    </html>
  );
}
