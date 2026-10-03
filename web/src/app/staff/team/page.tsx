import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import ActionForm from "@/components/staff/ActionForm";
import ActionButton from "@/components/staff/ActionButton";
import { db, staff } from "@/db";
import { branches } from "@/data/branches";
import { requireStaff } from "@/lib/staff";
import { addStaff, clearPin, updateStaff } from "../actions";

export const metadata: Metadata = { title: "Team" };

const ROLES = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Branch manager" },
  { value: "admin", label: "Admin (both branches)" },
];
const short = (id: string | null) => (id ? branches.find((b) => b.id === id)!.name.replace("Enero Marso ", "") : "Both");

export default async function TeamPage() {
  const me = await requireStaff(["admin", "manager"]);
  const team = await db
    .select()
    .from(staff)
    .where(me.role === "manager" ? eq(staff.branchId, me.branchId!) : undefined)
    .orderBy(asc(staff.role), asc(staff.name));

  return (
    <div className="staff-page">
      <header className="staff-head">
        <h1>Team</h1>
        <p>{me.role === "admin" ? "Everyone at both branches" : `Your team at ${short(me.branchId)}`}</p>
      </header>

      {me.role === "admin" && (
        <section className="staff-card" aria-labelledby="add-title">
          <h2 id="add-title">Add someone</h2>
          <p className="staff-help">They&rsquo;ll set their own password at <b>/login/setup</b> using this email.</p>
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
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Branch</th>
                <th scope="col">Account</th>
                <th scope="col">PIN</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {team.map((p) => (
                <tr key={p.id} className={p.active ? "" : "is-off"}>
                  <th scope="row"><b>{p.name}</b><small>{p.email}</small></th>
                  <td>{ROLES.find((r) => r.value === p.role)!.label.replace(" (both branches)", "")}</td>
                  <td>{short(p.branchId)}</td>
                  <td>{!p.active ? <span className="tag is-off">Deactivated</span> : p.authUserId ? <span className="tag is-ok">Active</span> : <span className="tag">Invited</span>}</td>
                  <td>{p.pinHash ? "Set" : "—"}</td>
                  <td className="staff-actions">
                    {me.role === "admin" && (
                      <details className="staff-edit">
                        <summary>Edit</summary>
                        <ActionForm action={updateStaff} submit="Save" resetOnOk={false}>
                          <input type="hidden" name="id" value={p.id} />
                          <label>Role
                            <select name="role" defaultValue={p.role}>{ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}</select>
                          </label>
                          <label>Branch
                            <select name="branch" defaultValue={p.branchId ?? "main"}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
                          </label>
                          <label className="staff-check"><input type="checkbox" name="active" defaultChecked={p.active} /> Can sign in and clock in</label>
                        </ActionForm>
                      </details>
                    )}
                    {p.pinHash && (me.role === "admin" || p.role === "employee") && (
                      <ActionButton action={clearPin.bind(null, p.id)} label="Reset PIN" confirm={`Clear ${p.name}'s PIN?`} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
