import "server-only";
import { and, arrayOverlaps, count, desc, eq, gt, inArray, isNotNull, isNull, lt, notExists, or, sql } from "drizzle-orm";
import { branches as BRANCHES } from "@/data/branches";
import { db, staff, talkClips, talkFloor, talkHeard, talkPresence, timeEntries, type Staff } from "@/db";
import { notifyMissedTalk } from "./push";
import { announce, channels as live } from "./realtime";
import { iceServers, openSession, pullTracks, pushTrack, renegotiate, type Sdp } from "./realtime-sfu";
import {
  CLIP_KEEP_DAYS, FLOOR_GRACE_MS, PRESENCE_TTL_MS, TALK_MAX_MS, counterName, pickChannels, readClip, talkChannels,
} from "./talk-rules";

/**
 * Push-to-talk on the server: who may be on Talk, their live audio sessions at Cloudflare, who holds
 * each channel, and the saved clips. Phones never see the Cloudflare app secret: they ask here, and
 * every request is checked against the caller's own session.
 */

/** Someone on Talk: a staff member (the admin, or staff clocked in now) or a branch's counter tablet */
export type Member = { kind: "staff" | "counter"; id: string; name: string; channels: string[]; admin: boolean };

export type Person = { sessionId: string; name: string; trackName: string | null; branches: string[]; me: boolean };
export type FloorView = { branchId: string; sessionId: string; name: string; left: number }; // ms until the hold lapses
export type ClipView = { id: string; name: string; branches: string[]; ms: number; at: string; mine: boolean; heard: boolean; heardBy: string[] };
export type TalkView = { channels: string[]; people: Person[]; floor: FloorView[]; clips: ClipView[] };

const ALL: string[] = BRANCHES.map((b) => b.id);
const TRACK = "mic"; // track names only need to be unique within a session

export async function staffMember(me: Staff): Promise<Member | null> {
  const clockedIn =
    me.role !== "admin" &&
    (await db.select({ id: timeEntries.id }).from(timeEntries).where(and(eq(timeEntries.staffId, me.id), isNull(timeEntries.clockOut))).limit(1)).length > 0;
  const channels = talkChannels(me, clockedIn, ALL);
  return channels.length ? { kind: "staff", id: me.id, name: me.name, channels, admin: me.role === "admin" } : null;
}

export const counterMember = (kiosk: { id: string; branchId: string }): Member => ({
  kind: "counter", id: kiosk.id, name: counterName(kiosk.branchId), channels: [kiosk.branchId], admin: false,
});

const whose = (m: Member) => (m.kind === "staff" ? eq(talkPresence.staffId, m.id) : eq(talkPresence.kioskId, m.id));
const fresh = () => gt(talkPresence.seenAt, sql`now() - ${PRESENCE_TTL_MS} * interval '1 millisecond'`);
const SESSION = /^[\w-]{8,100}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
// Branch ids come from our own list, so they can be written as a Postgres array literal
const pgArray = (ids: string[]) => `{${ids.filter((id) => ALL.includes(id)).join(",")}}`;

/** The caller's own session row, still on channels they're allowed on; anything else is someone else's */
async function own(m: Member, sessionId: unknown) {
  if (typeof sessionId !== "string" || !SESSION.test(sessionId)) return null;
  const [row] = await db.select().from(talkPresence).where(and(eq(talkPresence.sessionId, sessionId), whose(m))).limit(1);
  return row && row.branches.every((b) => m.channels.includes(b)) ? row : null;
}

const ping = (branchIds: string[]) => announce(branchIds.map(live.talk));

/** Opens this device's live session. Others start hearing it once its microphone track is up (publish). */
export async function join(m: Member, wanted: unknown) {
  const channels = pickChannels(m.channels, wanted);
  const [session, ice] = await Promise.all([openSession(), iceServers()]);
  await db.insert(talkPresence).values({
    sessionId: session.sessionId,
    staffId: m.kind === "staff" ? m.id : null,
    kioskId: m.kind === "counter" ? m.id : null,
    name: m.name,
    branches: channels,
  });
  return { sessionId: session.sessionId, ice, channels };
}

const isSdp = (v: unknown, type: Sdp["type"]): v is Sdp =>
  !!v && typeof v === "object" && (v as Sdp).type === type && typeof (v as Sdp).sdp === "string" && (v as Sdp).sdp.length < 30_000;

/**
 * The device's track goes up on joining. Cloudflare only hands a track to listeners once packets
 * flow on it, so it's offered to them (track_name set) when the device says its keep-alive silence
 * is flowing (live), or at its first press. After that a press only switches the sound on.
 */
