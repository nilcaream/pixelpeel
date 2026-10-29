// What the player sees: dots that fly out of the buckets to the pixels the rules have lifted. The rules
// (rules.ts) have already decided everything; the scene only shows it, and decides nothing but when. A tick
// moves every dot one cell and sends new dots out.
//
// Dots walk on the frame grid: the picture plus a ring one cell wide around it. A bucket sends a dot for
// each pixel its pot lifted, the first in the rules' order whose way is open: over what is empty on screen,
// or right behind a dot already on its way to a pixel next to it. The dot and the pixel vanish together when
// it gets there. A bucket whose last dot has left is gone at once, and its place is free for the next pot.

import { EMPTY, type Board, type Held, type Lift } from './rules.ts';

/** A step of a dot's route that is the bucket itself: every route starts there. */
export const AT_BUCKET = -1;

/** How many ticks a bucket waits between sending out two dots. */
export const LAUNCH_GAP = 2;

export interface Slot {
  /** The pot in this bucket, by its pick number. */
  pot: number;
  colour: number;
  count: number;
  /** Dots it has sent out; the bucket shows count − sent. */
  sent: number;
  /** The squares the rules lifted for this pot that no dot has set off for yet, in order. */
  queue: number[];
  sinceLaunch: number;
}

export interface Dot {
  slot: number;
  colour: number;
  /** From the bucket (AT_BUCKET) through frame cells to the pixel, its last step. */
  route: number[];
  pos: number;
}

export interface Scene {
  width: number;
  height: number;
  palette: string[];
  /** The picture as it is on screen. */
  cells: Int16Array;
  slots: (Slot | null)[];
  dots: Dot[];
  ticks: number;
}

// Up, left, right, down: the fixed order that settles a tie between two equally short ways.
const STEPS: readonly (readonly [number, number])[] = [[0, -1], [-1, 0], [1, 0], [0, 1]];

/** A scene showing the board as it stands, with nothing moving: the pots held fill the buckets from the left. */
export function createScene(b: Board): Scene {
  return {
    width: b.width,
    height: b.height,
    palette: b.palette,
    cells: new Int16Array(b.cells),
    slots: Array.from({ length: b.buckets }, (_, i) => {
      const h = b.held[i];
      return h ? { pot: h.id, colour: h.colour, count: h.count, sent: h.count - h.left, queue: [], sinceLaunch: LAUNCH_GAP } : null;
    }),
    dots: [],
    ticks: 0,
  };
}

function clone(s: Scene): Scene {
  return {
    ...s,
    cells: new Int16Array(s.cells),
    slots: s.slots.map((b) => (b ? { ...b, queue: b.queue.slice() } : null)),
    dots: s.dots.map((d) => ({ ...d })),
  };
}

/** The frame grid is (width + 2) × (height + 2); frame cell (x + 1, y + 1) is square (x, y). */
export function frameWidth(s: Scene): number {
  return s.width + 2;
}

/** The square a frame cell covers, or −1 for a cell of the ring. */
export function squareOf(s: Scene, cell: number): number {
  const fw = s.width + 2;
  const x = (cell % fw) - 1;
  const y = Math.floor(cell / fw) - 1;
  return x < 0 || y < 0 || x >= s.width || y >= s.height ? -1 : y * s.width + x;
}

/** The ring cell under bucket i, where its dots start: the buckets share the picture's width evenly. */
export function entryCell(s: Scene, bucket: number): number {
  const x = Math.min(s.width - 1, Math.max(0, Math.round(((bucket + 0.5) * s.width) / s.slots.length - 0.5)));
  return (s.height + 1) * (s.width + 2) + x + 1;
}

/** The leftmost free bucket, or −1. */
export function freeSlot(s: Scene): number {
  return s.slots.indexOf(null);
}

/** True when nothing moves and nothing waits to be shown. */
export function idle(s: Scene): boolean {
  return s.dots.length === 0 && s.slots.every((b) => !b || b.queue.length === 0);
}

/**
 * Shows a pick: the pot goes into the leftmost free bucket, and each lift the rules made joins the
 * queue of the bucket whose pot made it.
 */
export function place(s: Scene, pot: Held, lifts: Lift[]): Scene {
  const next = clone(s);
  const free = freeSlot(next);
  if (free < 0) throw new Error('no free bucket to show the pick in');
  next.slots[free] = { pot: pot.id, colour: pot.colour, count: pot.count, sent: 0, queue: [], sinceLaunch: LAUNCH_GAP };
  for (const lift of lifts) next.slots.find((b) => b?.pot === lift.pot)?.queue.push(lift.square);
  return next;
}

