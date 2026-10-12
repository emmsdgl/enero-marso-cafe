import { getStaticFiles, Html5Audio, interpolate, Sequence, staticFile } from "remotion";
import { FPS, sec, type Timeline } from "../timeline";
import recorded from "../voice-durations.json";
import { lineId, music, script } from "../voice";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const durations = recorded.lines as Record<string, number>;
// The voice is mono; spreading it over both stereo channels costs 3 dB, so it's turned up by that much
const VOICE_GAIN = 1.41;

/**
 * A video's sound: each recorded voice line at its scene (src/voice.ts), and the music under everything,
 * fading in and out and dipping while the voice talks. Sound files that aren't in public/ (they're not in git) are skipped.
 */
export function Soundtrack({ cut, timeline }: { cut: keyof typeof script; timeline: Timeline }) {
  const present = new Set(getStaticFiles().map((f) => f.name.split("\\").join("/")));
  const lines = script[cut].flatMap((line, i) => {
    const id = lineId(i, line);
    const seconds = durations[`${cut}/${id}`];
    if (!seconds || !present.has(`voice/${cut}/${id}.wav`)) return [];
    return [{ id, from: timeline.starts[line.scene] + Math.round(line.at * FPS), frames: Math.ceil(seconds * FPS) }];
  });
  const low = music.underVoice / music.volume;
  const musicVolume = (f: number) => {
    const fade = Math.min(interpolate(f, [0, 20], [0, 1], clamp), interpolate(f, [timeline.length - 60, timeline.length - 4], [1, 0], clamp));
    const duck = lines.reduce((v, l) => Math.min(v, interpolate(f, [l.from - 8, l.from, l.from + l.frames, l.from + l.frames + 14], [1, low, low, 1], clamp)), 1);
    return music.volume * fade * duck;
  };
  return (
    <>
      {music.file && present.has(`music/${music.file}`) && <Html5Audio src={staticFile(`music/${music.file}`)} trimBefore={sec(music.startAt)} loop volume={musicVolume} />}
      {lines.map((l) => (
        <Sequence key={l.id} from={l.from} durationInFrames={l.frames + 3} layout="none" name={`Voice ${l.id}`}>
          {/* The version makes Studio fetch a line again after it's recorded again */}
          <Html5Audio src={`${staticFile(`voice/${cut}/${l.id}.wav`)}?v=${recorded.version}`} volume={VOICE_GAIN} />
        </Sequence>
      ))}
    </>
  );
}
