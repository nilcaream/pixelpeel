// Deals a level's pots so that the level can always be won. The generator plays the real rules
// forward: whenever a bucket is free, it makes the next pot from a colour that has pixels which are
// reachable now and not yet owed to a pot in a bucket, never bigger than that count. Pixels of a colour
// leave the picture only through pots of that colour, and the reachable pixels only grow, so no bucket
// can wait for ever. The pots are then dealt in that order to the bottoms of the columns, so each pot
// has only earlier pots above it, and the plan (which column at which tick) replays the same game.

import { EMPTY, createState, entryCell, pick, squareOf, status, tick, type Pot, type State } from './engine';
import type { Picture } from './picture';
import { between, seededRng } from './rng';

export interface DealOptions {
  buckets: number;
  columns: number;
  seed: number;
  potMin: number;
  potMax: number;
}

export interface PlannedPick {
  tick: number;
  column: number;
}

export interface Deal {
  columns: Pot[][];
  /** A winning game: pick this column when the state reaches this tick. */
  plan: PlannedPick[];
}

/** Per colour: pixels reachable from outside now, less what the pots already in buckets still owe. */
export function freeReachable(s: State): number[] {
  const fw = s.width + 2;
  const fh = s.height + 2;
  const seen = new Uint8Array(fw * fh);
  const counted = new Uint8Array(s.cells.length);
  const free = s.palette.map(() => 0);
  const start = entryCell(s, 0);
  const queue = [start];
  seen[start] = 1;
  while (queue.length) {
    const cell = queue.pop() as number;
    const fx = cell % fw;
    const fy = (cell - fx) / fw;
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) {
      const nx = fx + dx;
      const ny = fy + dy;
      if (nx < 0 || ny < 0 || nx >= fw || ny >= fh) continue;
      const next = ny * fw + nx;
      if (seen[next]) continue;
      const square = squareOf(s, next);
      if (square < 0 || s.cells[square] === EMPTY) {
        seen[next] = 1;
        queue.push(next);
      } else if (!counted[square]) {
        counted[square] = 1;
        const colour = s.cells[square] as number;
        free[colour] = (free[colour] as number) + 1;
      }
    }
  }
  for (const b of s.buckets) if (b) free[b.colour] = (free[b.colour] as number) - (b.count - b.pickedUp);
  return free;
}

export function deal(picture: Picture, o: DealOptions): Deal {
  const rng = seededRng(o.seed);
  let s = createState(picture, [], o.buckets);
  const made: { pot: Pot; tick: number }[] = [];
  const limit = picture.cells.length * 50 + 1000;
  while (status(s) !== 'won') {
    if (s.ticks > limit) throw new Error('the generator ran out of time: a bug in the rules');
    if (s.buckets.includes(null)) {
      const free = freeReachable(s);
      const roomy = free.flatMap((n, c) => (n >= o.potMin ? [c] : []));
      const any = free.flatMap((n, c) => (n > 0 ? [c] : []));
      const choices = roomy.length ? roomy : any;
      if (choices.length) {
        const colour = choices[Math.floor(rng() * choices.length)] as number;
        const pot = { colour, count: Math.min(between(rng, o.potMin, o.potMax), free[colour] as number) };
        made.push({ pot, tick: s.ticks });
        s = pick({ ...s, columns: [[pot]] }, 0);
        continue;
      }
    }
    s = tick(s);
  }
  const columns: Pot[][] = Array.from({ length: o.columns }, () => []);
  const plan = made.map(({ pot, tick: at }) => {
    const shortest = Math.min(...columns.map((c) => c.length));
    const open = columns.flatMap((c, i) => (c.length === shortest ? [i] : []));
    const column = open[Math.floor(rng() * open.length)] as number;
    (columns[column] as Pot[]).push(pot);
    return { tick: at, column };
  });
  return { columns, plan };
}

/** Plays a plan from a fresh state and returns where it ends. */
export function replay(picture: Picture, d: Deal, buckets: number): State {
  let s = createState(picture, d.columns, buckets);
  let next = 0;
  const limit = picture.cells.length * 50 + 1000;
  while (status(s) === 'playing' && s.ticks <= limit) {
    const step = d.plan[next];
    if (step && step.tick === s.ticks) {
      s = pick(s, step.column);
      next += 1;
      continue;
    }
    s = tick(s);
  }
  return s;
}
