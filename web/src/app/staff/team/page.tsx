import type { Metadata } from "next";
import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";
import ActionForm from "@/components/staff/ActionForm";
import ActionButton from "@/components/staff/ActionButton";
import EditSheet from "@/components/staff/EditSheet";
import InviteTools from "@/components/staff/InviteTools";
import TeamFilter from "@/components/staff/TeamFilter";
import { db, staff } from "@/db";
import { branches } from "@/data/branches";
import { staffEmailFrom } from "@/lib/email";
import { inviteState } from "@/lib/email-rules";
import { usesPin } from "@/lib/roles";
import { manila, requireStaff } from "@/lib/staff";
import { addStaff, clearPin, removeStaff, restoreStaff, updateStaff } from "../actions";

export const metadata: Metadata = { title: "Team" };

const ROLES = [
  { value: "employee", label: "Employee" },
  { value: "rider", label: "Rider" },
  { value: "manager", label: "Branch manager" },
  { value: "admin", label: "Admin (both branches)" },
];
const short = (id: string | null) => (id ? branches.find((b) => b.id === id)!.name.replace("Enero Marso ", "") : "Both");

/** The row's tag and the Manage panel's line for someone who hasn't set up yet */
function inviteText(state: ReturnType<typeof inviteState>, p: { inviteExpiresAt: Date | null; inviteSentAt: Date | null }, emailOn: boolean) {
  const until = p.inviteExpiresAt ? manila.date(p.inviteExpiresAt) : "";
  switch (state) {
    case "emailed": return { tag: "Invite emailed", warn: false, line: `Emailed ${manila.date(p.inviteSentAt!)}. Works until ${until}.` };
    case "copied": return { tag: "Invited", warn: false, line: `A link was copied to send. Works until ${until}.` };
    case "expired": return emailOn
      ? { tag: "Invite ran out", warn: true, line: `The last link ran out on ${until}. Send a new one.` }
      : { tag: "Invited", warn: false, line: "The last link ran out. They can still set up at /login/setup with this email." };
    default: return emailOn
      ? { tag: "Not invited", warn: true, line: "No setup link sent yet." }
      : { tag: "Invited", warn: false, line: "They set up at /login/setup with this email, or with a link you copy here." };
  }
}

