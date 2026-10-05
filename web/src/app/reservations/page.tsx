import { redirect } from "next/navigation";

// Until the owner picks a design, the nav link opens option A
export default function ReservationsPage() {
  redirect("/reservations/a");
}
