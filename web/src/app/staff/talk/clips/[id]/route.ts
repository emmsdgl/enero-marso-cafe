import { getCurrentStaff } from "@/lib/staff";
import { clipAudio, staffMember } from "@/lib/talk";

export const dynamic = "force-dynamic";

/** A saved talk clip, for staff on one of its branches' channels */
export async function GET(_: Request, { params }: RouteContext<"/staff/talk/clips/[id]">) {
  const me = await getCurrentStaff();
  const member = me && (await staffMember(me));
  const clip = member && (await clipAudio(member, (await params).id));
  if (!clip) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(clip.audio), {
    headers: { "Content-Type": clip.mime, "Cache-Control": "private, no-store", "Content-Length": String(clip.audio.length) },
  });
}
