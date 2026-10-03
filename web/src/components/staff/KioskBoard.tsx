"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { kioskPunch, type KioskResult } from "@/app/kiosk/actions";

type Person = { id: string; name: string; since: string | null };

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

/** Shared counter tablet: tap your name, type your PIN, see a confirmation, back to the list */
export default function KioskBoard({ branchName, people }: { branchName: string; people: Person[] }) {
  const router = useRouter();
  const [who, setWho] = useState<Person | null>(null);
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<KioskResult | null>(null);
  const [pending, start] = useTransition();
  const [clock, setClock] = useState<Date | null>(null);

  // Live clock, and refresh the list every minute so statuses stay current
  useEffect(() => {
    const tick = () => setClock(new Date());
    tick();
    const t = setInterval(tick, 1000);
    const r = setInterval(() => router.refresh(), 60_000);
    return () => { clearInterval(t); clearInterval(r); };
  }, [router]);

  const reset = () => { setWho(null); setPin(""); setResult(null); };

  // After a successful punch, go back to the list on its own
  useEffect(() => {
    if (!result?.ok) return;
    const t = setTimeout(reset, 4000);
    return () => clearTimeout(t);
  }, [result]);

  // Abandoned PIN pad closes after 30 seconds
  useEffect(() => {
    if (!who || result?.ok) return;
    const t = setTimeout(reset, 30_000);
    return () => clearTimeout(t);
  }, [who, pin, result]);

  const submit = (value: string) =>
    start(async () => {
      const r = await kioskPunch(who!.id, value);
      setResult(r);
      setPin("");
      if (r.ok) router.refresh();
    });

  const press = (d: string) => {
    if (pending) return;
    setResult(null);
    if (d === "back") return setPin((p) => p.slice(0, -1));
    const next = (pin + d).slice(0, 6);
    setPin(next);
  };

  // Physical keyboard support
  useEffect(() => {
    if (!who || result?.ok) return;
    const onKey = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") press("back");
      else if (e.key === "Enter" && pin.length >= 4) submit(pin);
      else if (e.key === "Escape") reset();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  });

  return (
    <main className="kiosk">
      <header className="kiosk-top">
        <Image src="/brand/enero-marso-monogram-gold.png" alt="" width={439} height={500} className="kiosk-mark" />
        <div>
          <h1>{branchName}</h1>
          <p>Clock in / clock out</p>
        </div>
        <time className="kiosk-clock" suppressHydrationWarning>
          {clock ? clock.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }) : ""}
        </time>
      </header>

      {!who ? (
        people.length === 0 ? (
          <p className="kiosk-empty">No one on this branch has set a clock-in PIN yet. Set one in Staff → My account.</p>
        ) : (
          <>
            <p className="kiosk-prompt">Tap your name</p>
            <ul className="kiosk-people">
              {people.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setWho(p)}>
                    <b>{p.name}</b>
                    <small className={p.since ? "is-on" : ""}>{p.since ? `In since ${timeOf(p.since)}` : "Not clocked in"}</small>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )
      ) : result?.ok ? (
        <section className={`kiosk-done ${result.action === "in" ? "is-in" : "is-out"}`} role="status" aria-live="assertive">
          <p className="kiosk-done-big">{result.action === "in" ? `Hi, ${result.name}!` : `Thanks, ${result.name}!`}</p>
          <p>
            {result.action === "in" ? "Clocked in" : "Clocked out"} at <b>{timeOf(result.at)}</b>
            {result.hours !== undefined && <> · {result.hours.toFixed(1)} hours this shift</>}
          </p>
          <button type="button" className="staff-btn is-quiet" onClick={reset}>Done</button>
        </section>
      ) : (
        <section className="kiosk-pad" aria-label={`PIN for ${who.name}`}>
          <p className="kiosk-who">
            <b>{who.name}</b>
            <span>{who.since ? `Clocking out · in since ${timeOf(who.since)}` : "Clocking in"}</span>
          </p>
          <div className="kiosk-dots" aria-label={`${pin.length} digits entered`}>
            {Array.from({ length: 6 }, (_, i) => <i key={i} className={i < pin.length ? "is-on" : ""} />)}
          </div>
          {result && !result.ok && <p className="kiosk-error" role="alert">{result.error}</p>}
          <div className="kiosk-keys">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
              <button key={d} type="button" onClick={() => press(d)}>{d}</button>
            ))}
            <button type="button" className="is-muted" onClick={reset}>Cancel</button>
            <button type="button" onClick={() => press("0")}>0</button>
            <button type="button" className="is-muted" onClick={() => press("back")} aria-label="Delete last digit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5h11v14H9l-6-7z" /><path d="m12 9 5 6M17 9l-5 6" /></svg>
            </button>
          </div>
          <button
            type="button"
            className={`staff-btn is-big ${who.since ? "is-out" : "is-primary"}`}
            disabled={pin.length < 4 || pending}
            onClick={() => submit(pin)}
          >
            {pending ? "Checking…" : who.since ? "Clock out" : "Clock in"}
          </button>
        </section>
      )}
    </main>
  );
}
