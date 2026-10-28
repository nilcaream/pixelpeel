// The page: turns a tap on a column into a pick, which the rules (rules.ts) settle at once, and draws the
// scene (scene.ts) that shows it, ticking at a fixed rate. A pick waits for a bucket that is free on
// screen. The player goes on to the next level after each one peeled, and can play any peeled level
// again from the menu; every pick is saved, so a reload replays the picks and goes on exactly where it
// was left.

import { AUTOPILOT_SPEED, autopilotPick, onAutopilot } from './autopilot.ts';
import { CONFIRM_MS, confirmTaps } from './confirm.ts';
import { DEV_KEY, isDevPort } from './dev.ts';
import { replay } from './generator.ts';
import { measure, nameFontSize, toCanvas, type Layout } from './layout.ts';
import levelsFile from './levels.json';
import { CASUAL_GAMES, VISIBLE, type Band, type Level } from './levels.ts';
import { paintedPicture, type Picture } from './picture.ts';
import { FINALE_TEXT, tapOpensMenu } from './finale.ts';
import { FRESH, browserStore, loadProgress, peeled, playable, saveProgress, type Progress } from './progress.ts';
import { relayoutWhenShown, sharpCanvas } from './relayout.ts';
import { EMPTY, pick, status, type Board } from './rules.ts';
import { AT_BUCKET, createScene, frameWidth, freeSlot, idle, place, tick, type Scene } from './scene.ts';
import { fileSharer } from './share.ts';
import { savePick } from './save.ts';
import { solveLog } from './solvelog.ts';
import { keepUpdated } from './update.ts';
import './style.css';

declare const __APP_VERSION__: string;
declare const __RELEASE_DATE__: string;

/** How many cells a dot moves per second; a constant to tune. */
const STEPS_PER_SECOND = 10;
const STEP_MS = 1000 / STEPS_PER_SECOND;

/** The pixel font of the page (src/style.css), which the numbers on the pots are drawn in too. */
const PIXEL_FONT = '"Press Start 2P", system-ui, sans-serif';

const BAND_SHORT: Record<Band, string> = { easy: 'E', medium: 'M', hard: 'H', 'very hard': 'VH' };

const LEVELS = levelsFile as unknown as Level[];

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const sharp = sharpCanvas(canvas, ctx);
const levelNumber = document.getElementById('level-number') as HTMLSpanElement;
const levelName = document.getElementById('level-name') as HTMLSpanElement;
const levelBand = document.getElementById('level-band') as HTMLSpanElement;
const chooser = document.getElementById('level-chooser') as HTMLSelectElement;
const menu = document.getElementById('menu') as HTMLDivElement;
const menuButton = document.getElementById('menu-button') as HTMLButtonElement;
const menuLevels = document.getElementById('menu-levels') as HTMLDivElement;
const devButton = document.getElementById('menu-dev') as HTMLButtonElement;
const end = document.getElementById('end') as HTMLDivElement;
const endText = document.getElementById('end-text') as HTMLParagraphElement;
const endButton = document.getElementById('end-button') as HTMLButtonElement;

const store = browserStore();
let progress: Progress = loadProgress(store);
const log = solveLog(store, __APP_VERSION__);
let level: Level | null = null;
let picture: Picture;
let picks: number[] = [];
/** What the rules say: the truth of the game. */
let board: Board;
/** What the screen shows of it, catching up. */
let scene: Scene;
/** Whether a pick was made since the level opened: until then a reload brings back exactly this screen. */
let pickedSinceOpen = false;
/** Reloads onto a newer build when that loses nothing (update.ts); the production build sets it up. */
let reloadIfSafe: (leaving?: boolean) => void = () => {};

