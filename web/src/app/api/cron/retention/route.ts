import { timingSafeEqual } from "node:crypto";
import { anonymizeOldOrders } from "@/lib/retention";
import { audit } from "@/lib/staff";
import { removeOldTalk } from "@/lib/talk";

export const dynamic = "force-dynamic";

/**
 * Daily, from Vercel Cron (vercel.json): removes customers' details from orders older than a
 * year, and talk clips older than 7 days. Vercel sends the CRON_SECRET it holds; anyone else gets a 401.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const sent = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (!secret || sent.length !== want.length || !timingSafeEqual(sent, want)) return new Response("Not allowed", { status: 401 });
  const done = await anonymizeOldOrders();
  if (done.orders > 0) await audit(null, "retention.run", done);
  const talk = await removeOldTalk();
  return Response.json({ ...done, talkClips: talk.clips });
}
