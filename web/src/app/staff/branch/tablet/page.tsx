import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { and, eq, isNull } from "drizzle-orm";
import ActionForm from "@/components/staff/ActionForm";
import { db, kiosks } from "@/db";
import { branches } from "@/data/branches";
import { hashKioskToken, KIOSK_COOKIE, requireStaff } from "@/lib/staff";
import { registerKiosk } from "../../actions";

export const metadata: Metadata = { title: "Clock-in tablet" };

/**
 * Where "Set up this tablet" on the clock-in screen leads, after a manager signs in on the tablet.
 * One step, and the manager is signed out again when it's done.
 */
export default async function TabletSetupPage() {
  const me = await requireStaff(["admin", "manager"]);
  const mine = branches.filter((b) => me.role === "admin" || b.id === me.branchId);
  const token = (await cookies()).get(KIOSK_COOKIE)?.value;
  const [already] = token
    ? await db.select({ branchId: kiosks.branchId }).from(kiosks).where(and(eq(kiosks.tokenHash, hashKioskToken(token)), isNull(kiosks.revokedAt))).limit(1)
    : [];

  return (
    <div className="staff-page">
      <header className="staff-head">
        <h1>Make this the clock-in tablet</h1>
        <p>Staff tap their name and type their PIN here to clock in and out, and Talk listens on it all day.</p>
      </header>
      <section className="staff-card tablet-setup">
        {already && (
          <p className="staff-note is-ok">
            This device is already the clock-in tablet for {branches.find((b) => b.id === already.branchId)?.name}. <Link href="/kiosk">Open the clock-in screen</Link>
          </p>
        )}
        <ActionForm action={registerKiosk} submit="Make this the clock-in tablet">
          {mine.length > 1 ? (
            <label>
              Branch
              <select name="branch" defaultValue={mine[0].id}>
                {mine.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          ) : (
            <input type="hidden" name="branch" value={mine[0]?.id ?? ""} />
          )}
          <label>
            Name it
            <input name="label" defaultValue="Counter tablet" />
          </label>
          <small className="staff-help">When it&rsquo;s done you&rsquo;re signed out on this device, and it opens the clock-in screen.</small>
        </ActionForm>
      </section>
      <Link href="/staff/branch" className="staff-link">Back to Branch setup</Link>
    </div>
  );
}
