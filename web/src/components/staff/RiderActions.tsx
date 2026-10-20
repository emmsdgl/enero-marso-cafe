"use client";

import { useState, useTransition } from "react";
import { riderStepAction } from "@/app/staff/orders/actions";
import { peso } from "@/lib/menu";
import type { OrderStatus } from "@/lib/order-rules";

/**
 * The rider's two taps: "On my way" when they leave with it, "Delivered" at the door. Cash: they
 * tick that they got it first, so the counter knows the money is with them.
 */
export default function RiderActions({ id, status, cash, total }: { id: string; status: OrderStatus; cash: boolean; total: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [got, setGot] = useState(false);
  const step = (s: "out" | "delivered") =>
    start(async () => {
      setError(null);
      const r = await riderStepAction(id, s, s === "delivered" && cash ? got : undefined);
      if (r.error) setError(r.error);
    });

  return (
    <div className="rider-actions">
      {status === "ready" ? (
        <button type="button" className="staff-btn is-primary is-big" disabled={pending} onClick={() => step("out")}>
          {pending ? "Saving…" : "On my way"}
        </button>
      ) : status === "out_for_delivery" ? (
        <>
          {cash && (
            <label className="staff-check rider-cash">
              <input type="checkbox" checked={got} onChange={(e) => setGot(e.target.checked)} /> I got {peso(total)} in cash
            </label>
          )}
          <button type="button" className="staff-btn is-primary is-big" disabled={pending || (cash && !got)} onClick={() => step("delivered")}>
            {pending ? "Saving…" : "Delivered"}
          </button>
        </>
      ) : (
        <p className="staff-help">The counter is still making it. You&rsquo;ll see &ldquo;On my way&rdquo; here once it&rsquo;s ready.</p>
      )}
      {error && <p className="staff-msg is-error" role="alert">{error}</p>}
    </div>
  );
}
