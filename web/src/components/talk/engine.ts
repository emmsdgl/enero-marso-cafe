import type { ClipView, FloorView, Person } from "@/lib/talk";
import { CLIP_MIN_MS, MIC_IDLE_MS, TALK_MAX_MS } from "@/lib/talk-rules";

/**
 * Push-to-talk in the browser. One engine per page app (the staff app or the counter tablet) keeps:
 * - a live audio connection to Cloudflare, with this device's microphone track published from the
 *   start; listeners pick it up at its first press, and after that a press only switches sound on;
 * - every other device's track, each playing in its own <audio> element;
 * - the microphone, opened on a press and closed 30 s after the last one (no mic light all shift);
 * - a recording of each press, sent to be kept 7 days for whoever wasn't listening.
 * Screens read it through subscribe/getSnapshot (useSyncExternalStore).
 */
export type Press = "idle" | "starting" | "on" | "busy";
export type Floor = FloorView & { until: number }; // `until` on this device's clock
export type Snapshot = {
  phase: "off" | "joining" | "on";
  error: string | null; // why it's off, or what's going wrong while it reconnects
  code: string | null;
  needsTap: boolean; // the browser blocked sound until someone taps
  connected: boolean;
  channels: string[];
  people: Person[];
  floor: Floor[];
  clips: ClipView[];
  press: Press;
  busyBy: string | null;
  onAirSince: number | null;
  micError: string | null;
};

const INITIAL: Snapshot = {
  phase: "off", error: null, code: null, needsTap: false, connected: false, channels: [], people: [], floor: [], clips: [],
  press: "idle", busyBy: null, onAirSince: null, micError: null,
};

// Formats every browser here can play back: MP4/AAC first (Safari and newer Chrome record it), then Opus
const CLIP_TYPES = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
const FINAL = new Set(["not-member", "off", "signed-out", "forbidden"]);

type Reply = { ok: boolean; code?: string; error?: string; [k: string]: unknown };
class Failure extends Error {
  constructor(public reply: Reply) {
    super(reply.error ?? reply.code ?? "Talk failed");
  }
}

/**
 * Turns on Opus "DTX" for what this device sends: during silence it sends a tiny packet every 0.4 s
 * instead of 50 a second. Browsers take the setting from the other side's description, so it's
 * added to every description Cloudflare sends back.
 */
function withDtx(desc: RTCSessionDescriptionInit): RTCSessionDescriptionInit {
  const sdp = desc.sdp ?? "";
  const opus = [...sdp.matchAll(/a=rtpmap:(\d+) opus\/48000/gi)].map((m) => m[1]);
  let out = sdp;
  for (const pt of opus) {
    out = out.replace(new RegExp(`a=fmtp:${pt} ([^\\r\\n]*)`, "g"), (line, params: string) => (/usedtx=/.test(params) ? line : `a=fmtp:${pt} ${params};usedtx=1`));
  }
  return { type: desc.type, sdp: out };
}

function micMessage(e: unknown) {
  const name = (e as DOMException)?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "The microphone is blocked for this site. Allow it in your browser's site settings, then try again.";
  if (name === "NotFoundError") return "No microphone found on this device.";
  return "The microphone didn't start. Try again.";
}

export class TalkEngine {
  private snap: Snapshot = INITIAL;
  private subs = new Set<() => void>();
  private gen = 0; // each connection gets a number; replies for an older one are ignored
  private session: string | null = null;
  private pc: RTCPeerConnection | null = null;
  private sender: RTCRtpSender | null = null;
  private queue: Promise<unknown> = Promise.resolve();
  private pulled = new Map<string, { mid: string | null; el: HTMLAudioElement | null }>(); // by the other device's session
  private byMid = new Map<string, string>();
  private retryAt = new Map<string, number>(); // devices not receivable yet: when to ask again
  private pool: HTMLAudioElement[] = [];
  private departed = 0;
  private mic: MediaStreamTrack | null = null;
  private audio: AudioContext | null = null;
  private hush: MediaStreamTrack | null = null;
  private recorder: { stop: (ms: number) => void } | null = null;
  private pressId = 0;
  private timers = { poll: 0, max: 0, mic: 0, retry: 0, expire: 0, refresh: 0 };
  private wanted: string[] | undefined;
  private refreshing = false;
  private again = false;
  private failures = 0;
  private live: { disconnect: () => void } | null = null;
  private liveUp = false;
  private listening = false;

