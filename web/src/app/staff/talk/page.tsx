import type { Metadata } from "next";
import Link from "next/link";
import TalkScreen from "@/components/talk/TalkScreen";
import { branches } from "@/data/branches";
import { talkConfigured } from "@/lib/realtime-sfu";
import { requireStaff } from "@/lib/staff";
import { clipsFor, staffMember } from "@/lib/talk";
import { shortBranch } from "@/lib/talk-rules";

export const metadata: Metadata = { title: "Talk" };

/** Push-to-talk between the owner and the people on shift */
export default async function TalkPage() {
  const me = await requireStaff();
  const member = await staffMember(me);
  const configured = talkConfigured();
  const clips = member && configured ? await clipsFor(member) : [];

  return (
    <div className="staff-page">
      <header className="staff-head">
        <h1>Talk</h1>
        <p>
          {member?.admin
            ? "Hold the button and speak: everyone on Talk at the branches you pick hears you right away."
            : `Hold the button and speak: the owner and everyone on Talk at ${shortBranch(me.branchId ?? "")} hear you right away.`}
        </p>
      </header>
      {!configured ? (
        <p className="staff-note is-warn">Talk isn&rsquo;t set up on this site yet.</p>
      ) : !member ? (
        <section className="staff-card talk-closed">
          <h2>Clock in to use Talk</h2>
          <p className="staff-help">Talk is for the people on shift and the owner. Clock in on Today or at the counter tablet, then come back here.</p>
          <Link href="/staff" className="staff-btn is-primary">Go to Today</Link>
        </section>
      ) : (
        <TalkScreen admin={member.admin} branchIds={member.admin ? branches.map((b) => b.id) : member.channels} clips={clips} />
      )}
    </div>
  );
}
