// Records the voice-over in src/voice.ts and checks that every line fits.
//   npm run voice         Microsoft's Filipino-English voice, with AZURE_SPEECH_KEY and AZURE_SPEECH_REGION from video/.env
//   npm run voice:draft   a Windows voice instead, for timing only (no key needed)
// Writes public/voice/<video>/<line>.wav and src/voice-durations.json (how long each line runs).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FPS, pitchTimeline, reelDelivery, reelPickup, reelTimeline } from "../src/timeline.ts";
import { lineId, script, voice } from "../src/voice.ts";

const root = path.resolve(import.meta.dirname, "..");
const envFile = path.join(root, ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const draft = process.argv.includes("--draft");
const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
if (!draft && (!key || !region)) {
  console.error("No Azure Speech key yet. Put AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in video/.env (see .env.example),\nor run `npm run voice:draft` for a timing draft with a Windows voice.");
  process.exit(1);
}

const timelines = { pitch: pitchTimeline(), reelPickup: reelTimeline(reelPickup), reelDelivery: reelTimeline(reelDelivery) };

const jobs = [];
for (const [cut, lines] of Object.entries(script)) {
  // Files are overwritten in place (Remotion Studio watches this folder); lines no longer in the script are removed
  const dir = path.join(root, "public", "voice", cut);
  mkdirSync(dir, { recursive: true });
  const ids = lines.map((line, i) => lineId(i, line));
  for (const f of readdirSync(dir)) if (!ids.includes(f.replace(/\.wav$/, ""))) rmSync(path.join(dir, f), { force: true });
  lines.forEach((line, i) => jobs.push({ cut, line, id: ids[i], file: path.join(dir, `${ids[i]}.wav`) }));
}

if (draft) speakDraft(jobs);
else for (const job of jobs) await speakAzure(job);
// Both voices pad each clip with silence (Azure adds almost a second at the end): trim it so lines sit where they're placed.
// Then bring every line to the same, broadcast-like level, so the voice holds up on phones next to other posts.
for (const job of jobs) writeFileSync(job.file, levelVoice(trimSilence(readFileSync(job.file))));

// How long each line runs, for the videos (placing the lines, lowering the music under them)
const durations = {};
for (const job of jobs) durations[`${job.cut}/${job.id}`] = Math.round(wavSeconds(readFileSync(job.file)) * 1000) / 1000;
writeFileSync(
  path.join(root, "src", "voice-durations.json"),
  JSON.stringify({ engine: draft ? `draft: ${voice.draft}` : voice.name, version: Date.now(), lines: durations }, null, 2) + "\n",
);

// Does every line end before the next one starts, and before the video ends?
let problems = 0;
for (const [cut, lines] of Object.entries(script)) {
  const t = timelines[cut];
  const placed = lines
    .map((line, i) => {
      const start = t.starts[line.scene] + Math.round(line.at * FPS);
      return { id: lineId(i, line), start, end: start + Math.ceil(durations[`${cut}/${lineId(i, line)}`] * FPS) };
    })
    .sort((a, b) => a.start - b.start);
  console.log(`\n${cut} (${(t.length / FPS).toFixed(1)} s)`);
  placed.forEach((p, i) => {
    const limit = i + 1 < placed.length ? placed[i + 1].start - 6 : t.length - 10;
    const room = (limit - p.end) / FPS;
    if (room < 0) problems++;
    console.log(`  ${p.id.padEnd(12)} ${(p.start / FPS).toFixed(1).padStart(5)} s  runs ${((p.end - p.start) / FPS).toFixed(1)} s  ${room < 0 ? `TOO LONG by ${(-room).toFixed(1)} s` : `${room.toFixed(1)} s to spare`}`);
  });
}
console.log(problems ? `\n${problems} line(s) run into the next one: shorten the text or move \`at\` in src/voice.ts.` : "\nEvery line fits.");

async function speakAzure({ line, file }) {
  const ssml = `<speak version="1.0" xml:lang="en-PH" xmlns="http://www.w3.org/2001/10/synthesis"><voice name="${voice.name}"><prosody rate="${voice.rate}">${escapeXml(line.text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": "riff-48khz-16bit-mono-pcm", "User-Agent": "enero-marso-video" },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure Speech answered ${res.status} ${res.statusText}. Check the key and region in video/.env.`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

// One PowerShell run for all lines, with Windows' own speech engine
function speakDraft(list) {
  const jobsFile = path.join(tmpdir(), "em-voice-jobs.json");
  const ps = path.join(tmpdir(), "em-voice.ps1");
  writeFileSync(jobsFile, JSON.stringify(list.map((j) => ({ file: j.file, text: j.line.text }))));
  writeFileSync(ps, `
Add-Type -AssemblyName System.Speech
$jobs = Get-Content -Raw -Encoding UTF8 $args[0] | ConvertFrom-Json
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
foreach ($job in $jobs) {
  $s = New-Object System.Speech.Synthesis.SpeechSynthesizer
  $s.SelectVoice('${voice.draft}')
  $s.Rate = 1 # a little quicker, closer to the Azure voice's pace
  $s.SetOutputToWaveFile($job.file, $format)
  $s.Speak($job.text)
  $s.Dispose()
}
`);
  execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps, jobsFile], { stdio: "inherit" });
}

