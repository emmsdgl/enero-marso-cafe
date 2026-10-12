"use client";

import { useId, useRef, type ReactNode } from "react";

/**
 * A button that opens a small form in a panel over the page: centered on a computer, a sheet from the bottom on a phone.
 * Modal, so a tap on the dimmed page only closes the panel instead of pressing whatever is underneath.
 */
export default function EditSheet({ label, title, subtitle, children }: { label: string; title: string; subtitle?: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  return (
    <>
      <button type="button" className="staff-btn is-small is-quiet" onClick={() => dialog.current?.showModal()}>{label}</button>
      <dialog
        ref={dialog}
        className="edit-sheet"
        aria-labelledby={titleId}
        // A click on the dimmed backdrop lands on the dialog itself
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <div className="edit-sheet-head">
          <span id={titleId}>
            <b>{title}</b>
            {subtitle && <small>{subtitle}</small>}
          </span>
          <button type="button" className="edit-sheet-close" aria-label="Close" onClick={() => dialog.current?.close()}>
            <svg viewBox="0 0 12 12" width="14" height="14" aria-hidden="true"><path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
        </div>
        {children}
      </dialog>
    </>
  );
}
