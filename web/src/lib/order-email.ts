import "server-only";
import { eq, sql } from "drizzle-orm";
import { db, orders } from "@/db";
import { branches } from "@/data/branches";
import { orderEmailFrom, sendEmail, simpleHtml } from "./email";
import { ORDER_EMAILS_PER_DAY } from "./email-rules";
import { siteUrl } from "./site";
import { audit } from "./staff";

/**
 * The one email a customer can ask for: the private link to their order. Sent after the order is
 * saved, never more than once, and at most 60 a day across the site. If it can't go out, the order
 * is untouched: the link on screen and the order bubble still bring them back.
 */
export async function emailOrderLink(o: { id: string; code: string; branchId: string; token: string; email: string; name: string; fulfillment: string }) {
  if (!orderEmailFrom) return;
  // Claim one of today's order emails, so two orders at once can't both pass the limit check late
  const claimed = await db.execute(sql`
    update orders set email_sent_at = now()
    where id = ${o.id} and email_sent_at is null
      and (select count(*) from orders where email_sent_at > now() - interval '24 hours') < ${ORDER_EMAILS_PER_DAY}
    returning id`);
  if (!claimed.rows.length) {
    await audit(null, "order.email-skipped", { orderId: o.id, why: "daily limit" });
    return;
  }
  const url = `${siteUrl()}/order/${o.code}?t=${encodeURIComponent(o.token)}`;
  const branch = branches.find((b) => b.id === o.branchId)?.name ?? "Enero Marso Cafe";
  const first = o.name.trim().split(/\s+/)[0];
  const how = o.fulfillment === "delivery" ? "follow your delivery" : "see when it's ready";
  const sent = await sendEmail({
    from: orderEmailFrom,
    to: o.email,
    subject: `Your order ${o.code} at ${branch}`,
    text: [
      `Hi ${first},`,
      `Thanks for ordering from ${branch}. Your order code is ${o.code}. Open your order page to ${how}, chat with us, and pay if needed:`,
      url,
      "Keep this email to yourself: anyone with the link can see your order.",
    ].join("\n\n"),
    html: simpleHtml({
      paragraphs: [`Hi ${first},`, `Thanks for ordering from ${branch}. Your order code is ${o.code}. Open your order page to ${how}, chat with us, and pay if needed.`],
      button: { label: `Open order ${o.code}`, url },
      after: ["Keep this email to yourself: anyone with the link can see your order."],
    }),
    idempotencyKey: `order-${o.id}`,
  });
  if (!sent.ok) {
    // Doesn't count toward the day's limit, and the order goes on as normal
    await db.update(orders).set({ emailSentAt: null }).where(eq(orders.id, o.id));
    await audit(null, "order.email-failed", { orderId: o.id, error: sent.error.slice(0, 200) });
  }
}
