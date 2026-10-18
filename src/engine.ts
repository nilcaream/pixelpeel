// The rules of Pixel Peel, pure and deterministic. A state changes in two ways only: pick() moves the
// top pot of a column into a free bucket (the one thing the player does), and tick() moves every dot
// one cell and sends new dots out. Nothing here knows about time, the canvas or randomness.
//
// Dots walk on the frame grid: the picture plus a ring one cell wide around it, so a dot can walk
// along the outside of the picture and in through squares that are already empty. A dot leaves its
// bucket onto the ring cell under the bucket, goes to the closest pixel of its colour that it can
// reach, lifts it (the square empties at that moment), and carries it back the same way into the bucket.

import type { Picture } from './picture.ts';

/** A square of the picture whose pixel is gone. */
export const EMPTY = -1;

/** A step of a dot's route that is the bucket itself: every route starts and ends there. */
export const AT_BUCKET = -1;

/** How many ticks a bucket waits between sending out two dots. */
export const LAUNCH_GAP = 2;

export interface Pot {
  colour: number;
  count: number;
}

export interface Bucket {
  colour: number;
  /** The pixels the pot holds, which is the number it shows when it arrives. */
  count: number;
  /** Pixels a dot has set off for. */
  claimed: number;
  /** Pixels already lifted out of the picture; the bucket shows count − pickedUp. */
  pickedUp: number;
  sinceLaunch: number;
}

export interface Dot {
  bucket: number;
  colour: number;
  /** From the bucket (AT_BUCKET) through frame cells to the pixel, and the same way back into the bucket. */
  route: number[];
  /** The index in route where the pixel is. */
  turn: number;
  pos: number;
  carrying: boolean;
}

export interface State {
  width: number;
  height: number;
  palette: string[];
  /** A palette index per square, or EMPTY. */
  cells: Int16Array;
  /** 1 where a dot is on its way to that pixel. */
  claimed: Uint8Array;
  /** Each column's pots, the top one first. */
  columns: Pot[][];
  buckets: (Bucket | null)[];
  dots: Dot[];
  ticks: number;
}

export type Status = 'playing' | 'won' | 'stuck';

// Up, left, right, down: the fixed order that settles a tie between two equally short routes.
const STEPS: readonly (readonly [number, number])[] = [[0, -1], [-1, 0], [1, 0], [0, 1]];

export function createState(picture: Picture, columns: Pot[][], buckets: number): State {
  return {
    width: picture.width,
    height: picture.height,
    palette: picture.palette,
    cells: Int16Array.from(picture.cells),
    claimed: new Uint8Array(picture.cells.length),
    columns: columns.map((c) => c.slice()),
    buckets: Array.from({ length: buckets }, () => null),
    dots: [],
    ticks: 0,
  };
}

function clone(s: State): State {
  return {
    ...s,
    cells: new Int16Array(s.cells),
    claimed: new Uint8Array(s.claimed),
    columns: s.columns.map((c) => c.slice()),
    buckets: s.buckets.map((b) => (b ? { ...b } : null)),
    dots: s.dots.map((d) => ({ ...d })),
  };
}

/** The frame grid is (width + 2) × (height + 2); frame cell (x + 1, y + 1) is square (x, y). */
export function frameWidth(s: State): number {
  return s.width + 2;
}

/** The square a frame cell covers, or −1 for a cell of the ring. */
export function squareOf(s: State, cell: number): number {
  const fw = s.width + 2;
  const x = (cell % fw) - 1;
  const y = Math.floor(cell / fw) - 1;
  return x < 0 || y < 0 || x >= s.width || y >= s.height ? -1 : y * s.width + x;
}

/** The ring cell under bucket i, where its dots start: the buckets share the picture's width evenly. */
export function entryCell(s: State, bucket: number): number {
  const x = Math.min(s.width - 1, Math.max(0, Math.round(((bucket + 0.5) * s.width) / s.buckets.length - 0.5)));
  return (s.height + 1) * (s.width + 2) + x + 1;
}

export interface Target {
  square: number;
  /** Frame cells from the entry cell to the pixel, both included. */
  path: number[];
}

/**
 * The pixel of this colour a dot from this bucket goes for: no other dot is on its way to it, it is
 * reachable from outside through empty squares, and its route is the shortest. A tie goes to the
 * lowest row (nearest the buckets), then to the leftmost square.
 */
export function findTarget(s: State, bucket: number, colour: number): Target | null {
  const fw = s.width + 2;
  const fh = s.height + 2;
  const dist = new Int32Array(fw * fh).fill(-1);
  const parent = new Int32Array(fw * fh).fill(-1);
  const queue = new Int32Array(fw * fh);
  const start = entryCell(s, bucket);
  dist[start] = 0;
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  let best: { square: number; cell: number; from: number; d: number; x: number; y: number } | null = null;
  while (head < tail) {
    const cell = queue[head++] as number;
    const d = dist[cell] as number;
    if (best && d + 1 > best.d) break;
    const fx = cell % fw;
    const fy = (cell - fx) / fw;
    for (const [dx, dy] of STEPS) {
      const nx = fx + dx;
      const ny = fy + dy;
      if (nx < 0 || ny < 0 || nx >= fw || ny >= fh) continue;
      const next = ny * fw + nx;
      if (dist[next] !== -1) continue;
      const square = squareOf(s, next);
      if (square < 0 || s.cells[square] === EMPTY) {
        dist[next] = d + 1;
        parent[next] = cell;
        queue[tail++] = next;
      } else if (s.cells[square] === colour && !s.claimed[square]) {
        const x = nx - 1;
        const y = ny - 1;
        const better = !best || d + 1 < best.d || (d + 1 === best.d && (y > best.y || (y === best.y && x < best.x)));
        if (better) best = { square, cell: next, from: cell, d: d + 1, x, y };
      }
    }
  }
  if (!best) return null;
  const path = [best.cell];
  for (let c = best.from; c !== -1; c = parent[c] as number) path.push(c);
  return { square: best.square, path: path.reverse() };
}

