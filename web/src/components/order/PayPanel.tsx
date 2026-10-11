"use client";

import { useState, useTransition } from "react";
import { submitPaymentAction } from "@/app/order/actions";
import CopyText from "@/components/CopyText";
import { peso } from "@/lib/menu";
import type { PayAccount } from "@/lib/payments";

type Props = { code: string; token: string; total: number; accounts: PayAccount[]; sent: string | null };

/**
 * Paying for a delivery: the cafe's QR and number, the exact amount, then the receipt's
 * reference number. Customers usually order and pay on the same phone, so the QR can be saved
 * to the gallery and uploaded in the GCash, Maya or bank app's QR scanner.
 */
export default function PayPanel({ code, token, total, accounts, sent }: Props) {
  const [chosen, setChosen] = useState(accounts[0]?.id ?? "");
  const [ref, setRef] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const account = accounts.find((a) => a.id === chosen) ?? accounts[0];

  if (sent) {
    return (
      <section className="pay is-sent" aria-labelledby="pay-title">
        <h2 id="pay-title">Payment sent</h2>
        <p>The cafe is checking reference <b className="nowrap">{sent}</b> for {peso(total)}. It usually takes a few minutes, and this page updates by itself.</p>
      </section>
    );
  }
  if (!account) {
    return (
      <section className="pay" aria-labelledby="pay-title">
        <h2 id="pay-title">Pay {peso(total)}</h2>
        <p>The cafe will send you where to pay in the chat below.</p>
      </section>
    );
  }

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await submitPaymentAction(code, token, account.id, ref);
      if (r.error) setError(r.error);
    });
  };

  return (
    <section className="pay" aria-labelledby="pay-title">
      <h2 id="pay-title">Pay {peso(total)}</h2>
      <p className="pay-how">Pay from GCash, Maya or your bank app, the exact amount. Then type the reference number from your receipt below.</p>

      {accounts.length > 1 && (
        <div className="pay-tabs" role="group" aria-label="Pay to">
          {accounts.map((a) => (
            <button key={a.id} type="button" aria-pressed={a.id === account.id} onClick={() => setChosen(a.id)}>{a.label}</button>
          ))}
        </div>
      )}

      <div className="pay-account">
        {account.qrSvg && (
          <figure className="pay-qr">
            <div role="img" aria-label={`QR code for ${account.label}, ${account.accountName}`} dangerouslySetInnerHTML={{ __html: account.qrSvg }} />
            <figcaption>
              <SaveQr svg={account.qrSvg} code={code} caption={`${account.label} · ${account.accountName} · ${peso(total)}`} />
              <small>Paying on this phone? Save the QR, then upload it in your app&rsquo;s QR scanner.</small>
            </figcaption>
          </figure>
        )}
        <dl className="pay-details">
          <div><dt>Pay to</dt><dd>{account.label}<small>{account.accountName}</small></dd></div>
          {account.accountNumber && (
            <div><dt>Number</dt><dd><span className="nowrap">{account.accountNumber}</span> <CopyText text={account.accountNumber.replace(/\s+/g, "")} /></dd></div>
          )}
          <div><dt>Amount</dt><dd><span className="nowrap">{peso(total)}</span> <CopyText text={String(total)} /></dd></div>
        </dl>
      </div>

      <form className="pay-ref" onSubmit={send}>
        <label>
          Reference number <small>from your payment receipt</small>
          <input value={ref} onChange={(e) => setRef(e.target.value)} autoComplete="off" autoCapitalize="characters" maxLength={30} required placeholder="1234 567 890123" />
        </label>
        <button type="submit" className="order-submit" disabled={pending || ref.trim().length < 6}>{pending ? "Sending…" : "I've paid"}</button>
        {error && <p className="slip-error" role="alert">{error}</p>}
      </form>
    </section>
  );
}

/** Turns the QR into a picture: shared to the gallery on phones that can, downloaded elsewhere */
function SaveQr({ svg, code, caption }: { svg: string; code: string; caption: string }) {
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      const img = new Image();
      img.src = url;
      await img.decode();
      const size = 900;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size + 110;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);
      ctx.fillStyle = "#151211";
      ctx.textAlign = "center";
      ctx.font = "600 34px Montserrat, Arial, sans-serif";
      ctx.fillText(caption, size / 2, size + 40, size - 40);
      ctx.font = "500 28px Montserrat, Arial, sans-serif";
      ctx.fillText(`Enero Marso order ${code}`, size / 2, size + 85, size - 40);
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
      if (!blob) return;
      const file = new File([blob], `enero-marso-${code}-qr.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Pay for order ${code}` }).catch(() => {});
      } else {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = file.name;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(link.href), 5000);
      }
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" className="pill-btn pay-save" onClick={save} disabled={busy}>
      {busy ? "Saving…" : "Save QR"}
    </button>
  );
}
