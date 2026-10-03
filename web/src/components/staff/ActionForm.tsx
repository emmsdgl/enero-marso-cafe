"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/app/staff/actions";

/** A form wired to a server action, with pending state and an inline success/error message */
export default function ActionForm({
  action,
  submit,
  children,
  className = "",
  resetOnOk = true,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  submit: string;
  children: ReactNode;
  className?: string;
  resetOnOk?: boolean;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <form action={run} className={`staff-form ${className}`} key={resetOnOk && state?.ok ? state.ok : undefined}>
      {children}
      <div className="staff-form-foot">
        <button type="submit" className="staff-btn is-primary" disabled={pending}>{pending ? "Saving…" : submit}</button>
        {state?.error && <p className="staff-msg is-error" role="alert">{state.error}</p>}
        {state?.ok && <p className="staff-msg is-ok" role="status">{state.ok}</p>}
      </div>
    </form>
  );
}
