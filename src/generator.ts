// Deals a level's pots and measures how forgiving the deal is.
//
// The generator plays the real rules forward: whenever a bucket is free, it makes the next pot from a
// colour that has pixels which are reachable now and not yet owed to a pot in a bucket, never bigger
// than that count. Pixels of a colour leave the picture only through pots of that colour, and the
// reachable pixels only grow, so no bucket can wait for ever. Dealt in that order to the bottoms of the
// columns, each pot has only earlier pots above it, and the plan (which column at which tick) replays
// the same game.
//
// Such a deal is almost never lost, so a level is made harder by perturbing it: pots may surface
// earlier than their turn (a pot whose colour is still shut in holds its bucket until the colour is
// reached), and pots of one colour may be merged into one big pot. A perturbed deal has no plan any
// more; whether it can still be won, and how often, is measured by random play.

import { createState, entryCell, pick, squareOf, status, tick, EMPTY, type Pot, type State } from './engine.ts';
import type { Picture } from './picture.ts';
import { between, seededRng, type Rng } from './rng.ts';

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

/** The pots of a winning game in the order they were made, each with the tick it was picked at. */
export function makePots(picture: Picture, o: DealOptions, rng: Rng = seededRng(o.seed)): { pot: Pot; tick: number }[] {
  let s = createState(picture, [], o.buckets);
  const made: { pot: Pot; tick: number }[] = [];
  const limit = tickLimit(picture);
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
  return made;
}

export function deal(picture: Picture, o: DealOptions): Deal {
  const rng = seededRng(o.seed);
  const made = makePots(picture, o, rng);
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

export interface Knobs {
  /** How many places, at most, a pot may surface before its turn: 0 keeps the order it was made in. */
  spread: number;
  /**
   * How much the order is turned round: 0 keeps it, 1 leaves no trace of it, 2 reverses it, so pots
   * whose colours are shut in deepest come first.
   */
  reverse: number;
  /** The chance that a pot is merged with the next pot of its colour into one bigger pot. */
  merge: number;
}

/**
 * Deals pots made in a winning order into columns, perturbed by the knobs: first same-colour pots are
 * merged, then each pot gets the key ((1 − reverse) × its place + rng × spread), and the pots are dealt
 * in key order to the bottom of the shortest column (the leftmost of the shortest on a tie).
 */
export function perturb(pots: Pot[], columns: number, knobs: Knobs, rng: Rng): Pot[][] {
  const merged = pots.map((p) => ({ ...p }));
  for (let i = 0; i < merged.length; i++) {
    const here = merged[i] as Pot;
    const j = merged.findIndex((p, k) => k > i && p.colour === here.colour);
    if (j > 0 && rng() < knobs.merge) {
      here.count += (merged[j] as Pot).count;
      merged.splice(j, 1);
      i -= 1;
    }
  }
  const keyed = merged
    .map((pot, i) => ({ pot, key: (1 - knobs.reverse) * i + rng() * knobs.spread }))
    .sort((a, b) => a.key - b.key);
  const out: Pot[][] = Array.from({ length: columns }, () => []);
  for (const { pot } of keyed) {
    const shortest = Math.min(...out.map((c) => c.length));
    (out[out.findIndex((c) => c.length === shortest)] as Pot[]).push(pot);
  }
  return out;
}

function tickLimit(picture: Picture): number {
  return picture.cells.length * 50 + 1000;
}

/**
 * One game by a random player: whenever a bucket is free it picks a column at random among those with
 * pots left, at once. Returns whether it won and the picks it made.
 */
export function playRandom(picture: Picture, columns: Pot[][], buckets: number, seed: number): { won: boolean; picks: PlannedPick[] } {
  const rng = seededRng(seed);
  let s = createState(picture, columns, buckets);
  const picks: PlannedPick[] = [];
  const limit = tickLimit(picture);
  while (status(s) === 'playing' && s.ticks <= limit) {
    if (s.buckets.includes(null)) {
      const open = s.columns.flatMap((c, i) => (c.length ? [i] : []));
      if (open.length) {
        const column = open[Math.floor(rng() * open.length)] as number;
        picks.push({ tick: s.ticks, column });
        s = pick(s, column);
        continue;
      }
    }
    s = tick(s);
  }
  return { won: status(s) === 'won', picks };
}

/** Plays a plan from a fresh state and returns where it ends. */
export function replay(picture: Picture, d: Deal, buckets: number): State {
  let s = createState(picture, d.columns, buckets);
  let next = 0;
  const limit = tickLimit(picture);
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

/** Plays the picks at their ticks and stops right after the last one: where a saved game resumes. */
export function resume(picture: Picture, columns: Pot[][], buckets: number, picks: PlannedPick[]): State {
  let s = createState(picture, columns, buckets);
  for (const p of picks) {
    while (s.ticks < p.tick && status(s) === 'playing') s = tick(s);
    if (s.ticks !== p.tick) break;
    s = pick(s, p.column);
  }
  return s;
}

export interface Measure {
  playouts: number;
  /** The games played before the measure stopped: all of them unless it gave up early. */
  played: number;
  wins: number;
  /** The first winning game's picks, which prove the level can be won. */
  winning: PlannedPick[] | null;
}

/**
 * Plays `playouts` random games, seeds 1 to playouts. With a band [lo, hi), it gives up as soon as the
 * share of wins can no longer end inside it and says which side it fell out on; the share it would
 * have measured is exact either way, since every seed is fixed.
 */
export function measure(
  picture: Picture,
  columns: Pot[][],
  buckets: number,
  playouts: number,
  band?: readonly [number, number],
): Measure & { outside?: 'easier' | 'harder' } {
  let wins = 0;
  let winning: PlannedPick[] | null = null;
  for (let seed = 1; seed <= playouts; seed++) {
    const game = playRandom(picture, columns, buckets, seed);
    if (game.won) {
      wins += 1;
      winning ??= game.picks;
    }
    if (band) {
      const left = playouts - seed;
      if ((wins + left) / playouts < band[0]) return { playouts, played: seed, wins, winning, outside: 'harder' };
      if (wins / playouts >= band[1] && band[1] < 1) return { playouts, played: seed, wins, winning, outside: 'easier' };
    }
  }
  return { playouts, played: playouts, wins, winning };
}
