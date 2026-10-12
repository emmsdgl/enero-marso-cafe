import Link from "next/link";
import ActionButton from "@/components/staff/ActionButton";
import ActionForm from "@/components/staff/ActionForm";
import EditSheet from "@/components/staff/EditSheet";
import QrImageInput from "@/components/staff/QrImageInput";
import StorePinField from "@/components/staff/StorePinField";
import type { PaymentAccount } from "@/db";
import { FREE_DELIVERY_OPTIONS, formatDistance, MAX_DELIVERY_OPTIONS, MIN_ORDER_OPTIONS, type DeliverySettings } from "@/lib/delivery";
import { DAY_NAMES, describeWeek, formatWindow, manilaClock, shiftDate, toTimeInput, WEEK_ORDER, type Schedule } from "@/lib/hours";
import type { SpecialDay } from "@/lib/hours-store";
import { peso } from "@/lib/menu";
import { ACCOUNT_KINDS } from "@/lib/payments";
import { manila } from "@/lib/staff";
import {
  registerKiosk,
  registerNetwork,
  removeNetwork,
  removeSpecialDayAction,
  revokeKiosk,
  saveDeliveryRules,
  saveOrderCutoff,
  savePaymentAccountAction,
  saveSpecialDayAction,
  saveStorePin,
  saveWeeklyHours,
  setDeliveryOpen,
  setOrdersOpen,
  setPaymentAccountActiveAction,
} from "../actions";

export type AccountRow = PaymentAccount & { qrSvg: string | null; changedBy: string | null };

// Staff > Branch, in plain words: each part says what it does, and every button says what happens when you press it.
// `inSheet` parts close their panel after a successful save.

const dayLabel = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

export const specialDayText = (s: SpecialDay) => `${s.day === manilaClock().date ? "Today" : dayLabel(s.day)}: ${formatWindow(s.window)}${s.note ? ` (${s.note})` : ""}`;

export const deliverySummary = (d: DeliverySettings) =>
  [`Up to ${formatDistance(d.maxDistance)}`, d.freeWithin ? `free within ${formatDistance(d.freeWithin)}` : "no free delivery", d.minOrder ? `${peso(d.minOrder)} minimum` : "no minimum"].join(" · ");

/** What still stands between this branch and delivering */
export const deliveryMissing = (d: DeliverySettings, accounts: AccountRow[]) =>
  [!d.store && "save the branch location", !accounts.some((a) => a.active) && "add a payment account"].filter((x): x is string => Boolean(x));

export function HoursSummary({ schedule }: { schedule: Schedule }) {
  return (
    <p className="hours-now">
      {describeWeek(schedule.week).map((r) => (
        <span key={r.days}><b>{r.days}</b> {r.time}</span>
      ))}
    </p>
  );
}

