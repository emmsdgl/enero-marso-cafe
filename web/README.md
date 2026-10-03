# Enero Marso Cafe website

Next.js site for Enero Marso Cafe, 126 Champaca St., Western Bicutan, Taguig.

## Run it

```bash
npm install      # first time only
npm run dev      # http://localhost:3000
npm run build    # production build
```

## Pages

| Route | What it is |
|---|---|
| `/` | Landing page (Canva page 1) |
| `/home` | Homepage: hero video, Our Coffee, Our Food (Canva page 2) |
| `/menu` | Both branches' real menus with a branch switch and search |
| `/gallery`, `/store` | Gallery; Our Stores (both branches, hours, socials). `/contact` redirects here |

The gold logo loader plays once per browser visit (`src/components/Loader.tsx`).

## Editing content

- Menus and prices for both branches: `src/data/menu.ts`. Branch addresses, hours, socials: `src/data/branches.ts`.
- Photos: `public/photos/`. Hero video: `public/video/`. Logo files: `public/brand/`.
- Colors and fonts: top of `src/app/globals.css`. Brand fonts are Montserrat and Allura, matched to the logo.

Still to add: opening hours, phone/email, social links, and the rest of the menu.
