# Pixel Peel

A small puzzle in the browser. A pixel picture sits at the top of the screen, and little dots peel it apart,
one pixel at a time, colour by colour. You choose the order.

## How to play

- Below the picture is a row of **buckets**, and below them are **columns of pots**. Each pot has a colour
  and a number, and the top three pots of each column are shown.
- Tap a column to move its top pot into a free bucket.
- Dots of that colour set off from the bucket. Each one walks around the outside of the picture, goes in
  through the squares that are already empty, takes the closest pixel of its colour it can reach, and
  carries it back. A dot carrying a pixel has a dark border.
- The number on a bucket counts the pixels it still has to collect. When it reaches 0 and the last dot is
  home, the bucket is free again.
- A pixel that other pixels surround can't be reached. If every bucket holds a colour that no dot can reach,
  you are stuck: restart and try another order.
- Peel the whole picture to win. Every level can be won.

The game is deterministic: the same picks at the same moments always play out the same way.

## Development

- `npm ci`, then `npm run dev` (dev server on 127.0.0.1), `npm test` (Vitest), `npm run typecheck`,
  `npm run build` (type check, then `vite build` into `dist/`), `npm run preview`.
- The rules are in `src/engine.ts`, and they are pure: `pick()` and `tick()` take a state and return the
  next one. `src/generator.ts` deals a level's pots so that a winning plan always exists. `src/main.ts`
  draws the state on a canvas.
- The icons are made from the first level's picture: `python3 -I scripts/make-icons.py` (Pillow).
- Every push to `main` builds, tests and publishes `dist/` to GitHub Pages
  (`.github/workflows/pages.yml`). The site is meant to sit at a domain root, so Vite's `base` is `/`.

## Licence

MIT, see `LICENSE`.
