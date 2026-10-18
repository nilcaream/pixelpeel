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

- The pictures are scenes drawn in code (`src/scenes.ts`), 32×24, in up to 11 colours of one pool of clearly
  different colours (`src/palette.ts`). A scene fills its whole rectangle, gives each area two tones
  dithered together, and nests small things in big ones. At least three colours touch its edge, so no
  single colour is the only way in.
- Levels come in waves: easy, medium, hard, with a very hard one every tenth level.
- Difficulty is measured on skill, not luck (`src/levels.ts`, `src/thinker.ts`). A casual player picks at
  random among the columns whose top pot can reach a pixel right now. A thinker looks a few picks ahead on
  the pots the page shows. A level's depth is how far ahead a thinker must look to win (90% of its games),
  and its luck is what a thinker gains by seeing the hidden pots too:

  | band | casual players win | depth |
  |---|---|---|
  | easy | 80–98% | 1 |
  | medium | 50–80% | 1–2 |
  | hard | under 50% | 2, and a depth-1 thinker wins at most 60% |
  | very hard | under 20% | 3, and depth 1 and 2 win at most 40% and 60% |

  Every level has a luck of at most 5%, and a solver proves it can be won.
- `npm run bake` makes `src/levels.json` offline (`scripts/bake.ts`, one worker per level). For each level it
  deals pots that are known to win and perturbs them (pots surface early, the order is turned round, pots
  merge). It measures the deal, the cheapest measure first, and turns the knobs in this order: the strength
  of the perturbing, then fewer buckets (5, 4, 3), then the scene's next seed. Each level keeps its seeds,
  strength, measures and the solver's winning order, which a test replays. `npm run bake -- --check` bakes
  again and fails if the committed file differs.
- In `npm run dev` a level list, a Skip button and `?level=N` are there for trying levels; the production
  build leaves them out.

## Development

- `npm ci`, then `npm run dev` (dev server on 127.0.0.1), `npm test` (Vitest), `npm run typecheck`,
  `npm run build` (type check, then `vite build` into `dist/`), `npm run preview`.
- The rules are in `src/rules.ts`, a logical model with no time in it: `pick()` takes a board and settles
  everything that follows at once, so a game's outcome depends only on the order of the picks.
  `src/scene.ts` animates what the rules decided, with dots on a tick. `src/generator.ts` deals,
  perturbs and measures a level's pots on the rules, and `src/bake.ts` keeps the deals that fit a band. `src/main.ts` draws the scene on a canvas, and
  `src/progress.ts` keeps the player's progress.
- The icons are made from the first level's picture: `python3 -I scripts/make-icons.py` (Pillow).
- Every push to `main` builds, tests and publishes `dist/` to GitHub Pages
  (`.github/workflows/pages.yml`). The site is meant to sit at a domain root, so Vite's `base` is `/`.

## Licence

MIT, see `LICENSE`.
