# Enero Marso Cafe website

Next.js site for Enero Marso Cafe, 126 Champaca St., Western Bicutan, Taguig.

## Run it

```bash
npm install      # first time only
npm run dev      # http://localhost:3000
npm run build    # production build
```

The scripts use webpack (`--webpack`) because this computer runs 32-bit Node, which Turbopack does not support. Vercel builds work either way.

## Pages

| Route | What it is |
|---|---|
| `/` | Landing page (Canva page 1) |
| `/home` | Homepage: hero video, Our Coffee, Our Food (Canva page 2) |
| `/menu` | Full menu with search |
| `/gallery`, `/store`, `/contact` | Supporting pages |

The gold logo loader plays once per browser visit (`src/components/Loader.tsx`).

## Editing content

- Menu items, prices, address: `src/data/menu.ts`. Items without a `photo` show a "Photo coming soon" card.
- Photos: `public/photos/`. Hero video: `public/video/`. Logo files: `public/brand/`.
- Colors and fonts: top of `src/app/globals.css`. Brand fonts are Montserrat and Allura, matched to the logo.

Still to add: opening hours, phone/email, social links, and the rest of the menu.
