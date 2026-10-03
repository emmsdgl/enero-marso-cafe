---
name: Enero Marso Cafe
description: Coffee, comfort & good conversations. Gold-on-roast cafe site built from the owner's Canva design.
colors:
  cream: "#faf1e1"
  sand: "#e1cdb3"
  card: "#d2b794"
  brown: "#834a22"
  gold: "#cf9d57"
  cocoa: "#503225"
  ink: "#151211"
typography:
  display:
    fontFamily: "Montserrat, Century Gothic, sans-serif"
    fontSize: "clamp(2.3rem, 7vw, 5.6rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.1em"
  headline:
    fontFamily: "Montserrat, Century Gothic, sans-serif"
    fontSize: "clamp(2.6rem, 5.4vw, 4.6rem)"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "0.01em"
  headline-hero:
    fontFamily: "Montserrat, Century Gothic, sans-serif"
    fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)"
    fontWeight: 500
    lineHeight: 1.05
    letterSpacing: "0.08em"
  script:
    fontFamily: "Allura, Brush Script MT, cursive"
    fontSize: "clamp(1.9rem, 3.4vw, 2.9rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "normal"
  title:
    fontFamily: "Montserrat, Century Gothic, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 700
    lineHeight: 1.6
    letterSpacing: "0.12em"
  body:
    fontFamily: "Montserrat, Century Gothic, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Montserrat, Century Gothic, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.2em"
  label-sm:
    fontFamily: "Montserrat, Century Gothic, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: "0.24em"
rounded:
  none: "0"
  pill: "999px"
  circle: "50%"
spacing:
  gutter: "clamp(1.25rem, 5vw, 5rem)"
  gap-sm: "0.75rem"
  gap-md: "1.5rem"
  section: "clamp(4.5rem, 10vw, 8rem)"
components:
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "1.05rem 2rem"
  button-ghost-hover:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
  button-pill:
    backgroundColor: "transparent"
    textColor: "{colors.brown}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "1rem 2.1rem"
  button-pill-hover:
    backgroundColor: "{colors.brown}"
    textColor: "{colors.cream}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.gold}"
    rounded: "{rounded.circle}"
    size: "2.75rem"
  button-icon-hover:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.ink}"
  button-round:
    backgroundColor: "transparent"
    rounded: "{rounded.circle}"
    size: "3rem"
  menu-card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.none}"
    width: "clamp(15rem, 21vw, 18.5rem)"
  menu-card-label:
    typography: "{typography.title}"
    padding: "1.1rem 1.1rem 1.4rem"
  input-search:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.4rem 1.25rem"
  info-panel:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "clamp(1.75rem, 4vw, 2.75rem)"
  nav-link:
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    padding: "0.5rem 0"
  nav-link-active:
    textColor: "{colors.gold}"
---

# Design System: Enero Marso Cafe

## Overview

**Creative North Star: "Gold Leaf on a Dark Roast"**

The site is the owner's Canva design made real for phones and the web: a near-black roast ground (ink) carrying the gold of the logo, opening into warm paper bands (sand, cream, card) where the menu lives. Photography and the barista video do the atmospheric work at the top of each page; below that, the system turns into a calm, well-lit menu board of square-cornered cards, tracked uppercase Montserrat and short gold or ink script lines in Allura.

Density is relaxed and generous. Sections breathe with clamp-driven padding, horizontal menu rows scroll and snap rather than wrap, and every practical fact (menu, address, contact) sits one tap from the header. The loader is the single theatrical moment: the logo draws itself once per browser session and never again on reload.

The look is premium without pretension. Flat tonal bands rather than layered chrome, one soft lift on hover for menu cards, thin ink keylines and gold accents rather than gradients or glows outside photo shades.

**Key Characteristics:**
- Ink ground with gold accents at the frame (header, footer, landing, hero); sand and brown bands for content.
- All structural type is Montserrat in tracked uppercase; Allura appears only as a single short tagline line.
- Square cards with 1px ink keylines; pill and circle shapes reserved for controls.
- Photography under directional ink shades carries mood; no decorative gradients elsewhere.
- Motion is short and eased (0.2-0.4s, `cubic-bezier(0.16, 1, 0.3, 1)`), fully muted under reduced motion.

## Colors

A seven-tone roast palette taken directly from the Canva design: one dark ground, one metallic accent, two browns, three paper tones.

### Primary
- **Logo Gold** (gold): the brand accent. Headline on the home hero, Allura tagline on the landing and food band, icon buttons, active nav underline, footer headings, focus rings, text selection. On ink it reads strongly; it is never a large fill.

