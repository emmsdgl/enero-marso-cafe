import type { Metadata } from "next";
import { asc, inArray, isNull } from "drizzle-orm";
import { cookies } from "next/headers";
import ActionButton from "@/components/staff/ActionButton";
import EditSheet from "@/components/staff/EditSheet";
import { branchNetworks, db, kiosks, staff } from "@/db";
import { branches } from "@/data/branches";
import { listBlocked } from "@/lib/blocklist";
import { upcomingSpecialDays } from "@/lib/hours-store";
import { formatPhone } from "@/lib/pricing";
import { getOrderSettings } from "@/lib/orders";
import { listPaymentAccounts, qrSvg } from "@/lib/payments";
import { clientIp, hashKioskToken, KIOSK_COOKIE, manila, requireStaff } from "@/lib/staff";
import { unblockNumberAction } from "../orders/actions";
import {
  type AccountRow,
  BranchPinForm,
  ClockInTablet,
  ClockInWifi,
  CutoffForm,
  DeliveryAreaForm,
  deliveryMissing,
  deliverySummary,
  DeliverySwitch,
  HoursSummary,
  OrdersSwitch,
  PaymentAccounts,
  SpecialDayForm,
  SpecialDays,
  specialDayText,
  WeeklyHoursForm,
} from "./BranchParts";

export const metadata: Metadata = { title: "Branch setup" };

