// The page: draws the state on a canvas, turns a tap on a column into a pick, and ticks the rules at a
// fixed rate. All the rules live in engine.ts; this file only shows them.

import { EMPTY, createState, entryCell, frameWidth, pick, status, tick, type State } from './engine';
import { deal } from './generator';
import { HOUSE, HOUSE_RULES } from './level';
import './style.css';

/** How many cells a dot moves per second; a constant to tune. */
const STEPS_PER_SECOND = 20;
const STEP_MS = 1000 / STEPS_PER_SECOND;

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const end = document.getElementById('end') as HTMLDivElement;
const endText = document.getElementById('end-text') as HTMLParagraphElement;
const restart = document.getElementById('restart') as HTMLButtonElement;

const theDeal = deal(HOUSE, HOUSE_RULES);
let state: State = createState(HOUSE, theDeal.columns, HOUSE_RULES.buckets);

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
    const cell = inner / fw;
    const gap = inner * 0.04;
    const bucketSize = Math.min(inner / state.buckets.length * 0.7, inner * 0.16);
    const columnWidth = inner / state.columns.length;
    const potSize = Math.min(columnWidth * 0.7, inner * 0.16);
    const potGap = potSize * 0.18;
    const bucketY = pad + fh * cell + gap;
    const columnsY = bucketY + bucketSize + gap * 1.5;
    const total = columnsY + HOUSE_RULES.visible * (potSize + potGap) + pad;
    return { left: (width - inner) / 2, top: pad, cell, bucketY, bucketSize, columnsY, columnWidth, potSize, potGap, inner, total };
  };
  let inner = Math.min(width * 0.92, 560);
  let l = at(inner);
  if (l.total > height) {
    inner *= height / l.total;
    l = at(inner);
  }
  return l;
}

function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout = measure(w, h);
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
  const { left, top, cell } = layout;
  const fw = frameWidth(state);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const c = state.cells[y * state.width + x] as number;
      if (c === EMPTY) continue;
      ctx.fillStyle = state.palette[c] as string;
      ctx.fillRect(left + (x + 1) * cell, top + (y + 1) * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }

  for (const dot of state.dots) {
    const a = dot.route[dot.pos] as number;
    const b = (dot.route[dot.pos + 1] ?? a) as number;
    const ax = a % fw;
    const ay = (a - ax) / fw;
    const bx = b % fw;
    const by = (b - bx) / fw;
    const x = left + (ax + (bx - ax) * frac + 0.5) * cell;
    const y = top + (ay + (by - ay) * frac + 0.5) * cell;
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

  const canPick = state.buckets.includes(null);
  state.columns.forEach((pots, i) => {
    const x = layout.left + (i + 0.5) * layout.columnWidth;
    pots.slice(0, HOUSE_RULES.visible).forEach((pot, k) => {
      ctx.globalAlpha = k === 0 ? (canPick ? 1 : 0.7) : 0.45;
      drawPot(x, layout.columnsY + k * (layout.potSize + layout.potGap), layout.potSize, state.palette[pot.colour] as string, pot.count);
    });
    ctx.globalAlpha = 1;
  });
}

function columnAt(x: number, y: number): number {
  if (y < layout.columnsY - layout.potGap) return -1;
  const i = Math.floor((x - layout.left) / layout.columnWidth);
  return i >= 0 && i < state.columns.length ? i : -1;
}

canvas.addEventListener('pointerdown', (e) => {
  if (status(state) !== 'playing') return;
  const column = columnAt(e.clientX, e.clientY);
  if (column >= 0) state = pick(state, column);
});

restart.addEventListener('click', () => {
  state = createState(HOUSE, theDeal.columns, HOUSE_RULES.buckets);
  end.hidden = true;
});

let last = performance.now();
let acc = 0;
function frame(now: number): void {
  acc += now - last;
  last = now;
  if (acc > 1000) acc = STEP_MS;
  while (acc >= STEP_MS) {
    acc -= STEP_MS;
    if (status(state) === 'playing') state = tick(state);
  }
  draw(acc / STEP_MS);
  const s = status(state);
  if (s !== 'playing' && end.hidden) {
    endText.textContent = s === 'won' ? 'Peeled!' : 'Stuck';
    end.hidden = false;
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(frame);

// A hook for test rigs: the state, the deal's winning plan, and the moves.
(window as unknown as { __pixelpeel: unknown }).__pixelpeel = {
  get state() {
    return state;
  },
  plan: theDeal.plan,
  pick: (column: number) => (state = pick(state, column)),
};