export async function publish(m: Member, sessionId: unknown, offer: unknown, mid: unknown) {
  const row = await own(m, sessionId);
  if (!row) return null;
  if (!isSdp(offer, "offer") || typeof mid !== "string" || mid.length > 16) throw new Error("Bad publish request");
  const r = await pushTrack(row.sessionId, offer, mid, TRACK);
  await db.update(talkPresence).set({ seenAt: sql`now()` }).where(eq(talkPresence.sessionId, row.sessionId));
  await ping(row.branches);
  return { answer: r.sessionDescription };
}

/** The device's track is carrying packets: listeners can pick it up now */
export async function markLive(m: Member, sessionId: unknown) {
  const row = await own(m, sessionId);
  if (!row) return null;
  if (!row.trackName) {
    await db.update(talkPresence).set({ trackName: TRACK }).where(eq(talkPresence.sessionId, row.sessionId));
    await ping(row.branches);
  }
  return {};
}

/** Starts receiving others' microphones. Only devices on a shared channel can be pulled. */
export async function pull(m: Member, sessionId: unknown, tracks: unknown) {
  const row = await own(m, sessionId);
  if (!row) return null;
  const asked = (Array.isArray(tracks) ? tracks : [])
    .slice(0, 20)
    .map((t) => ({ sessionId: String((t as Person)?.sessionId ?? ""), trackName: String((t as Person)?.trackName ?? "") }))
    .filter((t) => SESSION.test(t.sessionId) && t.sessionId !== row.sessionId);
  if (asked.length === 0) return { offer: null, tracks: [] };
  const there = await db
    .select({ sessionId: talkPresence.sessionId, trackName: talkPresence.trackName })
    .from(talkPresence)
    .where(and(inArray(talkPresence.sessionId, asked.map((a) => a.sessionId)), isNotNull(talkPresence.trackName), fresh(), arrayOverlaps(talkPresence.branches, row.branches)));
  const ok = asked.filter((a) => there.some((t) => t.sessionId === a.sessionId && t.trackName === a.trackName));
  if (ok.length === 0) return { offer: null, tracks: [] };
  const r = await pullTracks(row.sessionId, ok);
  return {
    offer: r.sessionDescription ?? null,
    tracks: r.tracks.map((t, i) => ({
      mid: t.mid ?? null,
      sessionId: t.sessionId ?? ok[i]?.sessionId,
      error: t.errorDescription ?? t.errorCode ?? null,
    })),
  };
}

/** The device's answer to Cloudflare's offer after a pull */
export async function answer(m: Member, sessionId: unknown, sdp: unknown) {
  const row = await own(m, sessionId);
  if (!row) return null;
  if (!isSdp(sdp, "answer")) throw new Error("Bad answer");
  await renegotiate(row.sessionId, sdp);
  return {};
}

/** Checks in (still here) and returns who's on, who's talking and the recent clips */
export async function state(m: Member, sessionId: unknown): Promise<TalkView | null> {
  const row = await own(m, sessionId);
  if (!row) return null;
  await db.update(talkPresence).set({ seenAt: sql`now()` }).where(eq(talkPresence.sessionId, row.sessionId));
  const [people, floor, clips] = await Promise.all([
    db
      .select({ sessionId: talkPresence.sessionId, name: talkPresence.name, trackName: talkPresence.trackName, branches: talkPresence.branches })
      .from(talkPresence)
      .where(and(fresh(), arrayOverlaps(talkPresence.branches, row.branches))),
    db
      .select({
        branchId: talkFloor.branchId,
        sessionId: talkFloor.sessionId,
        name: talkFloor.name,
        // Worked out on the database's clock, so phones with a wrong clock still count down right
        left: sql<number>`(extract(epoch from (${talkFloor.until} - now())) * 1000)::int`,
      })
      .from(talkFloor)
      .where(and(inArray(talkFloor.branchId, row.branches), gt(talkFloor.until, sql`now()`))),
    m.kind === "staff" ? recentClips(m, row.branches) : Promise.resolve([]),
  ]);
  return {
    channels: row.branches,
    people: people.map((p) => ({ ...p, me: p.sessionId === row.sessionId })),
    floor,
    clips,
  };
}

/**
 * Takes the channel on every branch this device is on, or none: if anyone else holds one of them,
 * nothing changes and their name comes back. A hold lapses by itself after the one-minute limit.
 */