/** Cuts the silence before and after the words (16-bit mono WAV), keeping a short natural lead and tail with soft edges */
function trimSilence(buf, { lead = 0.04, tail = 0.18, threshold = 0.02 } = {}) {
  const { rate, start, size } = wavInfo(buf);
  const n = size / 2;
  const sample = (i) => buf.readInt16LE(start + i * 2) / 32768;
  const loud = (i) => Math.abs(sample(i)) > threshold;
  let first = 0;
  while (first < n && !loud(first)) first++;
  let last = n - 1;
  while (last > first && !loud(last)) last--;
  const from = Math.max(0, first - Math.round(lead * rate));
  const to = Math.min(n, last + Math.round(tail * rate));
  const fade = Math.round(0.01 * rate);
  const out = Buffer.alloc(44 + (to - from) * 2);
  out.write("RIFF", 0); out.writeUInt32LE(36 + (to - from) * 2, 4); out.write("WAVE", 8);
  out.write("fmt ", 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22);
  out.writeUInt32LE(rate, 24); out.writeUInt32LE(rate * 2, 28); out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34);
  out.write("data", 36); out.writeUInt32LE((to - from) * 2, 40);
  for (let i = from; i < to; i++) {
    const edge = Math.min(1, (i - from) / fade, (to - 1 - i) / fade);
    out.writeInt16LE(Math.round(sample(i) * edge * 32767), 44 + (i - from) * 2);
  }
  return out;
}

/**
 * Brings speech to `target` dBFS (measured over the words, not the pauses) and keeps every peak under `ceiling` dBFS
 * with a look-ahead limiter, so louder words are held back smoothly instead of clipping.
 */
function levelVoice(buf, { target = -15, ceiling = -3 } = {}) {
  const { rate, start, size } = wavInfo(buf);
  const n = size / 2;
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = buf.readInt16LE(start + i * 2) / 32768;
  // Loudness of the words: 10 ms blocks above -45 dBFS
  const block = Math.round(rate / 100);
  let power = 0, blocks = 0;
  for (let b = 0; b + block <= n; b += block) {
    let sum = 0;
    for (let i = b; i < b + block; i++) sum += x[i] * x[i];
    if (sum / block > 10 ** (-45 / 10)) { power += sum / block; blocks++; }
  }
  if (!blocks) return buf;
  const gain = 10 ** (target / 20) / Math.sqrt(power / blocks);
  const limit = 10 ** (ceiling / 20);
  const ahead = Math.round(rate * 0.003); // 3 ms look-ahead
  const release = 1 - Math.exp(-1 / (rate * 0.08)); // 80 ms recovery
  const need = new Float64Array(n);
  for (let i = 0; i < n; i++) need[i] = Math.min(1, limit / Math.max(1e-9, Math.abs(x[i] * gain)));
  const out = Buffer.from(buf);
  let env = 1;
  for (let i = 0; i < n; i++) {
    let lowest = 1;
    for (let j = i; j < Math.min(n, i + ahead); j++) lowest = Math.min(lowest, need[j]);
    env = lowest < env ? lowest : env + (1 - env) * release;
    out.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(x[i] * gain * env * 32767))), start + i * 2);
  }
  return out;
}

function wavInfo(buf) {
  let rate = 0;
  for (let p = 12; p + 8 <= buf.length; ) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") rate = buf.readUInt32LE(p + 12);
    if (id === "data") return { rate, start: p + 8, size: Math.min(size, buf.length - p - 8) };
    p += 8 + size + (size % 2);
  }
  throw new Error("Not a WAV file");
}

function wavSeconds(buf) {
  let byteRate = 0;
  for (let p = 12; p + 8 <= buf.length; ) {
    const id = buf.toString("ascii", p, p + 4);
    const size = buf.readUInt32LE(p + 4);
    if (id === "fmt ") byteRate = buf.readUInt32LE(p + 16);
    if (id === "data") return Math.min(size, buf.length - p - 8) / byteRate;
    p += 8 + size + (size % 2);
  }
  throw new Error("Not a WAV file");
}

function escapeXml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
