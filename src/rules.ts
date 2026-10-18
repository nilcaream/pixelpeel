// The rules of Pixel Peel, as a logical model: no dots and no time. A pick puts the top pot of a column
// into a free bucket, and then everything that can happen happens at once: each pot in a bucket lifts
// reachable pixels of its colour, its count going down, and leaves its bucket at zero. The outcome of a
// game depends on nothing but the order of the picks. The page animates what the model has decided.
//
// A pixel is reachable when it touches the outside of the picture through squares already emptied.
// The pixel a pot takes is the most exposed one of its colour: the shortest walk from outside, then the
// lowest row, then the leftmost. Pots take turns, one pixel each, the earliest picked first, until none
// of them can take any more.

import type { Picture } from './picture.ts';

/** A square of the picture whose pixel is gone. */
export const EMPTY = -1;

export interface Pot {
  colour: number;
  count: number;
}

/** A pot in a bucket. */
export interface Held {
  /** Numbered by pick, from 0. */
  id: number;
  colour: number;
  count: number;
  /** The pixels it has still to lift; it leaves its bucket at 0. */
  left: number;
}

/** One pixel lifted by one pot. */
export interface Lift {
  pot: number;
  square: number;
}

export interface Board {
  width: number;
  height: number;
  palette: string[];
  /** A palette index per square, or EMPTY. */
  cells: Int16Array;
  /** Each column's pots, the top one first. */
  columns: Pot[][];
  /** How many buckets there are. */
  buckets: number;
  /** The pots in buckets, the earliest picked first. */
  held: Held[];
  picked: number;
}

export type Status = 'playing' | 'won' | 'stuck';

// Up, left, right, down.
const STEPS: readonly (readonly [number, number])[] = [[0, -1], [-1, 0], [1, 0], [0, 1]];

export function createBoard(picture: Picture, columns: Pot[][], buckets: number): Board {
  return {
    width: picture.width,
    height: picture.height,
    palette: picture.palette,
    cells: Int16Array.from(picture.cells),
    columns: columns.map((c) => c.slice()),
    buckets,
    held: [],
    picked: 0,
  };
}

/**
 * Per colour, the most exposed reachable pixel (or −1), and how many pixels of each colour are
 * reachable. One walk from the whole ring round the picture, over the ring and the emptied squares.
 */
function survey(b: Board): { best: number[]; counts: number[] } {
  const w = b.width;
  const fw = w + 2;
  const fh = b.height + 2;
  const dist = new Int32Array(fw * fh).fill(-1);
  const queue = new Int32Array(fw * fh);
  let tail = 0;
  for (let fy = 0; fy < fh; fy++)
    for (let fx = 0; fx < fw; fx++)
      if (fx === 0 || fy === 0 || fx === fw - 1 || fy === fh - 1) {
        dist[fy * fw + fx] = 0;
        queue[tail++] = fy * fw + fx;
      }
  const best = b.palette.map(() => -1);
  const bestD = b.palette.map(() => 0);
  const counts = b.palette.map(() => 0);
  const seen = new Uint8Array(b.cells.length);
  for (let head = 0; head < tail; head++) {
    const cell = queue[head] as number;
    const fx = cell % fw;
    const fy = (cell - fx) / fw;
    for (const [dx, dy] of STEPS) {
      const nx = fx + dx;
      const ny = fy + dy;
      if (nx < 1 || ny < 1 || nx > w || ny > b.height) continue;
      const next = ny * fw + nx;
      if (dist[next] !== -1) continue;
      const square = (ny - 1) * w + nx - 1;
      const colour = b.cells[square] as number;
      if (colour === EMPTY) {
        dist[next] = (dist[cell] as number) + 1;
        queue[tail++] = next;
        continue;
      }
      if (seen[square]) continue;
      seen[square] = 1;
      counts[colour] = (counts[colour] as number) + 1;
      const d = (dist[cell] as number) + 1;
      const at = best[colour] as number;
      const row = (square / w) | 0;
      const atRow = (at / w) | 0;
      const better =
        at < 0 || d < (bestD[colour] as number) || (d === bestD[colour] && (row > atRow || (row === atRow && square < at)));
      if (better) {
        best[colour] = square;
        bestD[colour] = d;
      }
    }
  }
  return { best, counts };
}

/** Per colour: the pixels reachable now, less what the pots in the buckets have still to lift. */
export function reachable(b: Board): number[] {
  const { counts } = survey(b);
  for (const h of b.held) counts[h.colour] = (counts[h.colour] as number) - h.left;
  return counts;
}

/** Lets the pots in the buckets lift all they can, in turns; returns the lifts in the order they happen. */
function settle(b: Board): Lift[] {
  const lifts: Lift[] = [];
  for (let moved = true; moved; ) {
    moved = false;
    for (const h of b.held) {
      if (h.left === 0) continue;
      const square = survey(b).best[h.colour] as number;
      if (square < 0) continue;
      b.cells[square] = EMPTY;
      h.left -= 1;
      lifts.push({ pot: h.id, square });
      moved = true;
    }
  }
  b.held = b.held.filter((h) => h.left > 0);
  return lifts;
}

/**
 * The player's move: the top pot of the column goes into a free bucket, and everything that follows
 * happens. Null when every bucket is held or the column is empty.
 */
export function pick(b: Board, column: number): { board: Board; pot: Held; lifts: Lift[] } | null {
  if (b.held.length >= b.buckets || !b.columns[column]?.length) return null;
  const next: Board = {
    ...b,
    cells: new Int16Array(b.cells),
    columns: b.columns.map((c) => c.slice()),
    held: b.held.map((h) => ({ ...h })),
    picked: b.picked + 1,
  };
  const top = (next.columns[column] as Pot[]).shift() as Pot;
  const pot: Held = { id: b.picked, colour: top.colour, count: top.count, left: top.count };
  next.held.push(pot);
  const lifts = settle(next);
  return { board: next, pot: { ...pot }, lifts };
}

/** Won when the picture is empty; stuck when no pick can be made and the pots held can lift nothing. */
export function status(b: Board): Status {
  if (b.cells.every((c) => c === EMPTY)) return 'won';
  if (b.held.length < b.buckets && b.columns.some((c) => c.length > 0)) return 'playing';
  return 'stuck';
}