export async function take(m: Member, sessionId: unknown): Promise<{ ok: true; maxMs: number } | { ok: false; busy: string } | null> {
  const row = await own(m, sessionId);
  if (!row) return null;
  const won = await db.execute<{ branch_id: string }>(sql`
    insert into talk_floor (branch_id, session_id, name, started_at, until)
    select b, ${row.sessionId}, ${row.name}, now(), now() + ${TALK_MAX_MS + FLOOR_GRACE_MS} * interval '1 millisecond'
    from unnest(${pgArray(row.branches)}::text[]) as b
    on conflict (branch_id) do update
      set session_id = excluded.session_id, name = excluded.name, started_at = excluded.started_at, until = excluded.until
      where talk_floor.until <= now() or talk_floor.session_id = excluded.session_id
    returning branch_id`);
  const got = won.rows.map((r) => r.branch_id);
  // Its first press: listeners can now receive this device's microphone
  if (got.length === row.branches.length && !row.trackName) {
    await db.update(talkPresence).set({ trackName: TRACK }).where(eq(talkPresence.sessionId, row.sessionId));
  }
  if (got.length < row.branches.length) {
    if (got.length) {
      await db.update(talkFloor).set({ until: sql`now()` }).where(and(eq(talkFloor.sessionId, row.sessionId), inArray(talkFloor.branchId, got)));
    }
    const [holder] = await db
      .select({ name: talkFloor.name })
      .from(talkFloor)
      .where(and(inArray(talkFloor.branchId, row.branches), gt(talkFloor.until, sql`now()`), sql`${talkFloor.sessionId} <> ${row.sessionId}`))
      .limit(1);
    return { ok: false, busy: holder?.name ?? "Someone" };
  }
  await ping(row.branches);
  return { ok: true, maxMs: TALK_MAX_MS };
}

export async function release(m: Member, sessionId: unknown) {
  const row = await own(m, sessionId);
  if (!row) return null;
  const freed = await db
    .update(talkFloor)
    .set({ until: sql`now()` })
    .where(and(eq(talkFloor.sessionId, row.sessionId), gt(talkFloor.until, sql`now()`)))
    .returning({ branchId: talkFloor.branchId });
  if (freed.length) await ping(row.branches);
  return {};
}

/** The device closed Talk (or the page): it's no longer listening, and can't still hold a channel */
export async function leave(m: Member, sessionId: unknown) {
  const row = await own(m, sessionId);
  if (!row) return {};
  await db.batch([
    db.update(talkFloor).set({ until: sql`now()` }).where(and(eq(talkFloor.sessionId, row.sessionId), gt(talkFloor.until, sql`now()`))),
    db.delete(talkPresence).where(eq(talkPresence.sessionId, row.sessionId)),
  ]);
  await ping(row.branches);
  return {};
}

/** Clocking out ends Talk on all of that person's devices */
export async function endTalkFor(staffId: string) {
  const gone = await db.delete(talkPresence).where(eq(talkPresence.staffId, staffId)).returning({ sessionId: talkPresence.sessionId, branches: talkPresence.branches });
  if (gone.length === 0) return;
  await db.update(talkFloor).set({ until: sql`now()` }).where(and(inArray(talkFloor.sessionId, gone.map((g) => g.sessionId)), gt(talkFloor.until, sql`now()`)));
  await ping([...new Set(gone.flatMap((g) => g.branches))]);
}

/**
 * Keeps a press as a clip for 7 days. Staff who were listening live count as having heard it; the
 * branch's other clocked-in staff (and the owner) get a "missed talk" notification.
 */
export async function saveClip(m: Member, sessionId: unknown, audio: unknown, msInput: unknown) {
  const row = await own(m, sessionId);
  if (!row) return null;
  if (!(audio instanceof Blob)) return { error: "No recording came through." };
  const clip = readClip({ mime: audio.type, ms: msInput, bytes: audio.size });
  if ("error" in clip) return { error: clip.error };
  const [{ n }] = await db
    .select({ n: count() })
    .from(talkClips)
    .where(and(m.kind === "staff" ? eq(talkClips.staffId, m.id) : eq(talkClips.kioskId, m.id), gt(talkClips.createdAt, sql`now() - interval '1 minute'`)));
  if (n >= 20) return { error: "That's a lot of talk in a minute. Wait a moment." };

  const speakerId = m.kind === "staff" ? m.id : null;
  const [saved] = await db
    .insert(talkClips)
    .values({
      branches: row.branches,
      staffId: speakerId,
      kioskId: m.kind === "counter" ? m.id : null,
      name: row.name,
      mime: clip.mime,
      ms: clip.ms,
      audio: Buffer.from(await audio.arrayBuffer()),
    })
    .returning({ id: talkClips.id });
  const listening = await db
    .select({ staffId: talkPresence.staffId })
    .from(talkPresence)
    .where(and(fresh(), isNotNull(talkPresence.staffId), arrayOverlaps(talkPresence.branches, row.branches)));
  const heardLive = new Set(listening.map((l) => l.staffId!).filter((id) => id !== speakerId));
  const heard = [...heardLive].map((staffId) => ({ clipId: saved.id, staffId, live: true }));
  if (speakerId) heard.push({ clipId: saved.id, staffId: speakerId, live: true });
  if (heard.length) await db.insert(talkHeard).values(heard).onConflictDoNothing();
  await ping(row.branches);
  notifyMissedTalk({ id: saved.id, name: row.name, ms: clip.ms, branches: row.branches, speakerId }, heardLive);
  return { id: saved.id };
}