/** Steps from a bucket's entry cell to every frame cell a dot can walk on (the ring and the empty squares), −1 elsewhere. */
function stepsHome(s: State, bucket: number): Int32Array {
  const fw = s.width + 2;
  const fh = s.height + 2;
  const dist = new Int32Array(fw * fh).fill(-1);
  const queue = new Int32Array(fw * fh);
  const start = entryCell(s, bucket);
  dist[start] = 0;
  let head = 0;
  let tail = 0;
  queue[tail++] = start;
  while (head < tail) {
    const cell = queue[head++] as number;
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

/**
 * Plans the rest of a carrying dot's route as the shortest walk to its bucket on the picture as it is
 * now: once when it lifts its pixel, and again if its bucket hands it over.
 */
function planHome(s: State, dot: Dot, fields: Map<number, Int32Array>): void {
  let field = fields.get(dot.bucket);
  if (!field) {
    field = stepsHome(s, dot.bucket);
    fields.set(dot.bucket, field);
  }
  const fw = s.width + 2;
  let cell = dot.route[dot.pos] as number;
  if ((field[cell] ?? -1) < 0) return;
  const rest: number[] = [];
  while ((field[cell] as number) > 0) {
    const fx = cell % fw;
    const want = (field[cell] as number) - 1;
    for (const [dx, dy] of STEPS) {
      const nx = fx + dx;
      if (nx < 0 || nx >= fw) continue;
      const next = cell + dy * fw + dx;
      if (field[next] === want) {
        cell = next;
        break;
      }
    }
    rest.push(cell);
  }
  dot.route = [...dot.route.slice(0, dot.pos + 1), ...rest, AT_BUCKET];
}

/**
 * A bucket whose pixels are all lifted, with only dots coming home, gives its place up when another bucket
 * holds its colour: its dots go home to that bucket instead, and the place is free at once.
 */
function handOver(s: State, homing: Set<Dot>): void {
  s.buckets.forEach((b, i) => {
    if (!b || b.pickedUp < b.count) return;
    const heir = s.buckets.findIndex((o, j) => j !== i && o !== null && o.colour === b.colour);
    if (heir < 0) return;
    for (const dot of s.dots) {
      if (dot.bucket !== i) continue;
      dot.bucket = heir;
      homing.add(dot);
    }
    s.buckets[i] = null;
  });
}

/** The player's move: the top pot of the column goes into the leftmost free bucket. */
export function pick(s: State, column: number): State {
  const free = s.buckets.indexOf(null);
  if (free < 0 || !s.columns[column]?.length) return s;
  const next = clone(s);
  const pot = (next.columns[column] as Pot[]).shift() as Pot;
  next.buckets[free] = { colour: pot.colour, count: pot.count, claimed: 0, pickedUp: 0, sinceLaunch: LAUNCH_GAP };
  return next;
}

/** One step of time: every dot moves one cell, finished buckets free themselves, and new dots set off. */
export function tick(s: State): State {
  const next = clone(s);
  next.ticks += 1;
  const moving: Dot[] = [];
  const homing = new Set<Dot>();
  for (const dot of next.dots) {
    dot.pos += 1;
    if (dot.pos === dot.turn) {
      const square = squareOf(next, dot.route[dot.turn] as number);
      next.cells[square] = EMPTY;
      next.claimed[square] = 0;
      dot.carrying = true;
      (next.buckets[dot.bucket] as Bucket).pickedUp += 1;
      homing.add(dot);
    }
    if (dot.pos < dot.route.length - 1) moving.push(dot);
  }
  next.dots = moving;
  handOver(next, homing);
  const fields = new Map<number, Int32Array>();
  for (const dot of homing) planHome(next, dot, fields);
  next.buckets = next.buckets.map((b, i) =>
    b && b.pickedUp === b.count && !moving.some((d) => d.bucket === i) ? null : b,
  );
  next.buckets.forEach((b, i) => {
    if (!b) return;
    b.sinceLaunch += 1;
    if (b.claimed >= b.count || b.sinceLaunch < LAUNCH_GAP) return;
    const target = findTarget(next, i, b.colour);
    if (!target) return;
    const back = target.path.slice(0, -1).reverse();
    next.claimed[target.square] = 1;
    const route = [AT_BUCKET, ...target.path, ...back, AT_BUCKET];
    next.dots.push({ bucket: i, colour: b.colour, route, turn: target.path.length, pos: 0, carrying: false });
    b.claimed += 1;
    b.sinceLaunch = 0;
  });
  return next;
}

/** Won when the picture is empty and every dot is home; stuck when nothing can happen any more. */
export function status(s: State): Status {
  if (s.dots.length > 0) return 'playing';
  if (s.cells.every((c) => c === EMPTY)) return 'won';
  if (s.buckets.includes(null) && s.columns.some((c) => c.length > 0)) return 'playing';
  const canSend = s.buckets.some((b, i) => b && b.claimed < b.count && findTarget(s, i, b.colour));
  return canSend ? 'playing' : 'stuck';
}