/** Opens the level the progress is on, resuming its saved picks when they belong to this very level. */
function open(): void {
  level = LEVELS[progress.level - 1] ?? null;
  end.hidden = true;
  levelNumber.classList.toggle('finale', !level);
  if (!level) {
    levelNumber.textContent = 'All levels peeled';
    levelName.textContent = '';
    levelBand.textContent = '';
    resize();
    endText.textContent = FINALE_TEXT;
    end.dataset.state = 'done';
    endButton.hidden = true;
    end.hidden = false;
    return;
  }
  levelNumber.textContent = `Level ${level.number}`;
  levelName.textContent = level.title;
  levelBand.textContent = `(${level.band})`;
  picture = paintedPicture(level.rows, level.overrides);
  const saved = progress.run?.id === level.id ? progress.run.picks : [];
  picks = saved.slice();
  pickedSinceOpen = false;
  board = replay(picture, level.columns, level.structure.buckets, picks);
  scene = createScene(board);
  log.open(level.number, level.id, picks);
  progress = { ...progress, run: { id: level.id, picks } };
  saveProgress(store, progress);
  resize();
  chooser.value = String(level.number);
}

/** Moves the progress to a level and opens it with nothing in play. */
function goTo(n: number): void {
  const to = Math.max(1, Math.min(n, LEVELS.length + 1));
  progress = { level: to, reached: Math.max(progress.reached, to), run: null };
  saveProgress(store, progress);
  open();
}

let layout: Layout;
/** The size of the canvas's box on the page, which everything is laid out and drawn in. */
let view = { width: 0, height: 0 };

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  // The canvas's own box, not the window's size: a phone can give the two different heights, and a
  // picture laid out for one and shown in the other is stretched away from where the taps are tested.
  const box = canvas.getBoundingClientRect();
  const w = box.width;
  const h = box.height;
  view = { width: w, height: h };
  sharp.fit(w, h, dpr);
  if (level) {
    layout = measure(w, h, { width: scene.width, height: scene.height, buckets: scene.slots.length, columns: board.columns.length, visible: VISIBLE });
  }
  // The menu button stays over the picture's left edge (past the ring of one cell round it), at any width;
  // with no level open, over the left edge of the column the game would use.
  const edge = level ? layout.left + layout.cell : (w - Math.min(w * 0.92, 560)) / 2;
  menuButton.style.left = `${Math.round(box.left + edge)}px`;
  levelName.style.fontSize = `${nameFontSize(w, levelName.textContent?.length ?? 0)}px`;
}

/**
 * The buckets share the picture's width evenly, so the gaps between them are equal whatever the width.
 * Their dots start from the ring square under them (entryCell), which is this point snapped to a square.
 */
function bucketCentreX(i: number): number {
  return layout.left + (1 + ((i + 0.5) * scene.width) / scene.slots.length) * layout.cell;
}

function textColour(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lum = 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
  return lum > 150 ? '#1c1c22' : '#ffffff';
}