/** Steps from a frame cell to every cell a dot can walk on now (the ring and the empty squares), −1 elsewhere. */
function walk(s: Scene, start: number): Int32Array {
  const fw = s.width + 2;
  const fh = s.height + 2;
  const dist = new Int32Array(fw * fh).fill(-1);
  const queue = new Int32Array(fw * fh);
  dist[start] = 0;
  let tail = 0;
  queue[tail++] = start;
  for (let head = 0; head < tail; head++) {
    const cell = queue[head] as number;
    const fx = cell % fw;
    const fy = (cell - fx) / fw;
    for (const [dx, dy] of STEPS) {
      const nx = fx + dx;
      const ny = fy + dy;
      if (nx < 0 || ny < 0 || nx >= fw || ny >= fh) continue;
      const next = ny * fw + nx;
      if (dist[next] !== -1) continue;
      const square = squareOf(s, next);
      if (square >= 0 && s.cells[square] !== EMPTY) continue;
      dist[next] = (dist[cell] as number) + 1;
      queue[tail++] = next;
    }
  }
  return dist;
}

/** Follows a walk's distances down from a cell to the walk's start, taking the first step that is shorter. */
function descend(s: Scene, dist: Int32Array, from: number): number[] {
  const fw = s.width + 2;
  const cells: number[] = [];
  let cell = from;
  while ((dist[cell] as number) > 0) {
    const fx = cell % fw;
    const want = (dist[cell] as number) - 1;
    for (const [dx, dy] of STEPS) {
      const nx = fx + dx;
      if (nx < 0 || nx >= fw) continue;
      const next = cell + dy * fw + dx;
      if (dist[next] === want) {
        cell = next;
        break;
      }
    }
    cells.push(cell);
  }
  return cells;
}

/**
 * The shortest way from a bucket's entry cell to a pixel, both ends included; null while there is none. It goes
 * over what is empty on screen (dist, the walk from the entry cell), or behind a dot already out from the same
 * entry cell whose pixel touches this one: along that dot's route and one step on. That dot is ahead at every
 * step, so each square on the way is empty by the time this dot gets there.
 */
function wayTo(s: Scene, entry: number, dist: Int32Array, square: number): number[] | null {
  const fw = s.width + 2;
  const pixel = (Math.floor(square / s.width) + 1) * fw + (square % s.width) + 1;
  let best = -1;
  for (const [dx, dy] of STEPS) {
    const next = pixel + dy * fw + dx;
    const d = dist[next] ?? -1;
    if (d >= 0 && (best < 0 || d < (dist[best] as number))) best = next;
  }
  let way = best < 0 ? null : [...descend(s, dist, best).reverse(), best, pixel];
  for (const dot of s.dots) {
    if (dot.route[1] !== entry || dot.pos < 1) continue;
    const ahead = dot.route[dot.route.length - 1] as number;
    if (!STEPS.some(([dx, dy]) => ahead === pixel + dy * fw + dx)) continue;
    if (!way || dot.route.length < way.length) way = [...dot.route.slice(1), pixel];
  }
  return way;
}

/** One step of time: every dot moves one cell, a dot at its pixel vanishes with it, and new dots set off. */
export function tick(s: Scene): Scene {
  const next = clone(s);
  next.ticks += 1;
  next.dots = next.dots.filter((dot) => {
    dot.pos += 1;
    if (dot.pos < dot.route.length - 1) return true;
    next.cells[squareOf(next, dot.route[dot.pos] as number)] = EMPTY;
    return false;
  });
  next.slots.forEach((b, i) => {
    if (!b) return;
    b.sinceLaunch += 1;
    if (!b.queue.length || b.sinceLaunch < LAUNCH_GAP) return;
    // The first pixel in the queue that a dot can get to now: one whose way is still shut waits, the others do not.
    const entry = entryCell(next, i);
    const dist = walk(next, entry);
    let way: number[] | null = null;
    let at = 0;
    for (; at < b.queue.length && !way; at++) way = wayTo(next, entry, dist, b.queue[at] as number);
    if (!way) return;
    b.queue.splice(at - 1, 1);
    next.dots.push({ slot: i, colour: b.colour, route: [AT_BUCKET, ...way], pos: 0 });
    b.sent += 1;
    b.sinceLaunch = 0;
    if (b.sent === b.count) next.slots[i] = null;
  });
  return next;
}
