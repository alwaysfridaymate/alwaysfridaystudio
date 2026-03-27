# alwaysfridaylive

Marketing website for ALWAYSFRIDAY — a curated audio & video creation studio.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS v4**
- Static export (`output: "export"`)

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Build & Export

```bash
npm run build
```

Static files are generated in the `out/` directory.

## Deploy to Vercel

1. Push this repo to GitHub
2. Import the repo on [vercel.com/new](https://vercel.com/new)
3. Vercel auto-detects Next.js — no extra config needed
4. Deploy

The `next.config.ts` is configured with `output: "export"` for static hosting. If you want to use Vercel's SSR features later, remove that line.

## Project Structure

```
src/
  app/
    layout.tsx     — Root layout with Inter font, metadata
    page.tsx       — Homepage (all sections)
    globals.css    — Tailwind imports, custom properties
public/
  images/          — Photos (B&W JPGs) and SVG section headings
```