export function WeeklyHoursForm({ branchId, schedule, inSheet = false }: { branchId: string; schedule: Schedule; inSheet?: boolean }) {
  return (
    <ActionForm action={saveWeeklyHours} submit="Save opening hours" resetOnOk={false} closeOnOk={inSheet}>
      <input type="hidden" name="branch" value={branchId} />
      <p className="staff-help">Closing after midnight? Just pick the time, like 1:00 AM. It counts as the same night.</p>
      <table className="hours-table">
        <thead>
          <tr><th scope="col">Day</th><th scope="col">Opens</th><th scope="col">Closes</th><th scope="col"><span className="sr-only">Closed</span></th></tr>
        </thead>
        <tbody>
          {WEEK_ORDER.map((d) => {
            const w = schedule.week[d];
            return (
              <tr key={d}>
                <th scope="row">{DAY_NAMES[d]}</th>
                <td className="hours-open" data-label="Opens"><input type="time" name={`open-${d}`} defaultValue={w ? toTimeInput(w.open) : ""} aria-label={`${DAY_NAMES[d]} opens`} /></td>
                <td className="hours-close" data-label="Closes"><input type="time" name={`close-${d}`} defaultValue={w ? toTimeInput(w.close) : ""} aria-label={`${DAY_NAMES[d]} closes`} /></td>
                <td className="hours-off"><label className="staff-check hours-closed"><input type="checkbox" name={`closed-${d}`} defaultChecked={!w} /> Closed</label></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ActionForm>
  );
}

export function SpecialDays({ branchId, special }: { branchId: string; special: SpecialDay[] }) {
  if (special.length === 0) return <p className="staff-empty">No holidays or special days coming up.</p>;
  return (
    <ul className="setup-list">
      {special.map((s) => (
        <li key={s.day}>
          <span>
            <b>{s.day === manilaClock().date ? "Today" : dayLabel(s.day)}</b>
            <small>{formatWindow(s.window)}{s.note && ` · ${s.note}`}</small>
          </span>
          <ActionButton action={removeSpecialDayAction.bind(null, branchId, s.day)} label="Use usual hours" confirm="Go back to the usual hours that day?" />
        </li>
      ))}
    </ul>
  );
}

export function SpecialDayForm({ branchId }: { branchId: string }) {
  const today = manilaClock().date;
  return (
    <ActionForm action={saveSpecialDayAction} submit="Save this day">
      <input type="hidden" name="branch" value={branchId} />
      <label>Date<input type="date" name="day" min={today} max={shiftDate(today, 366)} required /></label>
      <label className="staff-check"><input type="checkbox" name="closed" defaultChecked /> Closed all day</label>
      <div className="hours-pair">
        <label>Opens <small>if open that day</small><input type="time" name="open" /></label>
        <label>Closes<input type="time" name="close" /></label>
      </div>
      <label>Note <small>optional, like &ldquo;Christmas Day&rdquo;</small><input name="note" maxLength={60} /></label>
      <p className="staff-help">The website shows it to customers three weeks ahead.</p>
    </ActionForm>
  );
}

export function OrdersSwitch({ branchId, open }: { branchId: string; open: boolean }) {
  return (
    <ActionButton
      action={setOrdersOpen.bind(null, branchId, !open)}
      label={open ? "Pause online orders" : "Start taking online orders"}
      confirm={open ? "Pause online orders? Customers can’t order until you start them again." : undefined}
    />
  );
}

export function CutoffForm({ branchId, cutoff, inSheet = false }: { branchId: string; cutoff: number; inSheet?: boolean }) {
  return (
    <ActionForm action={saveOrderCutoff} submit="Save" className="is-row" resetOnOk={false} closeOnOk={inSheet}>
      <input type="hidden" name="branch" value={branchId} />
      <label>
        Last online order
        <select name="cutoff" defaultValue={cutoff}>
          <option value={30}>30 minutes before closing</option>
          <option value={45}>45 minutes before closing</option>
          <option value={60}>1 hour before closing</option>
        </select>
      </label>
    </ActionForm>
  );
}

export function DeliverySwitch({ branchId, open, missing }: { branchId: string; open: boolean; missing: string[] }) {
  if (!open && missing.length) return null;
  return (
    <ActionButton
      action={setDeliveryOpen.bind(null, branchId, !open)}
      label={open ? "Pause delivery" : "Start delivering"}
      confirm={open ? "Pause delivery? Orders already placed carry on." : undefined}
    />
  );
}

export function DeliveryAreaForm({ branchId, d, inSheet = false }: { branchId: string; d: DeliverySettings; inSheet?: boolean }) {
  return (
    <ActionForm action={saveDeliveryRules} submit="Save delivery area" resetOnOk={false} closeOnOk={inSheet}>
      <input type="hidden" name="branch" value={branchId} />
      <label>
        Free delivery within
        <select name="free" defaultValue={d.freeWithin}>
          {FREE_DELIVERY_OPTIONS.map((m) => <option key={m} value={m}>{m ? formatDistance(m) : "No free delivery"}</option>)}
        </select>
      </label>
      <label>
        Deliver up to
        <select name="max" defaultValue={d.maxDistance}>
          {MAX_DELIVERY_OPTIONS.map((m) => <option key={m} value={m}>{formatDistance(m)} from the branch</option>)}
        </select>
      </label>
      <label>
        Smallest order we deliver
        <select name="min" defaultValue={d.minOrder}>
          {MIN_ORDER_OPTIONS.map((p) => <option key={p} value={p}>{p ? peso(p) : "Any amount"}</option>)}
        </select>
      </label>
      <p className="staff-help">Staff confirm every delivery fee before the customer pays, and can add one inside the free area if the rider charges.</p>
    </ActionForm>
  );
}

export function BranchPinForm({ branchId, d, inSheet = false }: { branchId: string; d: DeliverySettings; inSheet?: boolean }) {
  return (
    <ActionForm action={saveStorePin} submit="Save this location" resetOnOk={false} closeOnOk={inSheet}>
      <input type="hidden" name="branch" value={branchId} />
      <p className="staff-help">Delivery distances are measured from this pin. Drag it onto the cafe, or stand in the cafe and use your location.</p>
      <StorePinField initial={d.store} freeRadius={d.freeWithin} />
    </ActionForm>
  );
}

export function PaymentAccounts({ branchId, accounts }: { branchId: string; accounts: AccountRow[] }) {
  return (
    <div className="pay-setup">
      <p className="staff-help">Where delivery customers pay. They see these after staff confirm the order and fee. Every change is logged with who made it.</p>
      {accounts.length === 0 ? (
        <p className="staff-empty">No payment accounts yet. Add one so delivery customers can pay.</p>
      ) : (
        <ul className="pay-accounts">
          {accounts.map((a) => (
            <li key={a.id} className={a.active ? undefined : "is-off"}>
              <div className="pay-accounts-qr" aria-hidden="true">
                {a.qrSvg ? <span dangerouslySetInnerHTML={{ __html: a.qrSvg }} /> : <span className="pay-accounts-noqr">No QR</span>}
              </div>
              <div className="pay-accounts-info">
                <span className="pay-accounts-title">
                  <b>{a.label}</b> <span className={`tag${a.active ? " is-ok" : " is-off"}`}>{a.active ? "Customers see it" : "Hidden"}</span>
                </span>
                <small>{a.accountName}{a.accountNumber && ` · ${a.accountNumber}`}</small>
                <small>Changed {manila.date(a.updatedAt)}{a.changedBy && ` by ${a.changedBy}`}</small>
              </div>
              <div className="staff-actions">
                <EditSheet label="Change details" title={a.label} subtitle={ACCOUNT_KINDS[a.kind as keyof typeof ACCOUNT_KINDS]}>
                  <ActionForm action={savePaymentAccountAction} submit="Save account" resetOnOk={false} closeOnOk>
                    <AccountFields branchId={branchId} account={a} />
                  </ActionForm>
                </EditSheet>
                <ActionButton
                  action={setPaymentAccountActiveAction.bind(null, a.id, !a.active)}
                  label={a.active ? "Hide from customers" : "Show to customers"}
                  confirm={a.active ? "Hide this account from customers?" : undefined}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <EditSheet label="Add GCash or bank account" title="New payment account" subtitle="Where delivery customers pay">
        <ActionForm action={savePaymentAccountAction} submit="Add account" closeOnOk>
          <AccountFields branchId={branchId} />
        </ActionForm>
      </EditSheet>
    </div>
  );
}

function AccountFields({ branchId, account: a }: { branchId: string; account?: AccountRow }) {
  return (
    <>
      <input type="hidden" name="branch" value={branchId} />
      {a && <input type="hidden" name="id" value={a.id} />}
      <label>
        Type
        <select name="kind" defaultValue={a?.kind ?? "gcash"}>
          {Object.entries(ACCOUNT_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      <label>
        Name customers see <small>like &ldquo;GCash&rdquo; or &ldquo;BPI savings&rdquo;</small>
        <input name="label" defaultValue={a?.label ?? ""} placeholder="GCash" maxLength={40} />
      </label>
      <label>
        Account name <small>as the app shows it when paying</small>
        <input name="accountName" defaultValue={a?.accountName ?? ""} placeholder="Juan D." maxLength={60} />
      </label>
      <label>
        Number <small>optional if there&rsquo;s a QR code</small>
        <input name="accountNumber" defaultValue={a?.accountNumber ?? ""} placeholder="0917 123 4567" maxLength={40} />
      </label>
      <QrImageInput hasQr={Boolean(a?.qrPayload)} />
      {a?.qrPayload && (
        <label className="staff-check">
          <input type="checkbox" name="removeQr" /> Remove the QR code
        </label>
      )}
    </>
  );
}

type Network = { id: string; label: string; ip: string; createdAt: Date };
type Tablet = { id: string; label: string; createdAt: Date };

export function ClockInWifi({ branchId, nets, here }: { branchId: string; nets: Network[]; here: boolean }) {
  return (
    <>
      <p className="staff-help">Staff can clock in from their own phones only while on the branch Wi-Fi. Set it up once, at the branch, connected to its Wi-Fi.</p>
      {nets.length === 0 ? (
        <p className="staff-empty">No Wi-Fi set up yet.</p>
      ) : (
        <ul className="setup-list">
          {nets.map((n) => (
            <li key={n.id}>
              <span><b>{n.label}</b><small>Added {manila.date(n.createdAt)} · address {n.ip}</small></span>
              <ActionButton action={removeNetwork.bind(null, n.id)} label="Remove" confirm="Stop phones on this Wi-Fi from clocking in?" />
            </li>
          ))}
        </ul>
      )}
      {here ? (
        <p className="staff-note is-ok">You&rsquo;re on this branch&rsquo;s Wi-Fi right now.</p>
      ) : (
        <ActionForm action={registerNetwork} submit="Use this Wi-Fi for clock-in" className="is-row">
          <input type="hidden" name="branch" value={branchId} />
          <label>Name it<input name="label" defaultValue="Cafe Wi-Fi" /></label>
          <small className="staff-help">If phones stop clocking in after the internet provider changes something, do this again at the branch.</small>
        </ActionForm>
      )}
    </>
  );
}

export function ClockInTablet({ branchId, tabs, thisDevice }: { branchId: string; tabs: Tablet[]; thisDevice: { id: string; branchId: string } | undefined }) {
  return (
    <>
      <p className="staff-help">The tablet at the counter, where staff tap their name and type their PIN. Set it up on the tablet itself.</p>
      {tabs.length === 0 ? (
        <p className="staff-empty">No tablet set up yet.</p>
      ) : (
        <ul className="setup-list">
          {tabs.map((t) => (
            <li key={t.id}>
              <span><b>{t.label}{t.id === thisDevice?.id && " (this device)"}</b><small>Added {manila.date(t.createdAt)}</small></span>
              <ActionButton action={revokeKiosk.bind(null, t.id)} label="Remove" confirm="Stop this tablet clocking people in?" />
            </li>
          ))}
        </ul>
      )}
      {thisDevice?.branchId === branchId ? (
        <p className="staff-note is-ok">This device is the clock-in tablet. <Link href="/kiosk">Open the clock-in screen</Link></p>
      ) : (
        <ActionForm action={registerKiosk} submit="Use this device as the clock-in tablet" className="is-row">
          <input type="hidden" name="branch" value={branchId} />
          <label>Name it<input name="label" defaultValue="Counter tablet" /></label>
        </ActionForm>
      )}
    </>
  );
}
