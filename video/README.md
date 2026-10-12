# Enero Marso promo videos

Three videos about ordering online from Enero Marso, made with [Remotion](https://www.remotion.dev):

| Video | Size | Length |
|---|---|---|
| Pitch | 16:9 | 72.5 s |
| Reel-pickup | 9:16 | 26 s |
| Reel-delivery | 9:16 | 32 s |

The scene list is in `../remotion-video-storyboard.md`.

## Everyday commands

Run these from this folder.

| Command | What it does |
|---|---|
| `npm run studio` | Preview and scrub every video at http://localhost:3100. |
| `npm run voice` | Records the voice-over again after the script changes, and checks that every line fits. |
| `npm run render` | Renders all three MP4s to `out/`. To render one, use `render:pitch`, `render:reel-pickup` or `render:reel-delivery`. |

## Where to change things

- **Captions and sample data** (menu, prices, codes, chat lines): `src/content.ts`.
- **Scene lengths:** `src/timeline.ts`.
- **Voice-over and music:** `src/voice.ts`. It holds the script, which voice reads it, and the music file and volume.
- **Web address on the end cards:** the `site.url` value in `src/content.ts`.

## Sound files

Neither the music nor the voice files are in git: the repo is public, and the music's license forbids sharing the raw track. On a new computer:

1. **Music.** Download [Happy Jazz Old Cafe](https://pixabay.com/music/modern-jazz-happy-jazz-old-cafe-600362/) and save it as `public/music/happy-jazz-old-cafe.mp3`. Pixabay's license allows use in ads with no credit required.
2. **Voice.** Copy `.env.example` to `.env` and add the Azure Speech key and region (Azure portal, your Speech resource, Keys and Endpoint). Then run `npm run voice`. The voice is `en-PH-RosaNeural` and the free tier covers it. `.env` is never committed.

Until both are in place, the videos play without that sound.

## Before publishing

- **Remotion license:** Remotion is free for individuals and companies of up to 3 people. Check the terms at remotion.dev/license.
- **Web address:** make sure eneromarso.cafe is live. If it isn't, change `site.url`.
