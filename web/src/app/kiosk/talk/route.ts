import { currentKiosk } from "@/lib/kiosk";
import { counterMember } from "@/lib/talk";
import { talkApi } from "@/lib/talk-api";

export const dynamic = "force-dynamic";

/** Talk for a branch's counter tablet: always on its own branch */
export async function POST(request: Request) {
  const kiosk = await currentKiosk();
  if (!kiosk) return Response.json({ ok: false, code: "signed-out", error: "This tablet isn't set up anymore. Ask a manager." }, { status: 401 });
  return talkApi(request, counterMember(kiosk), "");
}
