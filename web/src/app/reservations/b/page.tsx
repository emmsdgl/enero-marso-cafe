import Invitations from "@/components/events/Invitations";
import VariantBar from "@/components/events/VariantBar";

// Option B: a photo opening, invitations for reservations, tear-off tickets for catering
export default function InvitationsPage() {
  return (
    <main className="iv">
      <VariantBar current="b" />
      <Invitations />
    </main>
  );
}
