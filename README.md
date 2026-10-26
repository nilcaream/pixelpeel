# Pixel Peel

A small puzzle in the browser. A pixel picture sits at the top of the screen, and little dots peel it apart,
one pixel at a time, colour by colour. You choose the order.

**Live: [pixelpeel.nilcaream.com](https://pixelpeel.nilcaream.com)**

## How to play

- Below the picture is a row of **buckets**, and below them are **columns of pots**. Each pot has a colour
  and a number, and the top three pots of each column are shown.
- Tap a column to move its top pot into a free bucket.
- Dots of that colour set off from the bucket. Each one walks around the outside of the picture, goes in
  through the squares that are already empty, flies to the most exposed pixel of its colour it can reach,
  and vanishes with it.
- The number on a bucket counts the dots still in it. When it reaches 0 the bucket is gone, and its place
  is free for the next pot at once.
- When only one column has pots left there is nothing to decide, so the game picks them itself and runs
  three times faster.
- A pixel that other pixels surround can't be reached. If every bucket holds a colour that no dot can reach,
  you are stuck: retry and try another order.
- Peel the whole picture to win and go on to the next level. Every level can be won.

Only the order of your picks matters, not when you make them: the same picks always play out the same
way. Your level and every pick you make are kept in the browser, so a reload goes on exactly where you
left off.

The menu (☰, over the picture's top left corner) plays any level you have peeled again, clears your
progress (tap twice), and links to this repository. The game's name is marked `translate="no"` where it
is spelled in coloured letters, so a browser that translates the page leaves it in one piece.

## Levels

- The pictures are scenes drawn in code (`src/scenes.ts`), in colours of one pool of clearly
  different colours (`src/palette.ts`). A scene fills its whole rectangle, gives each area two tones
  dithered together, and nests small things in big ones. At least three colours touch its edge, so no
  single colour is the only way in. Levels 1–20 are 32×24; from level 21 the scenes are 40×30, with room
  for shading, gradients, textures and scattered detail (a cell is still about 8 px on a 360 px phone).
- Levels come in waves: easy, medium, hard, with a very hard one every tenth level. Each block of ten
  levels is a step harder than the one before.
- Difficulty is measured on skill, not luck (`src/levels.ts`, `src/thinker.ts`). A casual player picks at
  random among the columns whose top pot can reach a pixel right now. A thinker looks a few picks ahead on
  the pots the page shows. A level's depth is how far ahead a thinker must look to win (90% of its games,
  85% on a very hard level), and its luck is what a thinker gains by seeing the hidden pots too:

  | band | levels 1–10: casual players win | depth | levels 11–20: casual players win | depth |
  |---|---|---|---|---|
  | easy | 80–98% | 1 | 65–85% | 1 |
  | medium | 50–80% | 1–2 | 35–65% | 2, and a depth-1 thinker wins at most 70% |
  | hard | under 50% | 2, and depth 1 wins at most 60% | under 30% | 2–3, and depth 1 wins at most 40% |
  | very hard | under 20% | 3, and depth 1 and 2 win at most 40% and 60% | under 10% | 4, and depth 1, 2 and 3 win at most 20%, 30% and 50% |

  | band | levels 21–30: casual players win | depth | levels 31–40: casual players win | depth |
  |---|---|---|---|---|
  | easy | 50–75% | 1 | 40–65% | 1 |
  | medium | 25–55% | 2, and depth 1 wins at most 60% | 20–45% | 2–3, and depth 1 wins at most 50% |
  | hard | under 25% | 2–3, and depth 1 wins at most 30% | under 20% | 2–3, and depth 1 wins at most 25% |
  | very hard | under 8% | 3–4, and depth 1 and 2 win at most 15% and 25% | under 6% | 3–4, and depth 1 and 2 win at most 10% and 20% |

  | band | levels 41 on: casual players win | depth |
  |---|---|---|
  | easy | 30–55% | 1 |
  | medium | 12–35% | 2–3, and depth 1 wins at most 40% |
  | hard | under 12% | 2–3, and depth 1 wins at most 20% |
  | very hard | under 4% | 3–4, and depth 1 and 2 win at most 10% and 15% |

  A scene may name the deal it is baked from (`deal` in `src/scenes.ts`), chosen from a sweep of the
  picture's deals for its band and for a game with no trivial first phase; the bake tries it first.
  Pictures drawn but not yet levels wait in `src/portfolio.ts`.

  Every level has a luck of at most 5%, and a solver proves it can be won. When no deal of a picture fits
  its band, the level takes the closest deal and records what it misses (`misses` in `src/levels.json`): an
  outlier now and then is accepted on the way to a hundred levels.
- `npm run bake` makes `src/levels.json` offline (`scripts/bake.ts`, one worker per level; `npm run bake -- 21 22`
  bakes only those levels and keeps the others as the file has them). For each level it
  deals pots that are known to win and perturbs them (pots surface early, the order is turned round, pots
  merge). It measures the deal, the cheapest measure first, and turns the knobs in this order: the strength
  of the perturbing, then fewer buckets (5, 4, 3), then the scene's next seed. When that search finds no deal,
  a grid tries every bucket count and strength, a few deals each. Each level keeps its seeds,
  strength, measures and the solver's winning order, which a test replays. `npm run bake -- --check` bakes
  again and fails if the committed file differs.
- Dev mode is for trying levels. The menu offers it only when the page is opened at exactly `127.0.0.1`
  (for example `npm run dev`), never anywhere else. Once it is on, it stays on there, and the menu shows a
  list of every level with its band, depth and casual win rate. On that host, `?level=N` opens level N.

## Development

- `npm ci`, then `npm run dev` (dev server on 127.0.0.1), `npm test` (Vitest), `npm run typecheck`,
  `npm run build` (type check, then `vite build` into `dist/`), `npm run preview`.
- The rules are in `src/rules.ts`, a logical model with no time in it: `pick()` takes a board and settles
  everything that follows at once, so a game's outcome depends only on the order of the picks.
  `src/scene.ts` animates what the rules decided, with dots on a tick. `src/generator.ts` deals,
  perturbs and measures a level's pots on the rules, and `src/bake.ts` keeps the deals that fit a band.
  `src/main.ts` draws the scene on a canvas, and `src/progress.ts` keeps the player's progress.
- The icons are the Cactus level's scene made square, with a few more rows of its sky above and its sand
  below (`src/logo.ts`). They are made by `python3 -I scripts/make-icons.py` (Pillow).
- Every push to `main` builds, tests and publishes `dist/` to GitHub Pages
  (`.github/workflows/pages.yml`). The site is at a domain root, pixelpeel.nilcaream.com, so Vite's
  `base` is `/` and the manifest and icons are linked by absolute path.
- The version is `package.json`'s, shown in the menu; it goes up with each release.
- Offline and updates: the build has a service worker, `src/sw.ts`, built as `/sw.js`. Once the build is
  written, a plugin in `vite.config.ts` fills in the list of the build's files (`src/precache.ts`), so each
  new build is a new `sw.js`. The worker keeps the build and serves it, so the game opens offline.
  - The page asks for a newer build each time it comes back to the screen (`src/update.ts`). A newer build
    takes over at once.
  - The page reloads onto it only when that loses nothing: nothing picked since the level opened, the page
    out of sight, or Next or Retry.
  - Every step fails silently. The dev server runs without the worker.

## Licence

MIT, see `LICENSE`. The font, Press Start 2P by The Press Start 2P Project Authors (Reserved Font Name
"Press Start 2P"), is under the SIL Open Font License 1.1 and ships unmodified: see `public/fonts/OFL.txt`,
which is published beside the font.
