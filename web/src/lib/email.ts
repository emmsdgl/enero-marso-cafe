import "server-only";

/**
 * Sending email through Resend (https://resend.com), from our own domain once it's set up.
 * Off until RESEND_API_KEY is set, plus STAFF_EMAIL_FROM for invites or ORDER_EMAIL_FROM for order
 * links. Never throws: a failed send is reported to the caller and never blocks an order or an invite.
 * Password reset codes don't come through here: Neon Auth sends those itself.
 */
const KEY = process.env.RESEND_API_KEY;
const API = (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/+$/, ""); // a stand-in server in tests

export const staffEmailFrom = KEY ? process.env.STAFF_EMAIL_FROM || null : null;
export const orderEmailFrom = KEY ? process.env.ORDER_EMAIL_FROM || null : null;
/** Where replies to order emails go (hello@ once the domain's inbox is forwarded) */
export const replyTo = process.env.EMAIL_REPLY_TO || undefined;

export type Email = { from: string; to: string; subject: string; text: string; html: string; idempotencyKey?: string };

export async function sendEmail(m: Email): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!KEY) return { ok: false, error: "Email isn't set up." };
  try {
    const res = await fetch(`${API}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        // Resend sends once per key, so a retried request can't email twice
        ...(m.idempotencyKey ? { "Idempotency-Key": m.idempotencyKey } : {}),
      },
      body: JSON.stringify({ from: m.from, to: [m.to], subject: m.subject, text: m.text, html: m.html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (res.ok) return { ok: true };
    const body = (await res.json().catch(() => null)) as { message?: string; name?: string } | null;
    return { ok: false, error: `${res.status} ${body?.name ?? ""} ${body?.message ?? ""}`.trim() };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * A plain, readable email: a few paragraphs and one button. Inline styles only, since mail apps
 * ignore stylesheets. `paragraphs` are plain text and are escaped here.
 */
export function simpleHtml({ paragraphs, button, after }: { paragraphs: string[]; button: { label: string; url: string }; after?: string[] }) {
  const p = (t: string) => `<p style="margin:0 0 16px;font:16px/1.5 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#151211">${esc(t)}</p>`;
  return [
    `<!doctype html><html><body style="margin:0;padding:24px;background:#e1cdb3">`,
    `<div style="max-width:520px;margin:0 auto;padding:28px;background:#faf1e1;border-radius:12px">`,
    `<p style="margin:0 0 20px;font:600 13px/1 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#834a22">Enero Marso Cafe</p>`,
    ...paragraphs.map(p),
    `<p style="margin:8px 0 24px"><a href="${esc(button.url)}" style="display:inline-block;padding:14px 22px;border-radius:8px;background:#834a22;color:#faf1e1;font:600 16px/1 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;text-decoration:none">${esc(button.label)}</a></p>`,
    p(`Or open this link: ${button.url}`),
    ...(after ?? []).map(p),
    `</div></body></html>`,
  ].join("");
}
