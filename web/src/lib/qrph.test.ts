import { describe, expect, it } from "vitest";
import { checkPaymentQr, crc16, parseEmv } from "./qrph";

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;
/** A made-up InstaPay QR, built the way banks build them, ending in a correct checksum */
function payload(overrides: Partial<Record<"currency" | "guid", string>> = {}) {
  const body =
    field("00", "01") +
    field("01", "11") +
    field("27", field("00", overrides.guid ?? "com.p2pqrpay") + field("01", "TESTBANKXXX") + field("03", "09170000000")) +
    field("52", "6016") +
    field("53", overrides.currency ?? "608") +
    field("58", "PH") +
    field("59", "JU***N D.") +
    field("60", "Taguig") +
    "6304";
  return body + crc16(body);
}

describe("payment QR codes", () => {
  it("computes the EMVCo checksum", () => {
    // The standard check value for CRC-16/CCITT-FALSE
    expect(crc16("123456789")).toBe("29B1");
  });

  it("splits a payload into fields, and rejects broken lengths", () => {
    expect(parseEmv("000201010211")).toEqual([{ id: "00", value: "01" }, { id: "01", value: "11" }]);
    expect(parseEmv("0002010102")).toBeNull();
  });

  it("accepts a peso InstaPay code and reads the name on it", () => {
    expect(checkPaymentQr(payload())).toEqual({ ok: true, name: "JU***N D.", network: "InstaPay" });
  });

  it("rejects a code that read wrong, isn't in pesos, or isn't a payment code", () => {
    const good = payload();
    expect(checkPaymentQr(good.slice(0, -1) + (good.endsWith("0") ? "1" : "0"))).toMatchObject({ ok: false });
    expect(checkPaymentQr(payload({ currency: "840" }))).toMatchObject({ ok: false });
    expect(checkPaymentQr("https://example.com/menu")).toMatchObject({ ok: false });
  });

  it("still accepts other banks' codes, without naming the network", () => {
    expect(checkPaymentQr(payload({ guid: "ph.example.bank" }))).toMatchObject({ ok: true, network: null });
  });
});
