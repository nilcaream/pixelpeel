// The page: draws the state on a canvas, turns a tap on a column into a pick, and ticks the rules at a
// fixed rate. All the rules live in engine.ts; this file only shows them. The player is always on the
// first level not yet peeled; every pick is saved, so a reload replays the picks and goes on exactly
// where it was left.

import { AUTOPILOT_SPEED, autopilotPick, onAutopilot } from './autopilot.ts';
import { AT_BUCKET, EMPTY, entryCell, frameWidth, pick, status, tick, type State } from './engine.ts';
import { resume, type PlannedPick } from './generator.ts';
import levelsFile from './levels.json';
import type { Band, Level } from './levels.ts';
import { poolPicture, type Picture } from './picture.ts';
import { browserStore, loadProgress, saveProgress, type Progress } from './progress.ts';
import './style.css';

/** How many cells a dot moves per second; a constant to tune. */
const STEPS_PER_SECOND = 10;
const STEP_MS = 1000 / STEPS_PER_SECOND;

/** How many pots of each column are shown. */
const VISIBLE = 3;

/** The height kept free at the top for the level's number and band. */
const HUD_HEIGHT = 40;

const BAND_LABEL: Record<Band, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard', 'very hard': 'Very hard' };

const LEVELS = levelsFile as unknown as Level[];

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const hud = document.getElementById('hud') as HTMLDivElement;
const label = document.getElementById('level-label') as HTMLSpanElement;
const end = document.getElementById('end') as HTMLDivElement;
const endText = document.getElementById('end-text') as HTMLParagraphElement;
const endButton = document.getElementById('end-button') as HTMLButtonElement;

const store = browserStore();
let progress: Progress = loadProgress(store);
let level: Level | null = null;
let picture: Picture;
let picks: PlannedPick[] = [];
let state: State;

/** Opens the level the progress is on, resuming its saved picks when they belong to this very level. */
function open(): void {
  level = LEVELS[progress.level - 1] ?? null;
  end.hidden = true;
  if (!level) {
    label.textContent = 'All levels peeled';
    endText.textContent = `All ${LEVELS.length} levels peeled!`;
    endButton.hidden = true;
    end.hidden = false;
    return;
  }
  label.textContent = `Level ${level.number} · ${BAND_LABEL[level.band]}`;
  picture = poolPicture(level.rows);
  const saved = progress.run?.id === level.id ? progress.run.picks : [];
  picks = saved.slice();
  state = resume(picture, level.columns, level.structure.buckets, picks);
  progress = { ...progress, run: { id: level.id, picks } };
  saveProgress(store, progress);
  resize();
  afterOpen();
}

/** What the dev tools do each time a level opens. */
let afterOpen = (): void => {};

/** Moves the progress to a level and opens it with nothing in play. */
function goTo(n: number): void {
  progress = { level: Math.max(1, Math.min(n, LEVELS.length + 1)), run: null };
  saveProgress(store, progress);
  open();
}

interface Layout {
  left: number;
  top: number;
  cell: number;
  bucketY: number;
  bucketSize: number;
  columnsY: number;
  columnWidth: number;
  potSize: number;
  potGap: number;
  inner: number;
}

let layout: Layout;

/** Portrait first: one tall column (picture, buckets, pots) that fits the screen and is centred on a wide one. */
function measure(width: number, height: number): Layout {
  const fw = state.width + 2;
  const fh = state.height + 2;
  const at = (inner: number): Layout & { total: number } => {
    const pad = inner * 0.04;
    const cell = inner / Math.max(fw, fh);
    const gap = inner * 0.04;
    const bucketSize = Math.min(((state.width * cell) / state.buckets.length) * 0.8, inner * 0.16);
    const columnWidth = inner / state.columns.length;
    const potSize = Math.min(columnWidth * 0.7, inner * 0.16);
    const potGap = potSize * 0.18;
    const bucketY = HUD_HEIGHT + pad + fh * cell + gap;
    const columnsY = bucketY + bucketSize + gap * 1.5;
    const total = columnsY + VISIBLE * (potSize + potGap) + pad;
    const left = (width - inner) / 2 + (inner - fw * cell) / 2;
    return { left, top: HUD_HEIGHT + pad, cell, bucketY, bucketSize, columnsY, columnWidth, potSize, potGap, inner, total };
  };
  let inner = Math.min(width * 0.92, 560);
  let l = at(inner);
  if (l.total > height) {
    inner *= (height - HUD_HEIGHT) / (l.total - HUD_HEIGHT);
    l = at(inner);
  }
  return { ...l, inner };
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (level) layout = measure(w, h);
}

