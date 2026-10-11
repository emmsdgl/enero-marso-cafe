"use client";

import { useState } from "react";

/** A small "Copy" button for a number, code or address */
export default function CopyText({ text, label = "Copy", className = "copy-btn" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {copied ? "Copied" : label}
    </button>
  );
}
