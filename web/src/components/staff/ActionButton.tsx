"use client";

import { useState, useTransition } from "react";
import type { ActionState } from "@/app/staff/actions";

/** A single button that runs a server action, with an inline "Are you sure?" step instead of a browser dialog */
export default function ActionButton({ action, label, confirm }: { action: () => Promise<ActionState>; label: string; confirm?: string }) {
  const [asking, setAsking] = useState(false);
  const [msg, setMsg] = useState<ActionState>();
  const [pending, start] = useTransition();
  const go = () => start(async () => { setMsg(await action()); setAsking(false); });

  if (confirm && asking) {
    return (
      <span className="staff-confirm" role="group" aria-label={confirm}>
        <span>{confirm}</span>
        <button type="button" className="staff-btn is-small is-danger" onClick={go} disabled={pending}>{pending ? "…" : "Yes"}</button>
        <button type="button" className="staff-btn is-small is-quiet" onClick={() => setAsking(false)}>No</button>
      </span>
    );
  }
  return (
    <span className="staff-inline">
      <button type="button" className="staff-btn is-small is-quiet" onClick={() => (confirm ? setAsking(true) : go())} disabled={pending}>{label}</button>
      {msg?.error && <small className="is-error">{msg.error}</small>}
    </span>
  );
}