function bucketCentreX(i: number): number {
  const cell = entryCell(state, i) % frameWidth(state);
  return layout.left + (cell + 0.5) * layout.cell;
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
  ctx.font = `600 ${Math.round(size * 0.42)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), x, y + size / 2 + 1);
}

function draw(frac: number): void {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!level) return;
  const { left, top, cell } = layout;
  const fw = frameWidth(state);

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const c = state.cells[y * state.width + x] as number;
      if (c === EMPTY) continue;
      ctx.fillStyle = state.palette[c] as string;
      ctx.fillRect(left + (x + 1) * cell, top + (y + 1) * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }

  // The grid of the picture's pixels, over filled and emptied squares alike.
  ctx.beginPath();
  for (let i = 0; i <= state.width; i++) {
    const x = left + (i + 1) * cell;
    ctx.moveTo(x, top + cell);
    ctx.lineTo(x, top + (state.height + 1) * cell);
  }
  for (let j = 0; j <= state.height; j++) {
    const y = top + (j + 1) * cell;
    ctx.moveTo(left + cell, y);
    ctx.lineTo(left + (state.width + 1) * cell, y);
  }
  ctx.lineWidth = Math.max(1, cell * 0.06);
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.stroke();

  // Dots go under the buckets, so a bucket's number stays readable while dots leave and enter it.
  const at = (step: number, bucket: number): [number, number] => {
    if (step === AT_BUCKET) return [bucketCentreX(bucket), layout.bucketY + layout.bucketSize / 2];
    const fx = step % fw;
    const fy = (step - fx) / fw;
    return [left + (fx + 0.5) * cell, top + (fy + 0.5) * cell];
  };
  for (const dot of state.dots) {
    const a = dot.route[dot.pos] as number;
    const b = (dot.route[dot.pos + 1] ?? a) as number;
    const [ax, ay] = at(a, dot.bucket);
    const [bx, by] = at(b, dot.bucket);
    const x = ax + (bx - ax) * frac;
    const y = ay + (by - ay) * frac;
    ctx.beginPath();
    ctx.arc(x, y, cell * 0.36, 0, Math.PI * 2);
    ctx.fillStyle = state.palette[dot.colour] as string;
    ctx.fill();
    if (dot.carrying) {
      ctx.lineWidth = Math.max(1.5, cell * 0.14);
      ctx.strokeStyle = '#111114';
      ctx.stroke();
    }
  }

  state.buckets.forEach((bucket, i) => {
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
    drawPot(x, layout.bucketY, size, state.palette[bucket.colour] as string, bucket.count - bucket.pickedUp);
  });

  state.columns.forEach((pots, i) => {
    pots.slice(0, VISIBLE).forEach((pot, k) => {
      drawPot(columnX(i), potY(k), layout.potSize, state.palette[pot.colour] as string, pot.count);
    });
  });
}

function columnX(i: number): number {
  return (window.innerWidth - layout.inner) / 2 + (i + 0.5) * layout.columnWidth;
}

function potY(row: number): number {
  return layout.columnsY + row * (layout.potSize + layout.potGap);
}

/** The column whose top pot is under the point, or −1: only the top pot itself can be tapped. */
function columnAt(x: number, y: number): number {
  const half = layout.potSize / 2;
  const top = potY(0);
  if (y < top || y > top + layout.potSize) return -1;
  return state.columns.findIndex((pots, i) => pots.length > 0 && Math.abs(x - columnX(i)) <= half);
}

/** The player's move, saved at once with the tick it was made at. */
function play(column: number): void {
  if (!level || status(state) !== 'playing') return;
  const next = pick(state, column);
  if (next === state) return;
  picks.push({ tick: state.ticks, column });
  state = next;
  saveProgress(store, progress);
}

canvas.addEventListener('pointerdown', (e) => {
  if (!level) return;
  const column = columnAt(e.clientX, e.clientY);
  if (column >= 0) play(column);
});

endButton.addEventListener('click', () => {
  if (!level) return;
  if (status(state) === 'won') goTo(level.number + 1);
  else goTo(level.number);
});

let last = performance.now();
let acc = 0;
function frame(now: number): void {
  acc += now - last;
  last = now;
  if (acc > 1000) acc = STEP_MS;
  const stepMs = level && onAutopilot(state) ? STEP_MS / AUTOPILOT_SPEED : STEP_MS;
  if (level) {
    while (acc >= stepMs) {
      acc -= stepMs;
      if (status(state) !== 'playing') continue;
      const column = autopilotPick(state);
      if (column >= 0) play(column);
      state = tick(state);
    }
    const s = status(state);
    if (s !== 'playing' && end.hidden) {
      if (s === 'won') {
        // The level is peeled: the progress moves on now, so a reload opens the next level.
        progress = { level: level.number + 1, run: null };
        saveProgress(store, progress);
      }
      endText.textContent = s === 'won' ? 'Peeled!' : 'Stuck';
      endButton.textContent = s === 'won' ? 'Next' : 'Retry';
      endButton.hidden = false;
      end.hidden = false;
    }
  }
  draw(acc / stepMs);
  requestAnimationFrame(frame);
}

if (import.meta.env.DEV) {
  // Tools for trying levels while the game is worked on; the production build leaves all of this out.
  const chooser = document.createElement('select');
  for (const l of LEVELS) {
    const option = document.createElement('option');
    option.value = String(l.number);
    option.textContent = `${l.number} · ${BAND_LABEL[l.band]} · ${l.source.title} · ${Math.round(l.winShare * 100)}%`;
    chooser.append(option);
  }
  chooser.addEventListener('change', () => goTo(Number(chooser.value)));
  const skip = document.createElement('button');
  skip.type = 'button';
  skip.textContent = 'Skip ›';
  skip.addEventListener('click', () => goTo((level?.number ?? LEVELS.length) + 1));
  label.hidden = true;
  hud.append(chooser, skip);
  afterOpen = () => {
    chooser.value = String(Math.min(progress.level, LEVELS.length));
  };
  // ?level=N opens level N, fresh, once; a reload with the same address then resumes it as usual.
  const asked = Number(new URLSearchParams(location.search).get('level'));
  if (Number.isInteger(asked) && asked >= 1 && asked <= LEVELS.length && asked !== progress.level) {
    progress = { level: asked, run: null };
  }
  open();
  // A hook for test rigs: the level, the state and the moves.
  (window as unknown as { __pixelpeel: unknown }).__pixelpeel = {
    get level() {
      return level;
    },
    get state() {
      return state;
    },
    pick: play,
    goTo,
  };
} else {
  open();
}

window.addEventListener('resize', resize);
requestAnimationFrame(frame);
