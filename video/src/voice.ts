/**
 * The voice-over script (English) and the music. Each line starts `at` seconds into its scene (scene names are in timeline.ts).
 * After changing a line, run `npm run voice` to record it again; it also checks every line still fits before the next one.
 * Write words the way they should be said: "Enero Marso dot cafe", "thirty minutes".
 * (scripts/voice.mjs loads this file straight into Node, so it imports nothing.)
 */

/** Microsoft's Filipino-English voice (Azure Speech). en-PH-JamesNeural is the male voice. The draft uses a Windows voice, for timing only. */
export const voice = { name: "en-PH-RosaNeural", rate: "0%", draft: "Microsoft Zira Desktop" };

export type Line = { scene: string; at: number; text: string };

export const script: Record<"pitch" | "reelPickup" | "reelDelivery", Line[]> = {
  pitch: [
    { scene: "hook", at: 1.5, text: "Ordering from Enero Marso just got easier." },
    { scene: "problem", at: 0.5, text: "No more orders lost in a pile of chats and missed calls." },
    { scene: "pin", at: 0.3, text: "Customers order on our website, and pin their place on the map." },
    { scene: "order", at: 1.0, text: "Pick a drink, pick the size, and send the order. No app to download, and no account to make." },
    { scene: "staff", at: 0.5, text: "Our staff get it instantly, and send the delivery fee." },
    { scene: "pay", at: 0.6, text: "The customer pays by GCash, right on the page, and we confirm the payment before we start." },
    { scene: "chat", at: 0.8, text: "Every order gets its own chat. Less ice? Running late? Just send a message, and the staff see it right on that order." },
    { scene: "closes", at: 0.5, text: "Once it's delivered, the chat stays open for thirty minutes, in case anything's missing." },
    { scene: "pickup", at: 0.2, text: "Picking up? Just show your code." },
    { scene: "pickup", at: 3.5, text: "Every new order gets a fresh chat." },
    { scene: "outro", at: 0.8, text: "Order now at Enero Marso dot cafe." },
    { scene: "outro", at: 3.8, text: "Organized orders, checked payments, every chat on record." },
  ],
  reelPickup: [
    { scene: "hook", at: 0.4, text: "Skip the line at Enero Marso." },
    { scene: "order", at: 0.8, text: "Order ahead on our website. No app needed. Pick a drink, add a snack, and send it." },
    { scene: "chat", at: 0.5, text: "Need to change something? Message the cafe, right on your order." },
    { scene: "ready", at: 0.8, text: "We'll tell you when it's ready. Just show your code at the counter." },
    { scene: "cta", at: 0.4, text: "Order now at Enero Marso dot cafe." },
  ],
  reelDelivery: [
    { scene: "hook", at: 0.4, text: "Enero Marso, delivered." },
    { scene: "order", at: 0.8, text: "Pin your place, pick your drinks, and send your order. The cafe confirms the delivery fee." },
    { scene: "pay", at: 0.5, text: "Then pay by GCash, right on the page." },
    { scene: "out", at: 0.8, text: "Follow your order, and chat with us while it's on its way." },
    { scene: "done", at: 0.3, text: "Missing something? The chat stays open for thirty minutes." },
    { scene: "cta", at: 0.5, text: "Order now at Enero Marso dot cafe." },
  ],
};

/** A line's file name: its place in the script and its scene ("03-pin") */
export const lineId = (i: number, line: Line) => `${String(i + 1).padStart(2, "0")}-${line.scene}`;

/**
 * Background music: a file in public/music (null for none yet). `volume` is its level on its own,
 * `underVoice` its level while the voice talks; `startAt` skips into the track, in seconds.
 */
// "Happy Jazz Old Cafe" by ElectroAnimals, from Pixabay (free for ads, no credit needed): pixabay.com/music/modern-jazz-happy-jazz-old-cafe-600362
export const music = { file: "happy-jazz-old-cafe.mp3" as string | null, volume: 0.55, underVoice: 0.18, startAt: 0 };