export default async function BranchSetupPage() {
  const me = await requireStaff(["admin", "manager"]);
  const mine = branches.filter((b) => me.role === "admin" || b.id === me.branchId);
  const ip = await clientIp();
  const token = (await cookies()).get(KIOSK_COOKIE)?.value;
  const thisDeviceHash = token ? hashKioskToken(token) : null;

  const [nets, tabs, orderSettings, accountList, special, blocked] = await Promise.all([
    db.select().from(branchNetworks).orderBy(asc(branchNetworks.createdAt)),
    db.select().from(kiosks).where(isNull(kiosks.revokedAt)).orderBy(asc(kiosks.createdAt)),
    getOrderSettings(),
    listPaymentAccounts(mine.map((b) => b.id)),
    upcomingSpecialDays(mine.map((b) => b.id)),
    listBlocked(),
  ]);
  const thisDevice = tabs.find((t) => t.tokenHash === thisDeviceHash);
  const editorIds = [...new Set(accountList.flatMap((a) => (a.updatedBy ? [a.updatedBy] : [])))];
  const editors = editorIds.length ? await db.select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, editorIds)) : [];
  const accounts: AccountRow[] = await Promise.all(
    accountList.map(async (a) => ({ ...a, qrSvg: a.qrPayload ? await qrSvg(a.qrPayload) : null, changedBy: editors.find((e) => e.id === a.updatedBy)?.name ?? null })),
  );

  return (
    <div className="staff-page">
      <header className="staff-head">
        <h1>Branch setup</h1>
        <p>Opening hours, online orders, delivery, and where staff are allowed to clock in</p>
      </header>

      {mine.map((b) => {
        const bNets = nets.filter((n) => n.branchId === b.id);
        const bTabs = tabs.filter((t) => t.branchId === b.id);
        const here = bNets.some((n) => n.ip === ip);
        return (
          <section key={b.id} className="staff-card branch-setup" aria-labelledby={`b-${b.id}`}>
            {(() => {
              const s = orderSettings[b.id];
              const acc = accounts.filter((a) => a.branchId === b.id);
              const missing = deliveryMissing(s.delivery, acc);
              const days = special[b.id] ?? [];
              const shown = acc.filter((a) => a.active);
              return (
                <>
                  <h2 id={`b-${b.id}`}>{b.name}</h2>
                  <ul className="branch-rows">
                    <li className="branch-row">
                      <div className="branch-row-text">
                        <h3>Opening hours</h3>
                        <HoursSummary schedule={s.schedule} />
                        <p className="branch-row-sub">{days.length ? `Next special day: ${specialDayText(days[0])}` : "No holidays or special days coming up"}</p>
                      </div>
                      <div className="branch-row-do">
                        <EditSheet label="Change opening hours" title="Opening hours" subtitle={b.name}>
                          <div className="branch-sheet"><WeeklyHoursForm branchId={b.id} schedule={s.schedule} inSheet /></div>
                        </EditSheet>
                        <EditSheet label="Holidays and special days" title="Holidays and special days" subtitle={b.name}>
                          <div className="branch-sheet">
                            <SpecialDays branchId={b.id} special={days} />
                            <h4>Add a day</h4>
                            <SpecialDayForm branchId={b.id} />
                          </div>
                        </EditSheet>
                      </div>
                    </li>
                    <li className="branch-row">
                      <div className="branch-row-text">
                        <h3>Online orders</h3>
                        <p className="branch-status"><span className={`dot${s.ordersOpen ? " is-on" : ""}`} aria-hidden="true" />{s.ordersOpen ? "Taking online orders" : "Paused: customers can’t order online"}</p>
                        <p className="branch-row-sub">Last order {s.cutoff === 60 ? "1 hour" : `${s.cutoff} minutes`} before closing</p>
                      </div>
                      <div className="branch-row-do">
                        <OrdersSwitch branchId={b.id} open={s.ordersOpen} />
                        <EditSheet label="Change last-order time" title="Last online order" subtitle={b.name}>
                          <div className="branch-sheet"><CutoffForm branchId={b.id} cutoff={s.cutoff} inSheet /></div>
                        </EditSheet>
                      </div>
                    </li>
                    <li className="branch-row">
                      <div className="branch-row-text">
                        <h3>Delivery</h3>
                        <p className="branch-status">
                          <span className={`dot${s.delivery.open ? " is-on" : ""}`} aria-hidden="true" />
                          {s.delivery.open ? "Delivering" : missing.length ? `Not delivering yet: ${missing.join(" and ")} first` : "Not delivering: pickup only"}
                        </p>
                        <p className="branch-row-sub">{deliverySummary(s.delivery)}</p>
                      </div>
                      <div className="branch-row-do">
                        <DeliverySwitch branchId={b.id} open={s.delivery.open} missing={missing} />
                        <EditSheet label="Change delivery area" title="Delivery area" subtitle={b.name}>
                          <div className="branch-sheet"><DeliveryAreaForm branchId={b.id} d={s.delivery} inSheet /></div>
                        </EditSheet>
                        <EditSheet label={s.delivery.store ? "Move the branch pin" : "Set the branch location"} title="Branch location" subtitle={b.name}>
                          <div className="branch-sheet"><BranchPinForm branchId={b.id} d={s.delivery} inSheet /></div>
                        </EditSheet>
                      </div>
                    </li>
                    <li className="branch-row">
                      <div className="branch-row-text">
                        <h3>Payment accounts</h3>
                        <p className="branch-row-sub">{shown.length ? `Customers see: ${shown.map((a) => a.label).join(", ")}` : "None yet: delivery customers have nowhere to pay"}</p>
                      </div>
                      <div className="branch-row-do">
                        <EditSheet label="Manage payment accounts" title="Payment accounts" subtitle={b.name}>
                          <div className="branch-sheet"><PaymentAccounts branchId={b.id} accounts={acc} /></div>
                        </EditSheet>
                      </div>
                    </li>
                    <li className="branch-row">
                      <div className="branch-row-text">
                        <h3>Clock-in</h3>
                        <p className="branch-row-sub">
                          {bNets.length ? `Phones: ${bNets.length === 1 ? "1 Wi-Fi" : `${bNets.length} Wi-Fi connections`} set up` : "Phones: no Wi-Fi set up"}
                          {" · "}
                          {bTabs.length ? `Tablet: ${bTabs.length === 1 ? "set up" : `${bTabs.length} set up`}` : "Tablet: not set up"}
                        </p>
                      </div>
                      <div className="branch-row-do">
                        <EditSheet label={bNets.length ? "Manage Wi-Fi" : "Set up Wi-Fi"} title="Clock-in from phones" subtitle={b.name}>
                          <div className="branch-sheet"><ClockInWifi branchId={b.id} nets={bNets} here={here} /></div>
                        </EditSheet>
                        <EditSheet label={bTabs.length ? "Manage tablet" : "Set up the tablet"} title="Clock-in tablet" subtitle={b.name}>
                          <div className="branch-sheet"><ClockInTablet branchId={b.id} tabs={bTabs} thisDevice={thisDevice} /></div>
                        </EditSheet>
                      </div>
                    </li>
                  </ul>
                </>
              );
            })()}
          </section>
        );
      })}

      <section className="staff-card" aria-labelledby="blocked-title">
        <h2 id="blocked-title">Blocked numbers</h2>
        <p className="staff-help">These numbers can&rsquo;t order online at either branch. Block a number from its order&rsquo;s page.</p>
        {blocked.length === 0 ? (
          <p className="staff-empty">No blocked numbers.</p>
        ) : (
          <ul className="setup-list">
            {blocked.map((b) => (
              <li key={b.phone}>
                <span><b>{formatPhone(b.phone)}</b><small>{b.reason} · {manila.date(b.createdAt)}{b.by && ` by ${b.by}`}</small></span>
                <ActionButton action={unblockNumberAction.bind(null, b.phone)} label="Unblock" confirm="Let this number order online again?" />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

