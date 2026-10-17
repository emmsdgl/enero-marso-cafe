"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { CloseIcon } from "./Icons";

/**
 * A panel over the page, opened from code: centered on a computer, rising from the bottom on a phone.
 * Modal, so the page behind can't be tapped by mistake; Escape, the close button or a tap on the
 * dimmed page closes it. (The staff portal's EditSheet is the same idea with its own button.)
 */
export default function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      // A click on the dimmed backdrop lands on the dialog itself
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="sheet-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="sheet-close" aria-label="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </dialog>
  );
}
