# Pixel Peel

A small puzzle in the browser. A pixel picture sits at the top of the screen, and little dots peel it apart,
one pixel at a time, colour by colour. You choose the order.

## How to play

- Below the picture is a row of **buckets**, and below them are **columns of pots**. Each pot has a colour
  and a number, and the top three pots of each column are shown.
- Tap a column to move its top pot into a free bucket.
- Dots of that colour set off from the bucket. Each one walks around the outside of the picture, goes in
  through the squares that are already empty, takes the most exposed pixel of its colour it can reach, and
  carries it back. A dot carrying a pixel has a dark border.
- The number on a bucket counts the pixels it still has to collect. When it reaches 0 and another bucket
  holds its colour, it is free again at once and its last dots fly to that bucket; otherwise it is free
  when its last dot is home.
- When only one column has pots left there is nothing to decide, so the game picks them itself and runs
  three times faster.
- A pixel that other pixels surround can't be reached. If every bucket holds a colour that no dot can reach,
  you are stuck: retry and try another order.
- Peel the whole picture to win and go on to the next level. Every level can be won.

Only the order of your picks matters, not when you make them: the same picks always play out the same way. Your level and
every pick you make are kept in the browser, so a reload goes on exactly where you left off.

## Levels

- Levels come in waves: easy, medium, hard, with a very hard one every tenth level. Every ten levels the
  structure grows: first the picture's size (20 → 24 squares), then its colours (4 → 5). Levels 21–30
  bring the pictures of levels 1–10 back, larger and with more colours.
- Difficulty is measured: each level is played by 200 random players, who pick a random column whenever a
  bucket is free. The share that wins sets the band: easy ≥ 90%, medium 65–90%, hard 35–65%, very hard
  10–35%.
- `npm run bake` makes `src/levels.json` offline (`scripts/bake.ts`, a few minutes on all cores). For each
  level it converts the source picture into the colour pool (`src/convert.ts`, `src/palette.ts`), deals pots
  that are known to win, and perturbs them (pots surface early, the order is turned round, pots merge)
  until the measured share lands in the band. Each level keeps its source and licence, its seed and knobs,
  the measured share and one winning order, which a test replays. `npm run bake -- --check` bakes again
  and fails if the committed file differs.
- A picture's background is empty: no pixels there, and dots walk over it from the start. A level listed in
  `SOLID_BACKGROUND` (`scripts/sources.ts`) fills it with a colour to peel instead, and
  `BACKGROUND=colour npm run bake` does so for every level.
- The pictures are Kenney's "Animal Pack Redux", CC0 (https://opengameart.org/content/animal-pack-redux),
  in `levels/sources/` with the pack's licence. Levels 1–10 (and 21–30) show the square animals, and levels
  11–20 the round heads. The candidates are listed in `scripts/sources.ts`, and the bake gives the
  pictures that can be made hardest to the hardest levels.
- In `npm run dev` a level list, a Skip button and `?level=N` are there for trying levels; the production
  build leaves them out.

## Development

- `npm ci`, then `npm run dev` (dev server on 127.0.0.1), `npm test` (Vitest), `npm run typecheck`,
  `npm run build` (type check, then `vite build` into `dist/`), `npm run preview`.
- The rules are in `src/rules.ts`, a logical model with no time in it: `pick()` takes a board and settles
  everything that follows at once, so a game's outcome depends only on the order of the picks.
  `src/scene.ts` animates what the rules decided, with dots on a tick. `src/generator.ts` deals,
  perturbs and measures a level's pots on the rules. `src/main.ts` draws the scene on a canvas, and
  `src/progress.ts` keeps the player's progress.
- The icons are made from the first level's picture: `python3 -I scripts/make-icons.py` (Pillow).
- Every push to `main` builds, tests and publishes `dist/` to GitHub Pages
  (`.github/workflows/pages.yml`). The site is meant to sit at a domain root, so Vite's `base` is `/`.

## Licence

MIT, see `LICENSE`.
