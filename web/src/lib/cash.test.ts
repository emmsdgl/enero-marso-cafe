import { describe, expect, it } from "vitest";
import { CASH_MAX, cashLine, cashNote, changeDue, readTendered } from "./cash";

describe("cash on delivery", () => {
  it("takes the exact amount, or a bill at least as big as the total", () => {
    expect(readTendered("exact", 495)).toEqual({ ok: true, amount: 495 });
    expect(readTendered("1000", 495)).toEqual({ ok: true, amount: 1000 });
    expect(readTendered("₱1,000", 495)).toEqual({ ok: true, amount: 1000 });
    expect(readTendered(500, 495)).toEqual({ ok: true, amount: 500 });
    expect(readTendered(495, 495)).toEqual({ ok: true, amount: 495 });
  });

  it("refuses too little, nothing, fractions and typos", () => {
    expect(readTendered("200", 495)).toMatchObject({ ok: false });
    expect(readTendered("", 495)).toMatchObject({ ok: false });
    expect(readTendered("abc", 495)).toMatchObject({ ok: false });
    expect(readTendered("500.50", 495)).toMatchObject({ ok: false });
    expect(readTendered(CASH_MAX + 1, 495)).toMatchObject({ ok: false });
  });

  it("works out the change", () => {
    expect(changeDue(495, 1000)).toBe(505);
    expect(changeDue(495, 495)).toBe(0);
    expect(changeDue(495, null)).toBe(0);
  });

  it("tells the rider what to collect and what change to bring", () => {
    expect(cashLine(495, 1000)).toBe("Collect ₱495 · paying with ₱1,000 · bring ₱505 change");
    expect(cashLine(495, 495)).toBe("Collect ₱495 · exact amount");
    expect(cashLine(495, null)).toBe("Collect ₱495 · exact amount");
  });

  it("warns the rider when a higher fee means the named bill isn't enough", () => {
    expect(cashLine(520, 500)).toBe("Collect ₱520 · they said ₱500, so ask for ₱20 more");
  });

  it("tells the customer what to pay and the change coming", () => {
    expect(cashNote(495, 1000)).toBe("Pay the rider ₱495 in cash. You said you'll pay with ₱1,000, so they'll bring ₱505 change.");
    expect(cashNote(495, 495)).toBe("Pay the rider ₱495 in cash.");
  });
});
