"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Last-resort screen when the whole layout fails to render; the error is reported to Sentry */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100svh", display: "grid", placeItems: "center", background: "#151211", color: "#faf1e1", fontFamily: "Montserrat, 'Century Gothic', sans-serif", textAlign: "center", padding: "1.5rem" }}>
        <main>
          <h1 style={{ margin: 0, color: "#cf9d57", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", fontSize: "1.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ margin: "0.75rem 0 1.75rem" }}>Sorry about that. Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            style={{ padding: "0.9rem 1.75rem", border: "1px solid #faf1e1", background: "none", color: "#faf1e1", font: "600 0.875rem/1 inherit", letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
