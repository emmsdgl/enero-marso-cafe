import "server-only";
import { and, asc, count, eq, inArray } from "drizzle-orm";
import QRCode from "qrcode";
import { branches, db, paymentAccounts, type PaymentAccount, type Staff } from "@/db";
import { checkPaymentQr } from "./qrph";
import { readQrText } from "./qr-read";
import { audit, canActOnBranch } from "./staff";

/**
 * Where delivery customers pay: each branch's GCash, Maya or bank accounts. Managers (their
 * branch) and the admin add and change them; every change is logged, since a swapped QR would
 * send the cafe's money elsewhere.
 */
export const ACCOUNT_KINDS = { gcash: "GCash", maya: "Maya", bank: "Bank", other: "Other" } as const;
type Kind = keyof typeof ACCOUNT_KINDS;
type Fail = { ok: false; error: string };

export async function listPaymentAccounts(branchIds: string[], activeOnly = false): Promise<PaymentAccount[]> {
  if (branchIds.length === 0) return [];
  const where = activeOnly ? and(inArray(paymentAccounts.branchId, branchIds), eq(paymentAccounts.active, true)) : inArray(paymentAccounts.branchId, branchIds);
  return db.select().from(paymentAccounts).where(where).orderBy(asc(paymentAccounts.sort), asc(paymentAccounts.createdAt));
}

/** A crisp QR drawn from the stored code, in the cafe's ink on white (banks' scanners need the contrast) */
export function qrSvg(payload: string) {
  return QRCode.toString(payload, { type: "svg", margin: 2, errorCorrectionLevel: "M", color: { dark: "#151211", light: "#ffffff" } });
}

/** The account as customers see it, with its QR drawn */
export type PayAccount = { id: string; kind: Kind; label: string; accountName: string; accountNumber: string | null; qrSvg: string | null };
export async function toPayAccount(a: PaymentAccount): Promise<PayAccount> {
  return { id: a.id, kind: a.kind, label: a.label, accountName: a.accountName, accountNumber: a.accountNumber, qrSvg: a.qrPayload ? await qrSvg(a.qrPayload) : null };
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export type AccountInput = {
  id: string | null;
  branchId: string;
  kind: string;
  label: string;
  accountName: string;
  accountNumber: string;
  qrImage: File | null;
  removeQr: boolean;
};

/** Adds or edits an account. A new QR photo is read here; only the code's text is kept. */
export async function savePaymentAccount(me: Staff, input: AccountInput): Promise<{ ok: true; message: string } | Fail> {
  const existing = input.id ? (await db.select().from(paymentAccounts).where(eq(paymentAccounts.id, input.id)).limit(1))[0] : undefined;
  if (input.id && !existing) return { ok: false, error: "That account no longer exists." };
  const branchId = existing?.branchId ?? input.branchId;
  if (!canActOnBranch(me, branchId) || !(await db.select({ id: branches.id }).from(branches).where(eq(branches.id, branchId))).length) {
    return { ok: false, error: "You can't change that branch's accounts." };
  }
  if (!(input.kind in ACCOUNT_KINDS)) return { ok: false, error: "Choose GCash, Maya, Bank or Other." };
  const kind = input.kind as Kind;
  const label = input.label.trim() || ACCOUNT_KINDS[kind];
  const accountNumber = input.accountNumber.replace(/\s+/g, " ").trim() || null;
  if (label.length > 40) return { ok: false, error: "Keep the name of the account under 40 characters." };
  if (accountNumber && (accountNumber.length > 40 || !/^[0-9A-Za-z \-]+$/.test(accountNumber))) {
    return { ok: false, error: "The account number can only have letters, numbers, spaces and dashes." };
  }

  let qrPayload = input.removeQr ? null : (existing?.qrPayload ?? null);
  let qrName: string | null = null;
  if (input.qrImage && input.qrImage.size > 0) {
    if (input.qrImage.size > MAX_IMAGE_BYTES) return { ok: false, error: "That picture is too big. Use a screenshot or a smaller photo." };
    if (!input.qrImage.type.startsWith("image/")) return { ok: false, error: "Upload a picture (a photo or a screenshot) of the QR code." };
    const text = await readQrText(input.qrImage).catch(() => null);
    if (!text) return { ok: false, error: "We couldn't find a QR code in that picture. Try a screenshot of the QR from the GCash app, or a sharper, straight-on photo." };
    const checked = checkPaymentQr(text);
    if (!checked.ok) return checked;
    qrPayload = text;
    qrName = checked.name;
  }
  const accountName = input.accountName.trim() || qrName || "";
  if (accountName.length < 2 || accountName.length > 60) return { ok: false, error: "Enter the account name customers will see in their app, like Juan D." };
  if (!qrPayload && !accountNumber) return { ok: false, error: "Add a QR code, an account number, or both, so customers can pay." };

  const now = new Date();
  const values = { kind, label, accountName, accountNumber, qrPayload, updatedAt: now, updatedBy: me.id };
  if (existing) {
    await db.update(paymentAccounts).set(values).where(eq(paymentAccounts.id, existing.id));
  } else {
    const [{ n }] = await db.select({ n: count() }).from(paymentAccounts).where(eq(paymentAccounts.branchId, branchId));
    await db.insert(paymentAccounts).values({ ...values, branchId, sort: n });
  }
  // Keep before and after, so a swapped account can be traced
  await audit(me.id, existing ? "payment-account.edit" : "payment-account.add", {
    branchId, label, accountName, accountNumber, qrChanged: qrPayload !== (existing?.qrPayload ?? null),
    before: existing ? { label: existing.label, accountName: existing.accountName, accountNumber: existing.accountNumber, qr: existing.qrPayload } : null,
    qr: qrPayload,
  });
  return { ok: true, message: existing ? "Account saved." : "Account added. Customers see it when they pay for a delivery." };
}

/** Accounts are switched off, not deleted; delivery needs at least one that's on */
export async function setPaymentAccountActive(me: Staff, id: string, active: boolean): Promise<{ ok: true; message: string } | Fail> {
  const [a] = await db.select().from(paymentAccounts).where(eq(paymentAccounts.id, id)).limit(1);
  if (!a || !canActOnBranch(me, a.branchId)) return { ok: false, error: "That account isn't one you can change." };
  if (!active) {
    const [b] = await db.select({ deliveryOpen: branches.deliveryOpen }).from(branches).where(eq(branches.id, a.branchId));
    const [{ n }] = await db.select({ n: count() }).from(paymentAccounts).where(and(eq(paymentAccounts.branchId, a.branchId), eq(paymentAccounts.active, true)));
    if (b?.deliveryOpen && n <= 1) return { ok: false, error: "Delivery is on and this is the only account customers can pay. Add another account or pause delivery first." };
  }
  await db.update(paymentAccounts).set({ active, updatedAt: new Date(), updatedBy: me.id }).where(eq(paymentAccounts.id, a.id));
  await audit(me.id, active ? "payment-account.on" : "payment-account.off", { branchId: a.branchId, label: a.label });
  return { ok: true, message: active ? "Customers can pay to this account again." : "Customers no longer see this account." };
}
