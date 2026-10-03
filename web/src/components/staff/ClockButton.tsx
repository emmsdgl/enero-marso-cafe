"use client";

import { useActionState } from "react";
import { clockViaWifi, type ActionState } from "@/app/staff/actions";

export default function ClockButton({ clockedIn }: { clockedIn: boolean }) {
  const [state, run, pending] = useActionState<ActionState>(clockViaWifi, undefined);
  return (
    <form action={run} className="clock-form">
      <button type="submit" className={`staff-btn is-big ${clockedIn ? "is-out" : "is-primary"}`} disabled={pending}>
        {pending ? "Saving…" : clockedIn ? "Clock out" : "Clock in"}
      </button>
      {state?.error && <p className="staff-msg is-error" role="alert">{state.error}</p>}
      {state?.ok && <p className="staff-msg is-ok" role="status">{state.ok}</p>}
    </form>
  );
}