### Secondary
- **Roasted Brown** (brown): the content accent. Section and page headlines on sand, menu list headings and rules, prices, pill-button outlines on light grounds, the search field border, and the full background of the food band.

### Neutral
- **Espresso Ink** (ink): the frame. Body background, header, footer, landing and hero grounds, card keylines, body text on light grounds, and every photo shade (as `rgb(21 18 17 / alpha)`). Also the browser theme color.
- **Steamed Cream** (cream): text on ink and brown; background of the search field and info panels.
- **Sand Paper** (sand): the light content band (coffee band, all sub-pages).
- **Kraft Card** (card): menu card surface; fine-print text in the footer.
- **Cocoa** (cocoa): text on menu cards, empty-photo placeholder ground, sprig line on the coffee band, muted notes; at 25% and 45% alpha it draws menu-list dividers and dotted price leaders.

### Named Rules
**The Gold Is Jewelry Rule.** Gold marks the brand, the current place and the interactive edge (focus, active nav, icon buttons). It is used for lines, icons and type, never as a section background.

**The Band Pairing Rule.** Content bands come in two fixed pairings: sand ground with brown headline and ink text, or brown ground with cream headline and text. Components inside read their colors from the band (`--head`, `--tag`, `--text`, `--line`), never hard-coded.

## Typography

**Display Font:** Montserrat (with Century Gothic, sans-serif), loaded via next/font as `--font-brand`, weights 400-700
**Body Font:** Montserrat (same family)
**Script Font:** Allura (with Brush Script MT, cursive), loaded as `--font-script`, weight 400

**Character:** Montserrat matches the logo's "ENERO MARSO / CAFE" lettering and does all the work; Allura stands in for the logo's "Premier" script and adds one warm handwritten line per section. Owner-chosen to follow the logo, replacing the Canva fonts.

### Hierarchy
- **Display** (500, clamp(2.3rem, 7vw, 5.6rem), 1, 0.1em, uppercase): the landing wordmark headline only, optically re-centered with a negative right margin equal to its tracking.
- **Headline** (700, clamp(2.6rem, 5.4vw, 4.6rem), 0.95, uppercase): menu band titles ("Our Coffee") and sub-page titles, in brown on sand or cream on brown.
- **Headline Hero** (500, clamp(2.2rem, 4.6vw, 3.6rem), 1.05, 0.08em, uppercase, gold): the home hero title over video.
- **Script** (Allura 400, roughly 1.9-2.9rem fluid, 1-1.1): one short tagline under a headline. Gold on dark/brown, ink on sand.
- **Title** (700, 1.0625rem, 0.12em, uppercase): menu card item names; prices sit beneath at 600 with 0.08em.
- **Body** (400, 1.0625rem, 1.6): running copy; band copy grows to clamp(1.0625rem, 1.3vw, 1.25rem) and is capped near 26-34em.
- **Label** (600, 0.875rem, 0.2em, uppercase): buttons, nav (at 500, 0.22em), info-panel headings.
- **Label Small** (600, 0.8125rem, 0.24em, uppercase): footer column headings in gold, landing corner links.

### Named Rules
**The One Script Line Rule.** Allura is used for a single short tagline per block (under ten words), never for headings, body, prices, buttons or navigation.

**The Tracked Caps Rule.** Every heading, label, nav item and menu item name is uppercase Montserrat with positive tracking (0.01em on heavy headlines up to 0.24em on small labels). Prices use tabular numerals.

## Layout

A single fluid gutter (`clamp(1.25rem, 5vw, 5rem)`) sets the left and right edges of every band, header and footer. Full-bleed bands stack vertically; within the menu bands a two-column grid (intro `minmax(18rem, 30rem)` beside a horizontal card row) collapses to one column at 56rem. The card row is a horizontal scroll-snap track that bleeds off the right edge (no right padding on the band), with scrollbar hidden and round prev/next controls beneath.

Sub-pages center a constrained column on sand: full menu at 46rem, contact panels in an auto-fit grid of `minmax(min(100%, 20rem), 1fr)` up to 64rem, gallery as a 3-column masonry up to 72rem. Vertical rhythm is clamp-based: bands at clamp(4.5rem, 10vw, 8rem), sub-pages at clamp(3.5rem, 8vw, 6rem). Common gaps are 0.75rem and 1.5rem.

Breakpoints: 56rem (nav becomes a drop-down sheet, bands go single column, footer to two columns) and 34rem (wordmark text hidden, landing corner links restack, hero shade turns vertical, footer to one column). Safe-area insets pad the header top, footer bottom and landing corner links.

## Elevation & Depth

