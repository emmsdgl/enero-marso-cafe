"use client";

import { useActionState, useLayoutEffect, useRef, type ReactNode } from "react";
import type { ActionState } from "@/app/staff/actions";

/** A form wired to a server action, with pending state and an inline success/error message */
export default function ActionForm({
  action,
  submit,
  children,
  className = "",
  resetOnOk = true,
  closeOnOk = false,
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  submit: string;
  children: ReactNode;
  className?: string;
  resetOnOk?: boolean;
  /** Inside an EditSheet: close it after a successful save (the page behind shows the change) */
  closeOnOk?: boolean;
}) {
  const [state, run, pending] = useActionState(action, undefined);
  const form = useRef<HTMLFormElement>(null);
  // Before paint, so a row that re-sorts after the save never flashes an open panel in place
  useLayoutEffect(() => {
    if (closeOnOk && state?.ok) form.current?.closest("dialog")?.close();
  }, [closeOnOk, state]);
  return (
    <form ref={form} action={run} className={`staff-form ${className}`} key={resetOnOk && state?.ok ? state.ok : undefined}>
      {children}
      <div className="staff-form-foot">
        <button type="submit" className="staff-btn is-primary" disabled={pending}>{pending ? "Saving…" : submit}</button>
        {state?.error && <p className="staff-msg is-error" role="alert">{state.error}</p>}
        {state?.ok && !closeOnOk && <p className="staff-msg is-ok" role="status">{state.ok}</p>}
      </div>
    </form>
  );
}
