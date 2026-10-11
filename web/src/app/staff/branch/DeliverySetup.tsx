import ActionButton from "@/components/staff/ActionButton";
import ActionForm from "@/components/staff/ActionForm";
import QrImageInput from "@/components/staff/QrImageInput";
import StorePinField from "@/components/staff/StorePinField";
import type { PaymentAccount } from "@/db";
import { FREE_DELIVERY_OPTIONS, formatDistance, MAX_DELIVERY_OPTIONS, MIN_ORDER_OPTIONS } from "@/lib/delivery";
import { peso } from "@/lib/menu";
import type { BranchOrderSettings } from "@/lib/orders";
import { ACCOUNT_KINDS } from "@/lib/payments";
import { manila } from "@/lib/staff";
import { saveDeliveryRules, savePaymentAccountAction, saveStorePin, setDeliveryOpen, setPaymentAccountActiveAction } from "../actions";

export type AccountRow = PaymentAccount & { qrSvg: string | null; changedBy: string | null };

/** Staff > Branch > Delivery: the switch, the branch's pin, the rules, and where customers pay */
export default function DeliverySetup({ branchId, settings, accounts }: { branchId: string; settings: BranchOrderSettings; accounts: AccountRow[] }) {
  const d = settings.delivery;
  const active = accounts.filter((a) => a.active);
  const missing = [!d.store && "save the branch location", active.length === 0 && "add a payment account"].filter(Boolean);

  return (
    <div className="delivery-setup">
      <h3>Delivery</h3>
      {d.open ? (
        <p className="staff-note is-ok">
          Delivering {d.freeWithin ? `(free within ${formatDistance(d.freeWithin)}, ` : "("}up to {formatDistance(d.maxDistance)}). Customers see the delivery option on the order page.
        </p>
      ) : (
        <p className="staff-note is-warn">
          Not delivering. {missing.length ? `To switch it on, ${missing.join(" and ")}.` : "Customers can only order for pickup."}
        </p>
      )}
      <div className="orders-setup-row">
        {(d.open || missing.length === 0) && (
          <ActionButton
            action={setDeliveryOpen.bind(null, branchId, !d.open)}
            label={d.open ? "Pause delivery" : "Start delivering"}
            confirm={d.open ? "Pause delivery? Orders already placed carry on." : undefined}
          />
        )}
      </div>

      <div className="staff-grid">
        <div>
          <h4>Branch location</h4>
          <p className="staff-help">Delivery distances are measured from this pin. Drag it onto the cafe, or stand in the cafe and use your location.</p>
          <ActionForm action={saveStorePin} submit="Save location" resetOnOk={false}>
            <input type="hidden" name="branch" value={branchId} />
            <StorePinField initial={d.store} freeRadius={d.freeWithin} />
          </ActionForm>
        </div>

        <div>
          <h4>Delivery rules</h4>
          <ActionForm action={saveDeliveryRules} submit="Save rules" resetOnOk={false}>
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
              Minimum order for delivery
              <select name="min" defaultValue={d.minOrder}>
                {MIN_ORDER_OPTIONS.map((p) => <option key={p} value={p}>{p ? peso(p) : "No minimum"}</option>)}
              </select>
            </label>
            <p className="staff-help">
              Staff confirm every delivery fee before the customer pays. Inside the free area the fee starts at ₱0, and staff can still add one if the rider charges.
            </p>
          </ActionForm>
        </div>
      </div>

      <div className="pay-setup">
        <h4>Payment accounts</h4>
        <p className="staff-help">
          Where delivery customers pay. They see these after staff confirm their order and fee. Every change is logged, with who made it.
        </p>
        {accounts.length === 0 ? (
          <p className="staff-empty">No payment accounts yet.</p>
        ) : (
          <ul className="pay-accounts">
            {accounts.map((a) => (
              <li key={a.id} className={a.active ? undefined : "is-off"}>
                <div className="pay-accounts-qr" aria-hidden="true">
                  {a.qrSvg ? <span dangerouslySetInnerHTML={{ __html: a.qrSvg }} /> : <span className="pay-accounts-noqr">No QR</span>}
                </div>
                <div className="pay-accounts-info">
                  <span className="pay-accounts-title">
                    <b>{a.label}</b> <span className={`tag${a.active ? " is-ok" : " is-off"}`}>{a.active ? "Customers see it" : "Off"}</span>
                  </span>
                  <small>{a.accountName}{a.accountNumber && ` · ${a.accountNumber}`}</small>
                  <small>Changed {manila.date(a.updatedAt)}{a.changedBy && ` by ${a.changedBy}`}</small>
                </div>
                <div className="staff-actions">
                  <details className="staff-edit">
                    <summary>Edit</summary>
                    <ActionForm action={savePaymentAccountAction} submit="Save account" resetOnOk={false}>
                      <AccountFields branchId={branchId} account={a} />
                    </ActionForm>
                  </details>
                  <ActionButton
                    action={setPaymentAccountActiveAction.bind(null, a.id, !a.active)}
                    label={a.active ? "Switch off" : "Switch on"}
                    confirm={a.active ? "Hide this account from customers?" : undefined}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <details className="staff-edit pay-add">
          <summary>Add a payment account</summary>
          <ActionForm action={savePaymentAccountAction} submit="Add account">
            <AccountFields branchId={branchId} />
          </ActionForm>
        </details>
      </div>
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
        Name it <small>what customers see, like &ldquo;GCash&rdquo; or &ldquo;BPI savings&rdquo;</small>
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
