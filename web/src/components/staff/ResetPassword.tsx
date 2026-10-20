"use client";

import { useActionState } from "react";
import { resetPassword, type ResetState } from "@/app/login/actions";
import { AuthShell } from "./AuthCard";

const SIGN_IN = [{ text: "Remembered it?", href: "/login", link: "Sign in" }];

/** Forgot password: email → a 6-digit code by email → the code and a new password */
export default function ResetPassword() {
  const [state, run, pending] = useActionState<ResetState, FormData>(resetPassword, undefined);
  const error = state?.error && <p className="auth-error" role="alert">{state.error}</p>;

  if (state?.step !== "code") {
    return (
      <AuthShell title="Reset your password" intro="Enter the email you sign in with. We’ll email you a 6-digit code." footer={SIGN_IN}>
        <form action={run} className="auth-form">
          <input type="hidden" name="step" value="email" />
          <label>
            Email
            <input name="email" type="email" autoComplete="username" required defaultValue={state?.email} />
          </label>
          {error}
          <button type="submit" className="staff-btn is-primary" disabled={pending}>
            {pending ? "Sending…" : "Email me a code"}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Reset your password" notice={state.notice} footer={SIGN_IN}>
      <form action={run} className="auth-form">
        <input type="hidden" name="step" value="code" />
        <input type="hidden" name="email" value={state.email} />
        <label>
          6-digit code
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\s*\d{6}\s*"
            maxLength={8}
            required
            autoFocus
          />
          <small>From the email. No email? Check spam, or send a new code.</small>
        </label>
        <label>
          New password
          <input name="password" type="password" autoComplete="new-password" minLength={8} maxLength={128} required />
          <small>At least 8 characters</small>
        </label>
        {error}
        <button type="submit" className="staff-btn is-primary" disabled={pending}>
          {pending ? "Please wait…" : "Change my password"}
        </button>
      </form>
      <div className="auth-alt">
        <form action={run}>
          <input type="hidden" name="step" value="email" />
          <input type="hidden" name="email" value={state.email} />
          <button type="submit" className="staff-link" disabled={pending}>Send a new code</button>
        </form>
        <form action={run}>
          <input type="hidden" name="step" value="restart" />
          <button type="submit" className="staff-link" disabled={pending}>Use a different email</button>
        </form>
      </div>
    </AuthShell>
  );
}
