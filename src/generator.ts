// Deals a level's pots and measures how forgiving the deal is, on the rules' logical model.
//
// The generator plays the rules forward: it makes the next pot from a colour that has pixels reachable
// now, never bigger than that count, so every pot lifts all its pixels the moment it is picked. Pixels
// of a colour leave the picture only through pots of that colour, and the reachable pixels only grow,
// so the picture always empties. Dealt in that order to the bottoms of the columns, each pot has only
// earlier pots above it, and the plan (which column, in turn) replays the same game.
//
// Such a deal is almost never lost, so a level is made harder by perturbing it: pots may surface
// earlier than their turn (a pot whose colour is still shut in holds its bucket until the colour is
// reached), and pots of one colour may be merged into one big pot. A perturbed deal has no plan any
// more; whether it can still be won, and how often, is measured by playing it.

import type { Picture } from './picture.ts';
import { between, seededRng, type Rng } from './rng.ts';
import { createBoard, pick, reachable, status, type Board, type Pot } from './rules.ts';

export interface DealOptions {
  buckets: number;
  columns: number;
  seed: number;
  potMin: number;
  potMax: number;
}

export interface Deal {
  columns: Pot[][];
  /** A winning game: the column of each pick, in turn. */
  plan: number[];
}

/** The pots of a winning game in the order they were made. */
export function makePots(picture: Picture, o: DealOptions, rng: Rng = seededRng(o.seed)): Pot[] {
  let b = createBoard(picture, [], o.buckets);
  const made: Pot[] = [];
  while (status(b) !== 'won') {
    const free = reachable(b);
    const roomy = free.flatMap((n, c) => (n >= o.potMin ? [c] : []));
    const any = free.flatMap((n, c) => (n > 0 ? [c] : []));
    const choices = roomy.length ? roomy : any;
    if (!choices.length) throw new Error('the generator found nothing reachable: a bug in the rules');
    const colour = choices[Math.floor(rng() * choices.length)] as number;
    const pot = { colour, count: Math.min(between(rng, o.potMin, o.potMax), free[colour] as number) };
    made.push(pot);
    b = (pick({ ...b, columns: [[pot]] }, 0) as { board: Board }).board;
  }
  return made;
}

export function deal(picture: Picture, o: DealOptions): Deal {
  const rng = seededRng(o.seed);
  const made = makePots(picture, o, rng);
  const columns: Pot[][] = Array.from({ length: o.columns }, () => []);
  const plan = made.map((pot) => {
    const shortest = Math.min(...columns.map((c) => c.length));
    const open = columns.flatMap((c, i) => (c.length === shortest ? [i] : []));
    const column = open[Math.floor(rng() * open.length)] as number;
    (columns[column] as Pot[]).push(pot);
    return column;
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

/**
 * Who plays a measured game. Random picks any column with pots. Sensible plays by the common-sense rule
 * a careful player keeps: never pick a pot whose colour cannot reach a pixel now; only when every top pot is
 * shut in does it pick one of them at random.
 */
export type Player = 'random' | 'sensible';

/** One game by a player whose choices come from the seed. Returns whether it won and its picks. */
export function play(picture: Picture, columns: Pot[][], buckets: number, seed: number, player: Player): { won: boolean; picks: number[] } {
  const rng = seededRng(seed);
  let b = createBoard(picture, columns, buckets);
  const picks: number[] = [];
  while (status(b) === 'playing') {
    let open = b.columns.flatMap((c, i) => (c.length ? [i] : []));
    if (player === 'sensible') {
      const free = reachable(b);
      const sensible = open.filter((i) => (free[(b.columns[i] as Pot[])[0]?.colour as number] as number) > 0);
      if (sensible.length) open = sensible;
    }
    const column = open[Math.floor(rng() * open.length)] as number;
    picks.push(column);
    b = (pick(b, column) as { board: Board }).board;
  }
  return { won: status(b) === 'won', picks };
}

/** Plays picks in turn from a fresh board, skipping none, and returns where they leave it. */
export function replay(picture: Picture, columns: Pot[][], buckets: number, picks: number[]): Board {
  let b = createBoard(picture, columns, buckets);
  for (const column of picks) {
    const next = pick(b, column);
    if (!next) break;
    b = next.board;
  }
  return b;
}

export interface Measure {
  playouts: number;
  /** The games played before the measure stopped: all of them unless it gave up early. */
  played: number;
  wins: number;
  /** The first winning game's picks, which prove the level can be won. */
  winning: number[] | null;
}

/**
 * Plays `playouts` games, seeds `first` to first + playouts − 1. With a band [lo, hi), it gives up as soon
 * as the share of wins can no longer end inside it and says which side it fell out on; the share it would
 * have measured is exact either way, since every seed is fixed.
 */
export function measure(
  picture: Picture,
  columns: Pot[][],
  buckets: number,
  playouts: number,
  player: Player,
  band?: readonly [number, number],
  first = 1,
): Measure & { outside?: 'easier' | 'harder' } {
  let wins = 0;
  let winning: number[] | null = null;
  for (let played = 1; played <= playouts; played++) {
    const game = play(picture, columns, buckets, first + played - 1, player);
    if (game.won) {
      wins += 1;
      winning ??= game.picks;
    }
    if (band) {
      const left = playouts - played;
      if ((wins + left) / playouts < band[0]) return { playouts, played, wins, winning, outside: 'harder' };
      if (wins / playouts >= band[1]) return { playouts, played, wins, winning, outside: 'easier' };
    }
  }
  return { playouts, played: playouts, wins, winning };
}