const keptSince = () => sql`now() - ${CLIP_KEEP_DAYS} * interval '1 day'`;

async function recentClips(m: Member, channels: string[]): Promise<ClipView[]> {
  const rows = await db
    .select({ id: talkClips.id, name: talkClips.name, branches: talkClips.branches, ms: talkClips.ms, createdAt: talkClips.createdAt, staffId: talkClips.staffId })
    .from(talkClips)
    .where(and(arrayOverlaps(talkClips.branches, channels), gt(talkClips.createdAt, keptSince())))
    .orderBy(desc(talkClips.createdAt))
    .limit(40);
  if (rows.length === 0) return [];
  const heard = await db
    .select({ clipId: talkHeard.clipId, staffId: talkHeard.staffId, name: staff.name })
    .from(talkHeard)
    .innerJoin(staff, eq(staff.id, talkHeard.staffId))
    .where(inArray(talkHeard.clipId, rows.map((r) => r.id)));
  return rows.map((r) => {
    const of = heard.filter((h) => h.clipId === r.id);
    return {
      id: r.id,
      name: r.name,
      branches: r.branches,
      ms: r.ms,
      at: r.createdAt.toISOString(),
      mine: r.staffId === m.id,
      heard: of.some((h) => h.staffId === m.id),
      heardBy: of.filter((h) => h.staffId !== r.staffId).map((h) => h.name),
    };
  });
}

/** The recent talk on every channel this person may be on (Staff > Talk, before Talk is turned on) */
export const clipsFor = (m: Member) => recentClips(m, m.channels);

/** Clips on my channels from the last 7 days that I haven't heard (for the Talk link in the menu) */
export async function unheardCount(m: Member): Promise<number> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(talkClips)
    .where(
      and(
        arrayOverlaps(talkClips.branches, m.channels),
        gt(talkClips.createdAt, keptSince()),
        or(isNull(talkClips.staffId), sql`${talkClips.staffId} <> ${m.id}`),
        notExists(db.select({ x: sql`1` }).from(talkHeard).where(and(eq(talkHeard.clipId, talkClips.id), eq(talkHeard.staffId, m.id)))),
      ),
    );
  return n;
}

/** A clip on one of my channels, still within its 7 days */
const clipOf = (m: Member, clipId: string) =>
  and(eq(talkClips.id, clipId), arrayOverlaps(talkClips.branches, m.channels), gt(talkClips.createdAt, keptSince()));

export async function clipAudio(m: Member, clipId: unknown) {
  if (typeof clipId !== "string" || !UUID.test(clipId)) return null;
  const [clip] = await db.select({ mime: talkClips.mime, audio: talkClips.audio }).from(talkClips).where(clipOf(m, clipId)).limit(1);
  return clip ?? null;
}

export async function markHeard(m: Member, clipId: unknown) {
  if (m.kind !== "staff" || typeof clipId !== "string" || !UUID.test(clipId)) return {};
  const [clip] = await db.select({ id: talkClips.id }).from(talkClips).where(clipOf(m, clipId)).limit(1);
  if (clip) await db.insert(talkHeard).values({ clipId: clip.id, staffId: m.id }).onConflictDoNothing();
  return {};
}

/** Nightly: clips go after 7 days, and devices that vanished without saying goodbye after a day */
export async function removeOldTalk(): Promise<{ clips: number }> {
  const gone = await db.delete(talkClips).where(lt(talkClips.createdAt, keptSince())).returning({ id: talkClips.id });
  await db.delete(talkPresence).where(lt(talkPresence.seenAt, sql`now() - interval '1 day'`));
  return { clips: gone.length };
}
