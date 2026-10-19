import "server-only";
import { talkConfigured } from "./realtime-sfu";
import { answer, join, leave, markHeard, markLive, publish, pull, release, saveClip, state, take, type Member } from "./talk";

/**
 * The one entry point for a Talk screen or counter tablet (POST JSON { op, ... }, or a form with a
 * recording). Plain routes rather than server actions: a tablet stays open for days, and route
 * addresses don't change between deploys. Outcomes come back as { ok, code?, error? }.
 */
const json = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Cookies ride along on cross-site requests too: only our own pages may call this */
function sameSite(request: Request) {
  const site = request.headers.get("sec-fetch-site");
  if (site) return site === "same-origin";
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === (request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  } catch {
    return false;
  }
}

export async function talkApi(request: Request, member: Member | null, notMember: string): Promise<Response> {
  if (!sameSite(request)) return json({ ok: false, code: "forbidden", error: "Not allowed." }, 403);
  if (!talkConfigured()) return json({ ok: false, code: "off", error: "Talk isn't set up on this site yet." });
  if (!member) return json({ ok: false, code: "not-member", error: notMember });

  try {
    // A recording: sent as a form, since it's a file
    if ((request.headers.get("content-type") ?? "").startsWith("multipart/form-data")) {
      const form = await request.formData();
      const r = await saveClip(member, form.get("sessionId"), form.get("audio"), form.get("ms"));
      if (!r) return json({ ok: false, code: "gone" });
      return json("error" in r ? { ok: false, code: "clip", error: r.error } : { ok: true, id: r.id });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const sid = body?.sessionId;
    let r: Record<string, unknown> | null;
    switch (body?.op) {
      case "join":
        r = await join(member, body.channels);
        break;
      case "publish":
        r = await publish(member, sid, body.offer, body.mid);
        break;
      case "live":
        r = await markLive(member, sid);
        break;
      case "pull":
        r = await pull(member, sid, body.tracks);
        break;
      case "answer":
        r = await answer(member, sid, body.answer);
        break;
      case "state":
        r = await state(member, sid);
        break;
      case "take": {
        const t = await take(member, sid);
        if (t && !t.ok) return json({ ok: false, code: "busy", busy: t.busy });
        r = t;
        break;
      }
      case "release":
        r = await release(member, sid);
        break;
      case "leave":
        r = await leave(member, sid);
        break;
      case "heard":
        r = await markHeard(member, body.clipId);
        break;
      default:
        return json({ ok: false, code: "bad", error: "Unknown request." }, 400);
    }
    // No session row: it left, timed out, or isn't this caller's. The device starts a new one.
    if (!r) return json({ ok: false, code: "gone" });
    return json({ ok: true, ...r });
  } catch (e) {
    console.error("Talk request failed", e);
    return json({ ok: false, code: "error", error: "Talk couldn't reach the audio service. Trying again…" }, 502);
  }
}
