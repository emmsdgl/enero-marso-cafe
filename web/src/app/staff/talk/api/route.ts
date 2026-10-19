import { getCurrentStaff } from "@/lib/staff";
import { staffMember } from "@/lib/talk";
import { talkApi } from "@/lib/talk-api";

export const dynamic = "force-dynamic";

/** Talk for signed-in staff: the admin always, everyone else while clocked in */
export async function POST(request: Request) {
  const me = await getCurrentStaff();
  if (!me) return Response.json({ ok: false, code: "signed-out", error: "Sign in again to use Talk." }, { status: 401 });
  return talkApi(request, await staffMember(me), "Clock in to use Talk.");
}
