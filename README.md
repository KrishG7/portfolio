# Krish Gupta · portfolio v10

Personal site of **Krish Gupta**, Security × ML engineer, B.Tech (Blockchain, Cybersecurity & ML) at the University of Delhi.

The idea is **Sealed**: a royal private archive with a cipher underneath. Text arrives encrypted and decodes as you reach it; the hero is a portrait drawn in hex glyphs, with a loupe that shows the real photo under your cursor.

## Stack

- [Astro](https://astro.build) 7, static output, no framework runtime. JavaScript ships only where something moves.
- Lenis for weighted scrolling on desktop; native scrolling on touch screens.
- Self-hosted variable fonts: Fraunces (display), Hanken Grotesk (body), JetBrains Mono (cipher).
- Cross-document View Transitions for page changes (Chrome, Edge, Safari 18.2+; other browsers just navigate).

## Run it

Needs Node 24.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## Where things live

| Path | What |
|---|---|
| `src/data/projects.ts` | All project copy: flagships, archive, links. Edit this first. |
| `src/components/` | Hero, Intro, Work (horizontal track), Archive, About, Footer, Nav, Command (⌘K) |
| `src/pages/work/[slug].astro` | Case-study template |
| `src/scripts/portrait.ts` | Cipher portrait and loupe |
| `src/scripts/demos.ts` | The live figure for each flagship |
| `src/scripts/core.ts` | Scroll, decode reveal, theme, menu, ⌘K, easter eggs |
| `public/img/` | Photos (WebP) |
| `public/og/` | Share cards, regenerated with `node scripts/og.cjs` |

## Things to find

`⌘K` or `/` opens the command palette (try `whoami`, `ls`, `decrypt`, `sudo`). `G` shows the layout grid, `X` turns on X-ray mode.

## Rules this site keeps

- No figure goes on the site until it has been re-run and verified.
- Reduced-motion and Save-Data visitors get a lite mode: no canvas animation, no smooth scroll.