  constructor(private base: string) {}

  subscribe = (fn: () => void) => {
    this.subs.add(fn);
    return () => void this.subs.delete(fn);
  };
  getSnapshot = () => this.snap;
  static initial = INITIAL;

  private set(p: Partial<Snapshot>) {
    this.snap = { ...this.snap, ...p };
    for (const fn of this.subs) fn();
  }

  private async call(op: string, body: Record<string, unknown> = {}): Promise<Reply> {
    try {
      const res = await fetch(this.base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, sessionId: this.session, ...body }),
        cache: "no-store",
      });
      // A sign-in page instead of JSON means the session ended
      return await res.json().catch(() => ({ ok: false, code: res.redirected || res.status === 401 ? "signed-out" : "error", error: "Sign in again to use Talk." }));
    } catch {
      return { ok: false, code: "error", error: "No connection. Trying again…" };
    }
  }

  /** One offer/answer at a time on the connection: Cloudflare needs each to finish before the next */
  private serial<T>(job: () => Promise<T>): Promise<T> {
    const run = this.queue.then(job);
    this.queue = run.catch(() => {});
    return run;
  }

  // ——— Sound ———

  /**
   * Call from a tap: browsers (iPhones especially) only let a page play sound after one. Elements
   * started here can play the incoming voices later without another tap.
   */
  unlock() {
    while (this.pool.length + this.pulled.size < 6) this.pool.push(this.element());
    const all = [...this.pool, ...[...this.pulled.values()].map((p) => p.el).filter((e): e is HTMLAudioElement => !!e)];
    this.set({ needsTap: false });
    for (const el of all) {
      if (!el.srcObject) el.srcObject = new MediaStream();
      // Refused without a tap (a tablet starting by itself): ask for one
      el.play().catch((e: DOMException) => e?.name === "NotAllowedError" && this.set({ needsTap: true }));
    }
    if (this.audio?.state === "suspended") this.audio.resume().catch(() => {});
  }

  /**
   * Silence to send while the microphone is off. Cloudflare drops a track that carries no packets
   * for a while, so each device keeps its own alive with this (a tiny packet every 0.4 s).
   */
  private quiet(): MediaStreamTrack | null {
    try {
      if (!this.audio) this.audio = new AudioContext();
      if (this.audio.state === "suspended") this.audio.resume().catch(() => {});
      if (this.hush?.readyState !== "live") {
        const out = this.audio.createMediaStreamDestination();
        const zero = this.audio.createConstantSource();
        zero.offset.value = 0;
        zero.connect(out);
        zero.start();
        this.hush = out.stream.getAudioTracks()[0];
      }
      return this.hush;
    } catch {
      return null;
    }
  }

  private element() {
    const el = document.createElement("audio");
    el.autoplay = true;
    el.setAttribute("playsinline", "");
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }

  private attach(mid: string | null, track: MediaStreamTrack) {
    const sid = mid ? this.byMid.get(mid) : undefined;
    const entry = sid ? this.pulled.get(sid) : undefined;
    const el = entry?.el ?? this.pool.pop() ?? this.element();
    el.srcObject = new MediaStream([track]);
    el.play().catch(() => this.set({ needsTap: true }));
    if (entry) entry.el = el;
  }

  private free(entry: { el: HTMLAudioElement | null }) {
    if (!entry.el) return;
    entry.el.pause();
    entry.el.srcObject = new MediaStream();
    this.pool.push(entry.el);
    entry.el = null;
  }

  /** iPhones can pause playback when the app comes back or the microphone closes */
  private replay() {
    for (const p of this.pulled.values()) p.el?.play().catch(() => this.set({ needsTap: true }));
  }

  // ——— Joining ———

  /** Turns Talk on. Call it from a tap, so sound is allowed. Admins may pass the branches to listen to. */
  async start(channels?: string[]) {
    if (channels) this.wanted = channels;
    this.unlock();
    this.watchPage();
    if (this.snap.phase === "off") await this.build();
  }

  /** The admin switched branches: reconnect on the new ones */
  async setChannels(channels: string[]) {
    this.wanted = channels;
    if (this.snap.phase !== "off") await this.build();
  }

  private async build() {
    // A new connection doesn't hold the old one's channel: stop talking first
    this.release();
    const gen = ++this.gen;
    this.teardown(true);
    this.set({ phase: "joining", connected: false });
    try {
      const j = await this.call("join", { channels: this.wanted });
      if (gen !== this.gen) return;
      if (!j.ok) throw new Failure(j);
      this.session = j.sessionId as string;
      const pc = new RTCPeerConnection({ iceServers: j.ice as RTCIceServer[], bundlePolicy: "max-bundle" });
      this.pc = pc;
      pc.ontrack = (e) => this.attach(e.transceiver.mid, e.track);
      pc.onconnectionstatechange = () => this.onConnection(gen);
      const tr = pc.addTransceiver("audio", { direction: "sendonly" });
      this.sender = tr.sender;
      await tr.sender.replaceTrack(this.mic?.readyState === "live" ? this.mic : this.quiet());
      await this.serial(async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        const p = await this.call("publish", { offer: { type: "offer", sdp: offer.sdp }, mid: tr.mid });
        if (!p.ok) throw new Failure(p);
        await pc.setRemoteDescription(withDtx(p.answer as RTCSessionDescriptionInit));
      });
      if (gen !== this.gen) return;
      this.failures = 0;
      this.set({ phase: "on", error: null, code: null, channels: j.channels as string[] });
      this.listen(j.channels as string[]);
      await this.refresh();
      this.schedule();
      this.announceLive(gen);
    } catch (e) {
      if (gen !== this.gen) return;
      const reply = e instanceof Failure ? e.reply : { ok: false, code: "error" };
      if (FINAL.has(reply.code ?? "")) return this.stop(reply.error ?? null, reply.code ?? null);
      // Cloudflare or the network hiccuped: try again, waiting longer each time
      this.failures++;
      this.set({ phase: "joining", error: "Connecting to Talk…" });
      clearTimeout(this.timers.retry);
      this.timers.retry = window.setTimeout(() => gen === this.gen && this.build(), Math.min(30_000, 1500 * 2 ** Math.min(this.failures, 5)));
    }
  }

  /**
   * Once this device's track is carrying packets (its keep-alive silence), listeners can receive it:
   * the server is told, so they pick it up now rather than on its first press.
   */
  private announceLive(gen: number, tries = 0) {
    window.setTimeout(async () => {
      if (gen !== this.gen || !this.pc) return;
      let sent = 0;
      (await this.pc.getStats(this.sender?.track ?? null).catch(() => new Map())).forEach((r: { type: string; packetsSent?: number }) => {
        if (r.type === "outbound-rtp") sent = Math.max(sent, r.packetsSent ?? 0);
      });
      if (sent > 0) return void this.call("live").then(() => this.refreshSoon());
      // Sound is still locked (no tap yet): the first press makes it receivable instead
      if (tries < 20) this.announceLive(gen, tries + 1);
    }, 1500);
  }

  private onConnection(gen: number) {
    if (gen !== this.gen || !this.pc) return;
    const s = this.pc.connectionState;
    this.set({ connected: s === "connected" });
    if (s === "failed") this.build();
    if (s === "disconnected") {
      // Phones switching between Wi-Fi and mobile data usually recover by themselves; if not, reconnect
      window.setTimeout(() => gen === this.gen && this.pc?.connectionState !== "connected" && this.build(), 8000);
    }
  }

  /** Turns Talk off on this device, saying why if it wasn't the person's choice */
  stop(error: string | null = null, code: string | null = null) {
    ++this.gen;
    this.release();
    this.teardown(false);
    this.closeMic();
    this.live?.disconnect();
    this.live = null;
    this.liveUp = false;
    Object.values(this.timers).forEach((t) => clearTimeout(t));
    this.set({ ...INITIAL, error, code, clips: this.snap.clips });
  }

  private teardown(keepMic: boolean) {
    if (this.session) {
      // keepalive: still sent if the page is closing
      fetch(this.base, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "leave", sessionId: this.session }) }).catch(() => {});
    }
    this.session = null;
    this.pc?.close();
    this.pc = null;
    this.sender = null;
    this.queue = Promise.resolve();
    for (const p of this.pulled.values()) this.free(p);
    this.pulled.clear();
    this.byMid.clear();
    this.retryAt.clear();
    this.departed = 0;
    if (!keepMic) this.recorder?.stop(0);
  }

  // ——— Staying current ———

  /** Pings from Pusher (in production) make every device check at once; otherwise it checks every 2 s */
  private listen(channels: string[]) {
    this.live?.disconnect();
    this.live = null;
    this.liveUp = false;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;
    const gen = this.gen;
    import("pusher-js").then(({ default: Pusher }) => {
      if (gen !== this.gen) return;
      const p = new Pusher(key, { cluster });
      for (const b of channels) p.subscribe(`talk-${b}`).bind("changed", () => this.refreshSoon());
      p.connection.bind("state_change", ({ current }: { current: string }) => {
        this.liveUp = current === "connected";
        this.schedule();
      });
      this.live = { disconnect: () => p.disconnect() };
    });
  }

  private refreshSoon() {
    clearTimeout(this.timers.refresh);
    this.timers.refresh = window.setTimeout(() => this.refresh(), 80);
  }

  private schedule() {
    clearTimeout(this.timers.poll);
    if (this.snap.phase !== "on") return;
    const visible = document.visibilityState === "visible";
    // Also the "still here" check-in: well inside the 75 s after which a device counts as gone
    const ms = this.liveUp ? 20_000 : visible ? 2_000 : 10_000;
    this.timers.poll = window.setTimeout(async () => {
      await this.refresh();
      this.schedule();
    }, ms);
  }

  async refresh() {
    if (!this.session) return;
    if (this.refreshing) {
      this.again = true;
      return;
    }
    this.refreshing = true;
    const gen = this.gen;
    try {
      const r = await this.call("state");
      if (gen !== this.gen) return;
      if (!r.ok) return this.trouble(r);
      this.failures = 0;
      const at = Date.now();
      const floor = (r.floor as FloorView[]).map((f) => ({ ...f, until: at + f.left }));
      this.set({ people: r.people as Person[], floor, clips: r.clips as ClipView[], channels: r.channels as string[], error: null });
      // Check again the moment a hold lapses (a phone that vanished mid-talk)
      clearTimeout(this.timers.expire);
      const next = Math.min(...floor.map((f) => f.left));
      if (Number.isFinite(next)) this.timers.expire = window.setTimeout(() => this.refresh(), next + 250);
      this.syncPulls(r.people as Person[]);
    } finally {
      this.refreshing = false;
      if (this.again) {
        this.again = false;
        this.refresh();
      }
    }
  }

  private trouble(r: Reply) {
    if (FINAL.has(r.code ?? "")) return this.stop(r.code === "not-member" ? "You clocked out, so Talk is off." : (r.error ?? null), r.code ?? null);
    if (r.code === "gone") return this.build();
    if (++this.failures >= 5) this.build();
  }

  /**
   * Starts receiving devices that joined; lets go of ones that left. Cloudflare only hands over a
   * microphone once it has sent sound, so a device that hasn't talked yet is tried every 20 s, and
   * one that just started talking right away (and every 0.4 s until it comes through).
   */
  private syncPulls(people: Person[]) {
    const now = Date.now();
    const others = people.filter((p) => !p.me && p.trackName);
    for (const [sid, entry] of this.pulled) {
      if (others.some((p) => p.sessionId === sid)) continue;
      this.free(entry);
      this.pulled.delete(sid);
      this.departed++;
    }
    for (const sid of this.retryAt.keys()) if (!others.some((p) => p.sessionId === sid)) this.retryAt.delete(sid);
    // A tablet on all day collects old connections: start fresh once nobody is talking
    if (this.departed > 15 && this.snap.press === "idle" && !this.talker()) return void this.build();
    const talking = new Set(this.snap.floor.filter((f) => f.until > now).map((f) => f.sessionId));
    const fresh = others.filter((p) => !this.pulled.has(p.sessionId) && (talking.has(p.sessionId) || (this.retryAt.get(p.sessionId) ?? 0) <= now));
    if (fresh.length === 0) return;
    for (const p of fresh) this.pulled.set(p.sessionId, { mid: null, el: null });
    const gen = this.gen;
    const notYet = (sids: string[]) => {
      for (const sid of sids) {
        this.pulled.delete(sid);
        this.retryAt.set(sid, Date.now() + (talking.has(sid) ? 400 : 20_000));
      }
      if (sids.some((sid) => talking.has(sid))) window.setTimeout(() => gen === this.gen && this.syncPulls(this.snap.people), 450);
    };
    this.serial(async () => {
      if (gen !== this.gen || !this.pc) return;
      const r = await this.call("pull", { tracks: fresh.map((p) => ({ sessionId: p.sessionId, trackName: p.trackName })) });
      const got = new Set<string>();
      if (r.ok) {
        for (const t of r.tracks as { mid: string | null; sessionId: string; error: string | null }[]) {
          const entry = this.pulled.get(t.sessionId);
          if (!entry || t.error || !t.mid) continue;
          entry.mid = t.mid;
          this.byMid.set(t.mid, t.sessionId);
          this.retryAt.delete(t.sessionId);
          got.add(t.sessionId);
        }
      }
      notYet(fresh.map((p) => p.sessionId).filter((sid) => !got.has(sid)));
      if (!r.ok) return this.trouble(r);
      if (!r.offer || gen !== this.gen || !this.pc) return;
      await this.pc.setRemoteDescription(withDtx(r.offer as RTCSessionDescriptionInit));
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      const a = await this.call("answer", { answer: { type: "answer", sdp: answer.sdp } });
      if (!a.ok) this.trouble(a);
    }).catch(() => notYet(fresh.map((p) => p.sessionId).filter((sid) => !this.pulled.get(sid)?.mid)));
  }

  /** Someone else talking on my channels now, if anyone */
  talker() {
    const now = Date.now();
    return this.snap.floor.find((f) => f.until > now && f.sessionId !== this.session) ?? null;
  }

  // ——— Talking ———

  async press() {
    if (this.snap.phase !== "on" || this.snap.press !== "idle") return;
    const other = this.talker();
    if (other) return this.set({ press: "busy", busyBy: other.name });
    const id = ++this.pressId;
    this.set({ press: "starting", micError: null, busyBy: null });
    clearTimeout(this.timers.mic);
    const [mic, took] = await Promise.allSettled([this.openMic(), this.call("take")]);
    const won = took.status === "fulfilled" && took.value.ok;
    // Let go before it started: give the channel back
    if (id !== this.pressId || this.getSnapshot().press !== "starting") {
      if (won) this.call("release");
      return this.idleMic();
    }
    if (mic.status === "rejected") {
      if (won) this.call("release");
      return this.set({ press: "idle", micError: micMessage(mic.reason) });
    }
    if (!won) {
      const r = took.status === "fulfilled" ? took.value : null;
      this.idleMic();
      if (r?.code === "busy") return this.set({ press: "busy", busyBy: String(r.busy) });
      this.set({ press: "idle", micError: "Couldn't start talking. Try again." });
      if (r) this.trouble(r);
      return;
    }
    const track = mic.value;
    if (this.sender && this.sender.track !== track) await this.sender.replaceTrack(track).catch(() => {});
    track.enabled = true;
    this.record(track);
    this.set({ press: "on", onAirSince: Date.now() });
    clearTimeout(this.timers.max);
    this.timers.max = window.setTimeout(() => this.release(), TALK_MAX_MS);
  }

  release() {
    const was = this.snap.press;
    if (was === "idle") return;
    this.pressId++;
    clearTimeout(this.timers.max);
    if (was !== "on") return this.set({ press: "idle", busyBy: null });
    this.recorder?.stop(Date.now() - (this.snap.onAirSince ?? Date.now()));
    if (this.mic) this.mic.enabled = false;
    this.set({ press: "idle", onAirSince: null });
    this.call("release").then(() => this.refreshSoon());
    this.idleMic();
  }

  private async openMic() {
    if (this.mic?.readyState === "live") return this.mic;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    this.mic = stream.getAudioTracks()[0];
    this.mic.enabled = false;
    return this.mic;
  }

  /** Keeps the microphone ready for a quick reply, then closes it */
  private idleMic() {
    clearTimeout(this.timers.mic);
    this.timers.mic = window.setTimeout(() => {
      if (this.snap.press !== "idle") return;
      this.closeMic();
      this.replay();
    }, MIC_IDLE_MS);
  }

  private closeMic() {
    clearTimeout(this.timers.mic);
    this.mic?.stop();
    this.mic = null;
    this.sender?.replaceTrack(this.quiet()).catch(() => {});
  }

  /** Records this press; on letting go it's sent to be kept (taps under 0.6 s aren't) */
  private record(track: MediaStreamTrack) {
    if (typeof MediaRecorder === "undefined") return;
    const type = CLIP_TYPES.find((t) => MediaRecorder.isTypeSupported(t));
    let rec: MediaRecorder;
    try {
      rec = new MediaRecorder(new MediaStream([track]), { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32_000 });
    } catch {
      return;
    }
    const chunks: Blob[] = [];
    let ms = 0;
    const session = this.session;
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      if (ms < CLIP_MIN_MS || !session || chunks.length === 0) return;
      const form = new FormData();
      form.set("sessionId", session);
      form.set("ms", String(Math.round(ms)));
      form.set("audio", new Blob(chunks, { type: (rec.mimeType || type || "audio/webm").replace(/\s+/g, "") }), "talk");
      fetch(this.base, { method: "POST", body: form })
        .then((r) => r.json())
        .then((r: Reply) => (r.ok ? this.refreshSoon() : r.code === "clip" && this.set({ micError: r.error ?? null })))
        .catch(() => {});
    };
    rec.start();
    this.recorder = {
      stop: (length) => {
        ms = length;
        this.recorder = null;
        if (rec.state !== "inactive") rec.stop();
      },
    };
  }

  // ——— The page around it ———

  private watchPage() {
    if (this.listening) return;
    this.listening = true;
    document.addEventListener("visibilitychange", () => {
      if (this.snap.phase === "off") return;
      if (document.visibilityState === "hidden") {
        // Switching apps mid-talk: stop talking rather than leave the channel held
        this.release();
        return this.schedule();
      }
      this.replay();
      if (this.pc && this.pc.connectionState !== "connected" && this.pc.connectionState !== "connecting") this.build();
      else this.refresh().then(() => this.schedule());
    });
    window.addEventListener("pagehide", () => {
      if (this.snap.phase !== "off") this.teardown(false);
    });
    // Back from the browser's page cache: the old connection was closed on the way out
    window.addEventListener("pageshow", (e) => {
      if (e.persisted && this.snap.phase !== "off") this.build();
    });
  }
}

const engines = new Map<string, TalkEngine>();
/** One engine per page app, kept across screens (and React's double effects in development) */
export function talkEngine(base: string) {
  let e = engines.get(base);
  if (!e) engines.set(base, (e = new TalkEngine(base)));
  return e;
}
