import type { Metadata } from "next";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import "./events.css";

export const metadata: Metadata = {
  title: "Reserve & Cater",
  description: "Reserve a table or the whole of Enero Marso Cafe, or book the Cafe Noir coffee cart and party trays for your event in Taguig.",
};

export default function ReservationsLayout({ children }: LayoutProps<"/reservations">) {
  return (
    <>
      <SiteHeader />
      {children}
      <SiteFooter />
    </>
  );
}
