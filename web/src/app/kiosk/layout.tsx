import type { Metadata } from "next";
import KioskApp from "@/components/staff/KioskApp";

/** The counter tablet installs as its own full-screen app ("EM Clock-in"), separate from the staff app */
export const metadata: Metadata = {
  robots: { index: false },
  manifest: "/kiosk.webmanifest",
  appleWebApp: { capable: true, title: "EM Clock-in", statusBarStyle: "black-translucent" },
  icons: { icon: "/favicon.ico", apple: "/icons/kiosk-180.png" },
};

export default function KioskLayout({ children }: LayoutProps<"/kiosk">) {
  return (
    <>
      <KioskApp />
      {children}
    </>
  );
}