Flat by default. Depth comes from tonal bands and from ink shades laid over photography (radial on the landing, a left-to-right plus bottom gradient on the hero that turns vertical on phones). The only shadow is the menu card's hover lift.

### Shadow Vocabulary
- **Card lift** (`box-shadow: 0 1rem 2rem -1.25rem rgb(21 18 17 / 0.55)` with `translateY(-4px)`): menu card hover only.

### Named Rules
**The Shade Not Shadow Rule.** Legibility over imagery comes from ink-tinted gradients over the photo, not from text shadows or boxes behind text.

## Shapes

Two shape families. Containers are square: menu cards, info panels, gallery tiles and the landing ghost button have 0 radius and a 1px ink keyline. Controls are round: pill buttons and the search field are fully rounded (999px), icon, carousel and video toggle buttons are circles (50%) with 1.5px outlines. Rules are thin and literal: 2px brown under menu list headings, 1px cocoa dividers, 2px dotted price leaders. A hand-drawn sprig and cup/cutlery line icons decorate the menu bands in the band's line color.

## Components

### Buttons
Outlined, uppercase, tracked; fill on hover.
- **Ghost (square):** 1px cream outline, cream label, 0 radius, padding 1.05rem 2rem; hover fills cream with ink text. Used over photography on the landing.
- **Pill:** 2px outline in currentColor, 999px radius, padding 1rem 2.1rem; color comes from context (band headline color, brown in info panels). Hover fills with that color and switches the label to the ground color.
- **Icon (circle):** 2.75rem, 1.5px gold outline, gold glyph; hover fills gold with ink glyph. Header search and menu toggle.
- **Round (circle):** 3rem, 1.5px currentColor outline; carousel prev/next. Disabled at 30% opacity.
- **Focus:** global 2px gold outline, 3px offset. Transitions 0.2-0.25s ease on color, background and border.

### Cards / Containers
- **Menu card:** kraft card surface, 1px ink keyline, 0 radius; photo at 289:344 over cocoa, label padding 1.1rem 1.1rem 1.4rem with name (Title) and price beneath. Missing photos show a cocoa panel with a line icon and "Photo coming soon". Hover lifts 4px with the card shadow over 0.4s.
- **Info panel:** cream surface, 1px ink keyline, 0 radius, padding clamp(1.75rem, 4vw, 2.75rem); brown small-caps heading, large 600 fact line.

### Inputs / Fields
- **Search:** pill (999px) with 2px brown border on cream, leading search icon in brown, Montserrat 500 1.0625rem ink input text. Focus moves to the whole field: 2px gold outline, 3px offset.

### Navigation
- **Header:** ink bar (or overlay gradient over the hero) with gold monogram plus "ENERO MARSO / CAFE" wordmark (cream, gold small "CAFE"), centered nav, icon buttons right. Links are 500 0.875rem 0.22em uppercase cream; hover turns gold; the current page carries a 1px gold underline. Below 56rem the nav becomes a full-width ink sheet under the header (opacity and 0.5rem slide, 0.35s eased), links stacked with faint cream dividers and the current page in gold; Escape closes it.
- **Footer:** ink ground, logo, gold small-caps column headings, cream links that turn gold on hover, fine print in card color above a 15% cream rule.

### Menu List (signature)
The full-menu board: brown uppercase category heading over a 2px brown rule, then rows of uppercase 600 item name, a dotted cocoa leader filling the space, and a brown tabular price, divided by 1px cocoa lines.

### Logo Loader (signature)
Full-screen warm-black ground with fine grain; the logo artwork is revealed part by part (monogram sweep, wordmark opening from center, "CAFE" rising, "Premier" written), its two rules beside "CAFE" growing as the real progress bar, then a glint and a curtain lift. Plays once per browser session; reduced motion fades the mark in whole.

## Do's and Don'ts

### Do:
- **Do** use the seven palette tokens only, and keep each band to its pairing: sand with brown and ink, or brown with cream and gold.
- **Do** set every heading, label, nav item and item name in uppercase Montserrat with positive tracking.
- **Do** keep Allura to one short tagline per block, in gold on dark grounds or ink on sand.
- **Do** keep containers square with a 1px ink keyline and controls pill or circle shaped.
- **Do** put ink-tinted gradient shades over photography to carry text, and pad edges with the gutter and safe-area insets.
- **Do** show honest placeholders ("To be announced", "Photo coming soon") rather than invented facts or stock stand-ins.

### Don't:
- **Don't** use gold as a band or panel fill; it is for type, lines, icons and focus.
- **Don't** set headlines, body copy, prices or buttons in Allura.
- **Don't** round cards or panels, or add shadows beyond the menu card hover lift.
- **Don't** replay the loader after it has played once in a session.
