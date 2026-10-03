"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import type { FormState } from "@/app/login/actions";
import "./staff.css";

type Field = { name: string; label: string; type?: string; autoComplete?: string; hint?: string; inputMode?: "numeric" };

/** The cream card used by sign-in, account setup and owner setup */
export default function AuthCard({
  title,
  intro,
  fields,
  submit,
  action,
  footer,
}: {
  title: string;
  intro?: string;
  fields: Field[];
  submit: string;
  action: (state: FormState, form: FormData) => Promise<FormState>;
  footer?: { text: string; href: string; link: string };
}) {
  const [state, run, pending] = useActionState(action, undefined);
  return (
    <main className="auth">
      <div className="auth-card">
        <Link href="/home" className="auth-mark" aria-label="Enero Marso Cafe website">
          <Image src="/brand/enero-marso-monogram-gold.png" alt="" width={439} height={500} priority />
        </Link>
        <h1>{title}</h1>
        {intro && <p className="auth-intro">{intro}</p>}
        <form action={run} className="auth-form" noValidate={false}>
          {fields.map((f) => (
            <label key={f.name}>
              {f.label}
              <input
                name={f.name}
                type={f.type ?? "text"}
                autoComplete={f.autoComplete}
                inputMode={f.inputMode}
                required
                defaultValue={f.name === "email" || f.name === "who" ? state?.email : undefined}
              />
              {f.hint && <small>{f.hint}</small>}
            </label>
          ))}
          {state?.error && <p className="auth-error" role="alert">{state.error}</p>}
          <button type="submit" className="staff-btn is-primary" disabled={pending}>
            {pending ? "Please wait…" : submit}
          </button>
        </form>
        {footer && (
          <p className="auth-foot">
            {footer.text} <Link href={footer.href}>{footer.link}</Link>
          </p>
        )}
      </div>
    </main>
  );
}
