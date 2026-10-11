/**
 * QR Ph payment codes (the EMVCo format inside GCash, Maya and bank "receive money" QRs).
 * A code is a chain of fields: 2-digit id, 2-digit length, value; it ends with a checksum.
 * We keep the code's text, check it here, and draw a fresh QR from it for customers.
 */
export type EmvField = { id: string; value: string };

/** Splits a payload into fields; null if the lengths don't add up */
export function parseEmv(s: string): EmvField[] | null {
  const out: EmvField[] = [];
  let i = 0;
  while (i < s.length) {
    const id = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(s.slice(i + 2, i + 4)) || i + 4 + len > s.length) return null;
    out.push({ id, value: s.slice(i + 4, i + 4 + len) });
    i += 4 + len;
  }
  return out;
}

/** CRC-16/CCITT-FALSE over the payload up to and including "6304", as EMVCo specifies */
export function crc16(s: string) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(s)) {
    crc ^= byte << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const NETWORKS: Record<string, string> = {
  "com.p2pqrpay": "InstaPay",
  "ph.ppmi.p2m": "QR Ph",
  "ph.ppmi.qrph": "QR Ph",
};

export type PaymentQr = { ok: true; name: string | null; network: string | null } | { ok: false; error: string };

/** Is this the text of a peso payment QR that any GCash, Maya or bank app can pay? */
export function checkPaymentQr(payload: string): PaymentQr {
  const notPayment = { ok: false as const, error: "That QR code isn't a payment code. Upload the QR from the GCash (or bank) app's Receive money screen." };
  if (payload.length > 512 || !payload.startsWith("000201")) return notPayment;
  const fields = parseEmv(payload);
  if (!fields) return notPayment;
  const last = fields.at(-1);
  if (last?.id !== "63" || last.value.length !== 4 || crc16(payload.slice(0, -4)) !== last.value.toUpperCase()) {
    return { ok: false, error: "The QR code didn't read cleanly. Try a sharper photo, or a screenshot from the app." };
  }
  const currency = fields.find((f) => f.id === "53")?.value;
  if (currency && currency !== "608") return { ok: false, error: "That QR code isn't for pesos." };
  const account = fields.find((f) => Number(f.id) >= 26 && Number(f.id) <= 51);
  if (!account) return notPayment;
  const guid = parseEmv(account.value)?.find((f) => f.id === "00")?.value ?? null;
  return { ok: true, name: fields.find((f) => f.id === "59")?.value ?? null, network: guid ? (NETWORKS[guid] ?? null) : null };
}