export default async function TeamPage() {
  const me = await requireStaff(["admin", "manager"]);
  const team = await db
    .select()
    .from(staff)
    .where(and(isNull(staff.removedAt), me.role === "manager" ? eq(staff.branchId, me.branchId!) : undefined))
    .orderBy(asc(staff.role), asc(staff.name));
  const past = me.role === "admin" ? await db.select().from(staff).where(isNotNull(staff.removedAt)).orderBy(asc(staff.name)) : [];
  const emailOn = Boolean(staffEmailFrom);
  const now = new Date();

  return (
    <div className="staff-page">
      <header className="staff-head">
        <h1>Team</h1>
        <p>{me.role === "admin" ? "Everyone at both branches" : `Your team at ${short(me.branchId)}`}</p>
      </header>

      {me.role === "admin" && (
        <section className="staff-card" aria-labelledby="add-title">
          <h2 id="add-title">Add someone</h2>
          <p className="staff-help">
            {emailOn
              ? <>We email them a personal setup link. It works for 7 days.</>
              : <>They&rsquo;ll set their own password at <b>/login/setup</b> using this email.</>}
          </p>
          <ActionForm action={addStaff} submit="Add to team" className="is-row">
            <label>Name<input name="name" autoComplete="off" required /></label>
            <label>Email<input name="email" type="email" autoComplete="off" required /></label>
            <label>Role
              <select name="role" defaultValue="employee">{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
            </label>
            <label>Branch
              <select name="branch" defaultValue="main">{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
            </label>
          </ActionForm>
        </section>
      )}

      <section className="staff-card" aria-labelledby="list-title">
        <h2 id="list-title">{team.length} {team.length === 1 ? "person" : "people"}</h2>
        <TeamFilter
          people={team.map((p) => ({
            id: p.id,
            text: `${p.name} ${p.email}`.toLowerCase(),
            tags: [p.branchId ?? "both", p.role, ...(!p.authUserId || (p.role !== "admin" && !p.pinHash) ? ["setup"] : []), ...(p.active ? [] : ["off"])],
          }))}
          filters={[
            { id: "all", label: "Everyone", count: team.length },
            ...(me.role === "admin" ? branches.map((b) => ({ id: b.id as string, label: short(b.id), count: team.filter((p) => p.branchId === b.id).length })) : []),
            { id: "manager", label: "Managers", count: team.filter((p) => p.role === "manager").length },
            { id: "rider", label: "Riders", count: team.filter((p) => p.role === "rider").length },
            { id: "setup", label: "Needs setup", count: team.filter((p) => !p.authUserId || (p.role !== "admin" && !p.pinHash)).length },
            { id: "off", label: "Deactivated", count: team.filter((p) => !p.active).length },
          ].filter((f) => f.id === "all" || f.count > 0)}
        >
          <ul className="team-list">
            {[...team].sort((a, b) => a.name.localeCompare(b.name)).map((p) => (
              <li key={p.id} data-person-id={p.id} className={p.active ? "team-row" : "team-row is-off"}>
                <span className="team-who">
                  <b>{p.name}</b>
                  <small>{p.email}{p.emailVerifiedAt && <> · <span className="team-verified">verified</span></>}</small>
                </span>
                <span className="team-meta">{ROLES.find((r) => r.value === p.role)!.label.replace(" (both branches)", "")} · {p.branchId ? short(p.branchId) : "Both branches"}</span>
                <span className="team-tags">
                  {!p.active ? (
                    <span className="tag is-off">Deactivated</span>
                  ) : p.authUserId ? (
                    <span className="tag is-ok">Active</span>
                  ) : (
                    (() => {
                      const t = inviteText(inviteState(p, now), p, emailOn);
                      return <span className={t.warn ? "tag is-warn" : "tag"}>{t.tag}</span>;
                    })()
                  )}
                  {p.pinHash ? <span className="team-pin">PIN set</span> : p.role !== "admin" && <span className="tag is-warn">No PIN yet</span>}
                </span>
                <span className="team-do">
                  {(me.role === "admin" || (p.pinHash && usesPin(p.role))) && (
                    <EditSheet label="Manage" title={p.name} subtitle={p.email}>
                      {me.role === "admin" && (
                        <ActionForm action={updateStaff} submit="Save" resetOnOk={false} closeOnOk>
                          <input type="hidden" name="id" value={p.id} />
                          <label>Role
                            <select name="role" defaultValue={p.role}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                          </label>
                          <label>Branch
                            <select name="branch" defaultValue={p.branchId ?? "main"}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                          </label>
                          <label className="staff-check"><input type="checkbox" name="active" defaultChecked={p.active} /> Can sign in and clock in</label>
                        </ActionForm>
                      )}
                      {me.role === "admin" && !p.authUserId && p.active && (
                        <InviteTools
                          id={p.id}
                          status={inviteText(inviteState(p, now), p, emailOn).line}
                          emailOn={emailOn}
                          hasLink={Boolean(p.inviteHash && p.inviteExpiresAt && p.inviteExpiresAt > now)}
                        />
                      )}
                      {p.pinHash && (me.role === "admin" || usesPin(p.role)) && (
                        <div className="edit-sheet-part">
                          <span><b>Clock-in PIN</b><small>Clears the PIN they use on the clock-in tablet.</small></span>
                          <ActionButton action={clearPin.bind(null, p.id)} label="Reset PIN" confirm={`Clear ${p.name}'s PIN?`} />
                        </div>
                      )}
                      {me.role === "admin" && p.role !== "admin" && p.id !== me.id && (
                        <div className="edit-sheet-part is-danger">
                          <span><b>Remove from team</b><small>They lose access at once; their hours stay.</small></span>
                          <ActionButton
                            action={removeStaff.bind(null, p.id)}
                            label="Remove"
                            confirm={`Remove ${p.name}? They lose access at once; their hours stay.`}
                          />
                        </div>
                      )}
                    </EditSheet>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </TeamFilter>
      </section>

      {past.length > 0 && (
        <details className="staff-card team-past">
          <summary>Past team members · {past.length}</summary>
          <p className="staff-help">
            Removed from the team: they can&rsquo;t sign in or clock in. Their hours stay in Hours, and their name stays on orders they
            handled. Restore someone who comes back to work.
          </p>
          <ul className="setup-list">
            {past.map((p) => (
              <li key={p.id}>
                <span>
                  <b>{p.name}</b>
                  <small>
                    {ROLES.find((r) => r.value === p.role)!.label} · {short(p.branchId)} · {p.email} · removed {manila.date(p.removedAt!)}
                  </small>
                </span>
                <ActionButton action={restoreStaff.bind(null, p.id)} label="Restore" />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