function roundRect(x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function drawPot(x: number, y: number, size: number, colour: string, n: number): void {
  roundRect(x - size / 2, y, size, size, size * 0.22);
  ctx.fillStyle = colour;
  ctx.fill();
  ctx.fillStyle = textColour(colour);
  // Every glyph of the font is 1 em wide: two digits take 0.68 of the pot, so a number up to 99 fits even in
  // the smallest pot (46 px at 360 px with 5 columns, 16 px digits).
  ctx.font = `${Math.round(size * 0.34)}px ${PIXEL_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), x, y + size / 2 + 1);
}

function draw(frac: number): void {
  sharp.frame();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!level) return;
  const { left, top, cell } = layout;
  const fw = frameWidth(scene);

  for (let y = 0; y < scene.height; y++) {
    for (let x = 0; x < scene.width; x++) {
      const c = scene.cells[y * scene.width + x] as number;
      if (c === EMPTY) continue;
      ctx.fillStyle = scene.palette[c] as string;
      ctx.fillRect(left + (x + 1) * cell, top + (y + 1) * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }

  // The grid of the picture's pixels, over filled and emptied squares alike.
  ctx.beginPath();
  for (let i = 0; i <= scene.width; i++) {
    const x = left + (i + 1) * cell;
    ctx.moveTo(x, top + cell);
    ctx.lineTo(x, top + (scene.height + 1) * cell);
  }
  for (let j = 0; j <= scene.height; j++) {
    const y = top + (j + 1) * cell;
    ctx.moveTo(left + cell, y);
    ctx.lineTo(left + (scene.width + 1) * cell, y);
  }
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.stroke();

  // Dots go under the buckets, so a bucket's number stays readable while dots leave it.
  const at = (step: number, bucket: number): [number, number] => {
    if (step === AT_BUCKET) return [bucketCentreX(bucket), layout.bucketY + layout.bucketSize / 2];
    const fx = step % fw;
    const fy = (step - fx) / fw;
    return [left + (fx + 0.5) * cell, top + (fy + 0.5) * cell];
  };
  for (const dot of scene.dots) {
    const a = dot.route[dot.pos] as number;
    const b = (dot.route[dot.pos + 1] ?? a) as number;
    const [ax, ay] = at(a, dot.slot);
    const [bx, by] = at(b, dot.slot);
    const x = ax + (bx - ax) * frac;
    const y = ay + (by - ay) * frac;
    ctx.beginPath();
    ctx.arc(x, y, cell * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = scene.palette[dot.colour] as string;
    ctx.fill();
  }

  scene.slots.forEach((bucket, i) => {
    const x = bucketCentreX(i);
    const size = layout.bucketSize;
    if (!bucket) {
      roundRect(x - size / 2, layout.bucketY, size, size, size * 0.22);
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#55555f';
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    drawPot(x, layout.bucketY, size, scene.palette[bucket.colour] as string, bucket.count - bucket.sent);
  });

  board.columns.forEach((pots, i) => {
    pots.slice(0, VISIBLE).forEach((pot, k) => {
      drawPot(columnX(i), potY(k), layout.potSize, scene.palette[pot.colour] as string, pot.count);
    });
  });
}

function columnX(i: number): number {
  return (view.width - layout.inner) / 2 + (i + 0.5) * layout.columnWidth;
}

function potY(row: number): number {
  return layout.columnsY + row * (layout.potSize + layout.potGap);
}

/** The column whose top pot is under the point, or −1: only the top pot itself can be tapped. */
function columnAt(x: number, y: number): number {
  const half = layout.potSize / 2;
  const top = potY(0);
  if (y < top || y > top + layout.potSize) return -1;
  return board.columns.findIndex((pots, i) => pots.length > 0 && Math.abs(x - columnX(i)) <= half);
}

/** The player's move, once a bucket is free on screen: the rules settle it, the scene shows it, and it is saved. */
function play(column: number): void {
  if (!level || status(board) !== 'playing' || freeSlot(scene) < 0) return;
  const r = pick(board, column);
  if (!r) return;
  picks.push(column);
  pickedSinceOpen = true;
  board = r.board;
  scene = place(scene, r.pot, r.lifts);
  const s = status(board);
  progress = savePick(store, log, progress, picks, s === 'won' ? 'w' : s === 'stuck' ? 's' : undefined);
}

canvas.addEventListener('pointerdown', (e) => {
  if (!level) return;
  const p = toCanvas(e.clientX, e.clientY, canvas.getBoundingClientRect(), view);
  const column = columnAt(p.x, p.y);
  if (column >= 0) play(column);
});

endButton.addEventListener('click', () => {
  if (!level) return;
  if (status(board) === 'won') goTo(level.number + 1);
  else goTo(level.number);
  reloadIfSafe(true);
});

let last = performance.now();
let acc = 0;
function frame(now: number): void {
  acc += now - last;
  last = now;
  if (acc > 1000) acc = STEP_MS;
  const stepMs = level && onAutopilot(board) ? STEP_MS / AUTOPILOT_SPEED : STEP_MS;
  if (level) {
    while (acc >= stepMs) {
      acc -= stepMs;
      const column = autopilotPick(board, scene);
      if (column >= 0) play(column);
      if (!idle(scene)) scene = tick(scene);
    }
    // The end is shown once the screen has caught up with the rules.
    const s = status(board);
    if (s !== 'playing' && idle(scene) && end.hidden) {
      // The winning pick moved the progress on (savePick). A run saved won without that, by a build before
      // 1.5.1, moves on when it is opened again and its end shows.
      if (s === 'won' && progress.level === level.number) {
        progress = peeled(progress);
        saveProgress(store, progress);
      }
      endText.textContent = s === 'won' ? 'Peeled!' : 'Stuck';
      end.dataset.state = s === 'won' ? 'won' : 'stuck';
      endButton.textContent = s === 'won' ? 'Next' : 'Retry';
      endButton.hidden = false;
      end.hidden = false;
    }
  }
  draw(acc / stepMs);
  requestAnimationFrame(frame);
}

// The menu, open from every screen: the levels peeled so far, clearing the progress, the source, and on
// a dev port the dev mode.
function showMenu(shown: boolean): void {
  if (shown) {
    menuLevels.replaceChildren(
      ...playable(progress, LEVELS.length).map((n) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = String(n);
        b.classList.toggle('long', n >= 100);
        b.setAttribute('aria-label', `Level ${n}`);
        if (n === level?.number) b.setAttribute('aria-current', 'true');
        // The level first: closing the menu may reload onto a newer build, which then opens that level.
        b.addEventListener('click', () => {
          goTo(n);
          showMenu(false);
        });
        return b;
      }),
    );
  }
  shareButton.hidden = !log.hasData();
  menu.hidden = !shown;
  if (shown) scrollLevels();
  menuButton.setAttribute('aria-expanded', String(shown));
  unarm();
  if (!shown) reloadIfSafe();
}

/** Where the levels open in the menu: scrolled to the end, so the last levels are in sight. */
function scrollLevels(): void {
  menuLevels.scrollTop = menuLevels.scrollHeight;
}

// The solve log, always kept, can be shared from the menu. Sharing leaves it as it is, as nothing tells
// whether the file was sent.
const shareButton = document.getElementById('menu-share') as HTMLButtonElement;
const shareBox = document.getElementById('share') as HTMLDivElement;
const sharer = fileSharer({
  coarse: () => matchMedia('(pointer: coarse)').matches,
  canShare: navigator.canShare?.bind(navigator),
  share: navigator.share?.bind(navigator),
  download(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
});
shareButton.addEventListener('click', () => {
  sharer.prepare(new File([log.file()], 'pixelpeel-solve-log.txt', { type: 'text/plain' }));
  shareBox.hidden = false;
});
(document.getElementById('share-close') as HTMLButtonElement).addEventListener('click', () => {
  shareBox.hidden = true;
});
shareBox.addEventListener('click', (e) => {
  if (e.target === shareBox) shareBox.hidden = true;
});

// The dialog stays until the share sheet closes, so a sheet slow to appear does not look like a lost tap.
(document.getElementById('share-send') as HTMLButtonElement).addEventListener('click', () => {
  void sharer.send().then(() => {
    shareBox.hidden = true;
  });
});

menuButton.addEventListener('click', () => showMenu(menu.hidden === true));
(document.getElementById('menu-close') as HTMLButtonElement).addEventListener('click', () => showMenu(false));
menu.addEventListener('click', (e) => {
  if (e.target === menu) showMenu(false);
});
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!shareBox.hidden) shareBox.hidden = true;
  else showMenu(false);
});
// After the last level there is nothing to play: a tap anywhere opens the menu.
window.addEventListener('click', (e) => {
  const target = e.target as Node;
  const tap = {
    finale: !end.hidden && end.dataset.state === 'done',
    menuOpen: !menu.hidden,
    // The end button too: the tap on Next that leads here from the last level must not open the menu.
    handled: [menu, menuButton, endButton, shareBox].some((el) => el.contains(target)),
  };
  if (tapOpensMenu(tap)) showMenu(true);
});
// Clearing asks first, on the button itself: the first tap turns it red and asks, a second tap within a
// second clears, and with no second tap it goes back to how it was.
const clear = document.getElementById('menu-clear') as HTMLButtonElement;
const clearLabel = clear.textContent;
const clearTaps = confirmTaps();
function unarm(): void {
  clearTaps.reset();
  clear.textContent = clearLabel;
  clear.classList.remove('armed');
}
clear.addEventListener('click', () => {
  if (clearTaps.tap(performance.now()) === 'act') {
    unarm();
    progress = FRESH;
    saveProgress(store, progress);
    showMenu(false);
    open();
    return;
  }
  clear.textContent = 'Are you sure';
  clear.classList.add('armed');
  window.setTimeout(() => {
    if (!clearTaps.armed(performance.now())) unarm();
  }, CONFIRM_MS);
});

// Dev mode shows a chooser of every level in the menu, with what the bake measured for each.
for (const l of LEVELS) {
  const option = document.createElement('option');
  option.value = String(l.number);
  // Number, title, band, depth, casual wins.
  option.textContent = `${l.number} · ${l.title} · ${BAND_SHORT[l.band]} · d${l.depth} · ${Math.round((l.casualWins / CASUAL_GAMES) * 100)}%`;
  chooser.append(option);
}
chooser.addEventListener('change', () => goTo(Number(chooser.value)));

function setDev(on: boolean): void {
  chooser.hidden = !on;
  devButton.setAttribute('aria-pressed', String(on));
  try {
    store?.setItem(DEV_KEY, on ? '1' : '0');
  } catch {
    // Storage refused: dev mode lasts until the page is left.
  }
}

if (isDevPort(location.port)) {
  devButton.hidden = false;
  devButton.addEventListener('click', () => setDev(devButton.getAttribute('aria-pressed') !== 'true'));
  let on = false;
  try {
    on = store?.getItem(DEV_KEY) === '1';
  } catch {
    // Storage refused: dev mode starts off.
  }
  setDev(on);
  // ?level=N opens level N, fresh, once; a reload with the same address then resumes it as usual.
  const asked = Number(new URLSearchParams(location.search).get('level'));
  if (Number.isInteger(asked) && asked >= 1 && asked <= LEVELS.length && asked !== progress.level) {
    progress = { level: asked, reached: Math.max(progress.reached, asked), run: null };
  }
  open();
  // A hook for test rigs: the level, the rules' board, the scene and the moves.
  (window as unknown as { __pixelpeel: unknown }).__pixelpeel = {
    get level() {
      return level;
    },
    get board() {
      return board;
    },
    get scene() {
      return scene;
    },
    pick: play,
    goTo,
  };
} else {
  open();
}

relayoutWhenShown({ doc: document, win: window, canvas }, resize);
// The canvas's box can change without the window's resize, as a phone's bars come and go.
new ResizeObserver(() => resize()).observe(canvas);
(document.getElementById('menu-version') as HTMLParagraphElement).textContent = `v${__APP_VERSION__} | ${__RELEASE_DATE__}`;
// The dev server keeps hot reload: only the production build is kept offline and updated.
if (import.meta.env.PROD) reloadIfSafe = keepUpdated(() => pickedSinceOpen || !menu.hidden);
// A canvas draws with whatever font is loaded at that moment, so the first frame waits for the pixel font;
// if it cannot load, the game starts in the fallback font.
document.fonts
  .load(`16px ${PIXEL_FONT}`)
  .catch(() => [])
  .then(() => requestAnimationFrame(frame));
