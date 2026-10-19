import "server-only";

/**
 * Cloudflare Realtime (the SFU that carries push-to-talk audio). Each phone on the Talk screen
 * keeps one WebRTC connection, a "session", to Cloudflare: a talker pushes their microphone as a
 * track, listeners pull it. The app secret stays here; browsers only see their own session.
 * Docs: developers.cloudflare.com/realtime (Connection API, 2024-05-21).
 */
const API = "https://rtc.live.cloudflare.com/v1";

export type Sdp = { type: "offer" | "answer"; sdp: string };
type Failure = { errorCode?: string; errorDescription?: string };
export type PulledTrack = { mid: string; trackName: string; sessionId: string } & Failure;

export const talkConfigured = () => Boolean(process.env.REALTIME_SFU_APP_ID && process.env.REALTIME_SFU_APP_SECRET);

async function call<T>(method: "POST" | "PUT" | "GET", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}/apps/${process.env.REALTIME_SFU_APP_ID}${path}`, {
    method,
    headers: { Authorization: `Bearer ${process.env.REALTIME_SFU_APP_SECRET}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as T & Failure;
  if (!res.ok || data.errorCode) throw new Error(`Realtime ${method} ${path.replace(/[0-9a-f]{32}/g, "…")}: ${res.status} ${data.errorDescription ?? data.errorCode ?? ""}`.trim());
  return data;
}

/**
 * A phone's session. Without an offer it's only an id: the first push or pull connects it
 * (a listener's first pull gets an offer from Cloudflare to answer).
 */
export const openSession = (offer?: Sdp) =>
  call<{ sessionId: string; sessionDescription?: Sdp }>("POST", "/sessions/new", offer ? { sessionDescription: offer } : undefined);

/** A talker's microphone goes up: the offer carries the new sending track, the answer comes back */
export const pushTrack = (sessionId: string, offer: Sdp, mid: string, trackName: string) =>
  call<{ sessionDescription: Sdp; requiresImmediateRenegotiation: boolean }>("POST", `/sessions/${sessionId}/tracks/new`, {
    sessionDescription: offer,
    tracks: [{ location: "local", mid, trackName }],
  });

/** A listener asks for someone's microphone: Cloudflare sends an offer the phone must answer (renegotiate) */
export const pullTracks = (sessionId: string, tracks: { sessionId: string; trackName: string }[]) =>
  call<{ sessionDescription?: Sdp; requiresImmediateRenegotiation: boolean; tracks: PulledTrack[] }>("POST", `/sessions/${sessionId}/tracks/new`, {
    tracks: tracks.map((t) => ({ location: "remote", ...t })),
  });

export const renegotiate = (sessionId: string, answer: Sdp) => call<object>("PUT", `/sessions/${sessionId}/renegotiate`, { sessionDescription: answer });

/** Stops forwarding tracks without another offer/answer round (a talker leaving, a listener done) */
export const closeTracks = (sessionId: string, mids: string[]) =>
  call<object>("PUT", `/sessions/${sessionId}/tracks/close`, { tracks: mids.map((mid) => ({ mid })), force: true });

/**
 * Where phones find Cloudflare: STUN always, and TURN relays (free with the SFU) when a TURN key is
 * set, for mobile networks that block a direct connection. Credentials last a shift.
 */
export async function iceServers(): Promise<RTCIceServer[]> {
  const stun: RTCIceServer[] = [{ urls: "stun:stun.cloudflare.com:3478" }];
  const id = process.env.REALTIME_TURN_KEY_ID;
  const token = process.env.REALTIME_TURN_KEY_TOKEN;
  if (!id || !token) return stun;
  try {
    const res = await fetch(`${API}/turn/keys/${id}/credentials/generate-ice-servers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ttl: 12 * 3600 }),
      cache: "no-store",
    });
    if (!res.ok) return stun;
    const { iceServers } = (await res.json()) as { iceServers: RTCIceServer | RTCIceServer[] };
    // Port 53 addresses can stall browsers that gather all candidates first
    return [iceServers]
      .flat()
      .map((s) => ({ ...s, urls: [s.urls].flat().filter((u) => !/:53(\?|$)/.test(u)) }))
      .filter((s) => s.urls.length > 0);
  } catch {
    return stun;
  }
}
