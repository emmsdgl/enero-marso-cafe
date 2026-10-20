"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/login/actions";
import "./staff.css";

type Field = { name: string; label: string; type?: string; autoComplete?: string; hint?: string; inputMode?: "numeric"; value?: string };
export type AuthLink = { text: string; href: string; link: string };

/** The cream card around every sign-in screen: monogram, title, intro, then the form and links below */
export function AuthShell({ title, intro, notice, footer, children }: {
  title: string;
  intro?: string;
  notice?: string; // good news from the step before, like "Your password is changed"
  footer?: AuthLink[];
  children: ReactNode;
}) {
  return (
    <main className="auth">
      <div className="auth-card">
        <Link href="/home" className="auth-mark" aria-label="Enero Marso Cafe website">
          <Image src="/brand/enero-marso-monogram-gold.png" alt="" width={439} height={500} priority />
        </Link>
        <h1>{title}</h1>
        {intro && <p className="auth-intro">{intro}</p>}
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        {children}
        {footer?.map((f) => (
          <p key={f.href} className="auth-foot">
            {f.text} <Link href={f.href}>{f.link}</Link>
          </p>
        ))}
      </div>
    </main>
  );
}

/** The cream card used by sign-in, account setup and owner setup */
export default function AuthCard({
  title,
  intro,
  notice,
  fields,
  submit,
  action,
  footer,
  hidden,
}: {
  title: string;
  intro?: string;
  notice?: string;
  fields: Field[];
  submit: string;
  action: (state: FormState, form: FormData) => Promise<FormState>;
  footer?: AuthLink[];
  hidden?: Record<string, string>; // sent along unseen, like where to go after signing in
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <AuthShell title={title} intro={intro} notice={state?.error ? undefined : notice} footer={footer}>
      <form action={run} className="auth-form" noValidate={false}>
        {Object.entries(hidden ?? {}).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
        {fields.map((f) => (
          <label key={f.name}>
            {f.label}
            <input
              name={f.name}
              type={f.type ?? "text"}
              autoComplete={f.autoComplete}
              inputMode={f.inputMode}
              required
              readOnly={f.value !== undefined}
              defaultValue={f.value ?? (f.name === "email" || f.name === "who" ? state?.email : undefined)}
            />
            {f.hint && <small>{f.hint}</small>}
          </label>
        ))}
        {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
        <button type="submit" className="staff-btn is-primary" disabled={pending}>
          {pending ? "Please wait…" : submit}
        </button>
      </form>
    </AuthShell>
  );
}
