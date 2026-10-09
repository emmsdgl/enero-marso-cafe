import type { Metadata } from "next";
import Link from "next/link";
import { asc, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import ActionButton from "@/components/staff/ActionButton";
import ActionForm from "@/components/staff/ActionForm";
import { branchNetworks, db, kiosks } from "@/db";
import { branches } from "@/data/branches";
import { getOrderSettings } from "@/lib/orders";
import { clientIp, hashKioskToken, KIOSK_COOKIE, manila, requireStaff } from "@/lib/staff";
import { registerKiosk, registerNetwork, removeNetwork, revokeKiosk, saveOrderCutoff, setOrdersOpen } from "../actions";

export const metadata: Metadata = { title: "Branch setup" };

export default async function BranchSetupPage() {
  const me = await requireStaff(["admin", "manager"]);
  const mine = branches.filter((b) => me.role === "admin" || b.id === me.branchId);
  const ip = await clientIp();
  const token = (await cookies()).get(KIOSK_COOKIE)?.value;
  const thisDeviceHash = token ? hashKioskToken(token) : null;

  const [nets, tabs, orderSettings] = await Promise.all([
    db.select().from(branchNetworks).orderBy(asc(branchNetworks.createdAt)),
    db.select().from(kiosks).where(isNull(kiosks.revokedAt)).orderBy(asc(kiosks.createdAt)),
    getOrderSettings(),
  ]);
  const thisDevice = tabs.find((t) => t.tokenHash === thisDeviceHash);

  return (
    <div className="staff-page">
      <header className="staff-head">
        <h1>Branch setup</h1>
        <p>Online orders, and where staff are allowed to clock in</p>
      </header>

      {mine.map((b) => {
        const bNets = nets.filter((n) => n.branchId === b.id);
        const bTabs = tabs.filter((t) => t.branchId === b.id);
        const here = bNets.some((n) => n.ip === ip);
        return (
          <section key={b.id} className="staff-card branch-setup" aria-labelledby={`b-${b.id}`}>
            <h2 id={`b-${b.id}`}>{b.name}</h2>
            <div className="orders-setup">
              <h3>Online orders</h3>
              {orderSettings[b.id].ordersOpen ? (
                <p className="staff-note is-ok">Taking online orders. Pause them on a night you can&rsquo;t keep up; the order page tells customers right away.</p>
              ) : (
                <p className="staff-note is-warn">Not taking online orders. Customers see this branch as unavailable on the order page.</p>
              )}
              <div className="orders-setup-row">
                <ActionButton
                  action={setOrdersOpen.bind(null, b.id, !orderSettings[b.id].ordersOpen)}
                  label={orderSettings[b.id].ordersOpen ? "Pause online orders" : "Start taking online orders"}
                  confirm={orderSettings[b.id].ordersOpen ? "Pause online orders?" : undefined}
                />
                <ActionForm action={saveOrderCutoff} submit="Save" className="is-row" resetOnOk={false}>
                  <input type="hidden" name="branch" value={b.id} />
                  <label>
                    Last online order
                    <select name="cutoff" defaultValue={orderSettings[b.id].cutoff}>
                      <option value={30}>30 minutes before closing</option>
                      <option value={45}>45 minutes before closing</option>
                      <option value={60}>1 hour before closing</option>
                    </select>
                  </label>
                </ActionForm>
              </div>
            </div>
            <div className="staff-grid">
              <div>
                <h3>Branch Wi-Fi</h3>
                <p className="staff-help">
                  Staff can clock in from their own phone only while on a connection listed here. Register it while you&rsquo;re at the
                  branch, connected to its Wi-Fi. If the internet provider changes the address, phones stop clocking in until you
                  register it again; the tablet keeps working.
                </p>
                {bNets.length === 0 ? (
                  <p className="staff-empty">No Wi-Fi registered yet.</p>
                ) : (
                  <ul className="setup-list">
                    {bNets.map((n) => (
                      <li key={n.id}>
                        <span><b>{n.label}</b><small>{n.ip} · added {manila.date(n.createdAt)}</small></span>
                        <ActionButton action={removeNetwork.bind(null, n.id)} label="Remove" confirm="Remove this Wi-Fi?" />
                      </li>
                    ))}
                  </ul>
                )}
                {here ? (
                  <p className="staff-note is-ok">You&rsquo;re on this branch&rsquo;s registered Wi-Fi right now.</p>
                ) : (
                  <ActionForm action={registerNetwork} submit="Register the connection I'm on" className="is-row">
                    <input type="hidden" name="branch" value={b.id} />
                    <label>Name it<input name="label" defaultValue="Cafe Wi-Fi" /></label>
                    <small className="staff-help">This device&rsquo;s connection: {ip}</small>
                  </ActionForm>
                )}
              </div>

              <div>
                <h3>Clock-in tablet</h3>
                <p className="staff-help">
                  The tablet at the counter. Staff tap their name and type their PIN. Register it on the tablet itself, then open{" "}
                  <b>/kiosk</b> and leave it there.
                </p>
                {bTabs.length === 0 ? (
                  <p className="staff-empty">No tablet registered yet.</p>
                ) : (
                  <ul className="setup-list">
                    {bTabs.map((t) => (
                      <li key={t.id}>
                        <span><b>{t.label}{t.id === thisDevice?.id && " (this device)"}</b><small>added {manila.date(t.createdAt)}</small></span>
                        <ActionButton action={revokeKiosk.bind(null, t.id)} label="Remove" confirm="Stop this tablet clocking people in?" />
                      </li>
                    ))}
                  </ul>
                )}
                {thisDevice?.branchId === b.id ? (
                  <p className="staff-note is-ok">This device is a clock-in tablet. <Link href="/kiosk">Open the clock-in screen</Link></p>
                ) : (
                  <ActionForm action={registerKiosk} submit="Make this device the clock-in tablet" className="is-row">
                    <input type="hidden" name="branch" value={b.id} />
                    <label>Name it<input name="label" defaultValue="Counter tablet" /></label>
                  </ActionForm>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}

