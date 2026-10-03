import type { Metadata } from "next";
import ActionForm from "@/components/staff/ActionForm";
import { requireStaff } from "@/lib/staff";
import { changeMyPassword, setMyPin } from "../actions";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await requireStaff();
  return (
    <div className="staff-page">
      <header className="staff-head">
        <h1>My account</h1>
        <p>{me.email}</p>
      </header>
      <div className="staff-grid">
        <section className="staff-card" aria-labelledby="pin-title">
          <h2 id="pin-title">Clock-in PIN</h2>
          <p className="staff-help">
            {me.pinHash ? "Your PIN is set. Enter a new one to change it." : "You don't have a PIN yet."} You&rsquo;ll type it on the
            counter tablet to clock in and out. Keep it to yourself.
          </p>
          <ActionForm action={setMyPin} submit={me.pinHash ? "Change PIN" : "Set PIN"}>
            <label>New PIN<input name="pin" type="password" inputMode="numeric" autoComplete="off" pattern="\d{4,6}" maxLength={6} required /></label>
            <label>Type it again<input name="confirm" type="password" inputMode="numeric" autoComplete="off" pattern="\d{4,6}" maxLength={6} required /></label>
            <small className="staff-help">4 to 6 digits</small>
          </ActionForm>
        </section>
        <section className="staff-card" aria-labelledby="pw-title">
          <h2 id="pw-title">Password</h2>
          <ActionForm action={changeMyPassword} submit="Change password">
            <label>Current password<input name="current" type="password" autoComplete="current-password" required /></label>
            <label>New password<input name="next" type="password" autoComplete="new-password" minLength={8} required /></label>
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
