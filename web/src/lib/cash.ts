import { peso } from "./menu";

/**
 * Cash on delivery. The customer says what they'll pay with (the exact amount, or a bill bigger
 * than the total), so the rider leaves with the right change. Pure, so it's tested.
 */
export const CASH_MAX = 20_000; // a guard against typos like ₱50000 for ₱500

/** What they'll hand the rider: "exact", or an amount of at least the total */
export function readTendered(input: unknown, total: number): { ok: true; amount: number } | { ok: false; error: string } {
  if (input === "exact") return { ok: true, amount: total };
  const n = typeof input === "number" ? input : Number(String(input ?? "").replace(/[₱,\s]/g, ""));
  if (String(input ?? "").trim() === "" || !Number.isInteger(n) || n <= 0) {
    return { ok: false, error: "Say how much you'll pay the rider with, in whole pesos, or choose the exact amount." };
  }
  if (n < total) return { ok: false, error: `Pay with at least ${peso(total)}, or choose the exact amount.` };
  if (n > CASH_MAX) return { ok: false, error: `That's more than our riders carry change for. Pay with up to ${peso(CASH_MAX)}.` };
  return { ok: true, amount: n };
}

export const changeDue = (total: number, tendered: number | null) => Math.max(0, (tendered ?? total) - total);

/**
 * The rider's line. If the fee went up after they ordered, the bill they named may no longer be
 * enough: the rider is told how much more to collect.
 */
export function cashLine(total: number, tendered: number | null): string {
  const paying = tendered ?? total;
  if (paying < total) return `Collect ${peso(total)} · they said ${peso(paying)}, so ask for ${peso(total - paying)} more`;
  const change = paying - total;
  return change > 0 ? `Collect ${peso(total)} · paying with ${peso(paying)} · bring ${peso(change)} change` : `Collect ${peso(total)} · exact amount`;
}

/** What the customer reads about their cash payment */
export function cashNote(total: number, tendered: number | null): string {
  const paying = tendered ?? total;
  if (paying <= total) return `Pay the rider ${peso(total)} in cash.`;
  return `Pay the rider ${peso(total)} in cash. You said you'll pay with ${peso(paying)}, so they'll bring ${peso(paying - total)} change.`;
}
