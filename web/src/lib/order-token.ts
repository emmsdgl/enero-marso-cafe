import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/**
 * The customer's key to their order page and chat. It only ever exists in the customer's link;
 * the database keeps its SHA-256, so a leaked database can't open anyone's order.
 */
export function newOrderToken() {
  return randomBytes(32).toString("base64url");
}

export function hashOrderToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function tokenMatches(token: string | null | undefined, storedHash: string) {
  if (!token || token.length > 128) return false;
  const a = Buffer.from(hashOrderToken(token), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

// No 0/O, 1/I/L, 5/S or 8/B, so a code read out over the phone can't be misheard
const CODE_CHARS = "234679ACDEFGHJKMNPQRTUVWXYZ";

/** Short order code staff and customers say out loud, e.g. "EM-7KQ4P2". Not a secret. */
export function newOrderCode() {
  let code = "";
  for (let i = 0; i < 6; i++) code += CODE_CHARS[randomInt(CODE_CHARS.length)];
  return `EM-${code}`;
}
