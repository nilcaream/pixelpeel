// What a level is, and the rules that place levels on the difficulty waves. Levels go in waves of
// easy, medium, hard, with a very hard one at every tenth.
//
// Difficulty is measured on skill, not luck. A casual player (the sensible player: never a pot whose
// colour reaches nothing now) should lose the harder levels, while a player who thinks a few picks ahead
// on the pots the page shows should win them. How far ahead one must think is the level's depth. What
// a thinker gains by seeing the hidden pots too is the level's luck, and it must be next to nothing:
// the pick that decides a game is never a blind guess.

import type { Knobs } from './generator.ts';
import { CLEAR, POOL, type Overrides } from './palette.ts';
import type { Pot } from './rules.ts';

export type Band = 'easy' | 'medium' | 'hard' | 'very hard';

/** How many pots of each column the page shows, and so how many a thinker sees. */
export const VISIBLE = 3;

/** How many casual games measure a level. */
export const CASUAL_GAMES = 200;

/** How many games each thinker plays. */
export const THINKER_GAMES = 20;

/** A thinker wins a level when it wins at least this share of its games (a band may ask less). */
export const THINKER_WINS = 0.9;

/** The most a level's luck may be: what seeing the hidden pots adds to the best thinker's share. */
export const MAX_LUCK = 0.05;

/**
 * The first seed of the hold-out games: a deal chosen on casual games 1–200 and thinker games 1–20 is judged
 * again on casual games 201–400 and thinker games 21–40, which played no part in choosing it.
 */
export const HOLDOUT_CASUAL = CASUAL_GAMES + 1;
export const HOLDOUT_THINKER = THINKER_GAMES + 1;

/** Levels 1 to this were baked before the hold-out games and the margin, and stay as they were baked. */
export const BAKED_WITHOUT_HOLDOUT = 90;

/**
 * The most any careless player may win of a level, by band, over CASUAL_GAMES games each: the random player, the
 * sensible one (the casual share) and the sticky one. None on easy. Each cap sits just under the next easier
 * band's lower quartile of the same measure over levels 1–90 (easy .57, medium .22); very hard's is its casual
 * top plus about one standard error. A level a careless player wins more often looks harder than it plays.
 */
export const CARELESS_CAP: Partial<Record<Band, number>> = { medium: 0.5, hard: 0.2, 'very hard': 0.06 };

/** The first seed of the random player's games in the careless measure. */
export const RANDOM_FIRST = 1_000_001;

/**
 * The least share of the picture peeled, medium and harder, at the point where no line can lose any more: the
 * median over the sensible player's won games, and on the winning order. A level decided earlier is solved half way.
 */
export const DECIDED_FLOOR = 0.6;

/** Levels 1 to this were baked before the careless cap and the decided floor, and stay as they were baked. */
export const BAKED_WITHOUT_GATES = 90;

/**
 * The careless players' wins, of CASUAL_GAMES each, and the decided points. A decided point is the latest the
 * solver proved within its budget, so it is never earlier than the true one. Easy levels have no decided points
 * (null), and `decided` is null too where the sensible player won none.
 */
export interface Gates {
  randomWins: number;
  stickyWins: number;
  decided: number | null;
  decidedLine: number | null;
}

/**
 * Whether the random player beats the sensible one by more than two standard errors of the difference, over
 * CASUAL_GAMES games each: the casual share then misreads the level. Reported, never a gate.
 */
export function gaugeMisreads(randomWins: number, casualWins: number): boolean {
  const u = randomWins / CASUAL_GAMES;
  const s = casualWins / CASUAL_GAMES;
  return u - s > 2 * Math.sqrt((u * (1 - u) + s * (1 - s)) / CASUAL_GAMES);
}

/** Which gate a level's measures fail, or 'in': the careless cap first, then the decided floor. */
export function passesGates(band: Band, casualWins: number, g: Gates): 'in' | 'careless' | 'decided' {
  const cap = CARELESS_CAP[band];
  if (cap !== undefined && Math.max(g.randomWins, casualWins, g.stickyWins) / CASUAL_GAMES > cap) return 'careless';
  const early = (x: number | null) => x !== null && x < DECIDED_FLOOR;
  if (band !== 'easy' && (early(g.decided) || early(g.decidedLine))) return 'decided';
  return 'in';
}

/**
 * One standard error of a casual share at an edge of a casual range, over CASUAL_GAMES games (0.012 at 0.03,
 * 0.028 at 0.2, 0.035 at 0.5); 0 at an edge of 0.
 */
export function margin(edge: number): number {
  return Math.sqrt((edge * (1 - edge)) / CASUAL_GAMES);
}

/**
 * A band's casual range with its edges moved inside: the bottom by one margin, the top by two. The top gets more,
 * since a level too easy for its band is the worse miss, and the casual share a bake chooses a deal on runs low:
 * levels 60–90 won 3 games of 200 more on the hold-out games than on the bake's, with a spread of 7.
 */
export function innerCasual(rule: BandRule): [number, number] {
  const [lo, hi] = rule.casual;
  return [lo + margin(lo), hi - 2 * margin(hi)];
}

export interface BandRule {
  /** The casual share of games won, from (inclusive) and to (exclusive). */
  casual: readonly [number, number];
  /** The depth a thinker needs to win, at least and at most. */
  depth: readonly [number, number];
  /** The most the thinkers of depth 1, 2, … may win, so the level is not won by thinking less. */
  shallow: readonly number[];
  /** The share a thinker must win, when not THINKER_WINS. */
  wins?: number;
}

/**
 * The bands of each block of ten levels; a level past the last block takes the last. Each block is a
 * step harder than the one before: less casual luck, and a deeper thinker needed.
 *
 * Block 1: easy stops at 0.98, so no level is won by every casual game. A depth of 1 means looking at
 * what the next pick does; 3 means planning three picks. Very hard asks its depth-3 thinker for 0.85,
 * not 0.9: deals that hard are rare, and the nearest one found was a depth-3 thinker at 0.85.
 *
 * Block 2: every casual range moves down by 0.15 to 0.3; medium needs a depth-2 thinker, hard may
 * need depth 3, and the thinkers one step shallower are held lower.
 *
 * Block 3: casual ranges down by another 0.1, and every shallow cap lower (hard holds depth 1 to 0.3,
 * very hard holds depth 1 and 2 to 0.15 and 0.25). Very hard may be won at depth 3 or 4: on these pictures
 * a deal where depth 2 is held under 0.5 and depth 3 still loses is a cliff, not a band, so demanding depth
 * 3 for hard and 4 for very hard found no deal at all (levels 29, 30, 33, 36, 39, 40 on the first bake).
 *
 * Block 4: casual ranges down by another 0.1 (easy from 0.4, hard under 0.2, very hard under 0.06);
 * medium may need depth 3, and every shallow cap is lower again.
 *
 * Blocks 5 and 6 (levels 41–60) share one set of bands: casual ranges down by about 0.1 again (easy from
 * 0.3, medium under 0.35, hard under 0.12, very hard under 0.04), and the shallow caps lower once more.
 *
 * Blocks 7 to 9 (levels 61–90): casual ranges down by about 0.05 a block (easy from 0.25, 0.2, 0.15) and the
 * shallow caps of medium and hard lower each block. Very hard stops shrinking where its pictures already are:
 * every very hard deal of levels 60–90 has casual at most 0.03, depth 1 at 0 and depth 2 at most 0.05, so
 * block 7 keeps the very hard of levels 41–60 and block 9 keeps block 8's.
 */
const FORTY_ONE_TO_SIXTY: Record<Band, BandRule> = {
  easy: { casual: [0.3, 0.55], depth: [1, 1], shallow: [] },
  medium: { casual: [0.12, 0.35], depth: [2, 3], shallow: [0.4] },
  hard: { casual: [0, 0.12], depth: [2, 3], shallow: [0.2] },
  'very hard': { casual: [0, 0.04], depth: [3, 4], shallow: [0.1, 0.15], wins: 0.85 },
};

export const BLOCKS: readonly Record<Band, BandRule>[] = [
  {
    easy: { casual: [0.8, 0.981], depth: [1, 1], shallow: [] },
    medium: { casual: [0.5, 0.8], depth: [1, 2], shallow: [] },
    hard: { casual: [0, 0.5], depth: [2, 2], shallow: [0.6] },
    'very hard': { casual: [0, 0.2], depth: [3, 3], shallow: [0.4, 0.6], wins: 0.85 },
  },
  {
    easy: { casual: [0.65, 0.85], depth: [1, 1], shallow: [] },
    medium: { casual: [0.35, 0.65], depth: [2, 2], shallow: [0.7] },
    hard: { casual: [0, 0.3], depth: [2, 3], shallow: [0.4] },
    'very hard': { casual: [0, 0.1], depth: [4, 4], shallow: [0.2, 0.3, 0.5], wins: 0.85 },
  },
  {
    easy: { casual: [0.5, 0.75], depth: [1, 1], shallow: [] },
    medium: { casual: [0.25, 0.55], depth: [2, 2], shallow: [0.6] },
    hard: { casual: [0, 0.25], depth: [2, 3], shallow: [0.3] },
    'very hard': { casual: [0, 0.08], depth: [3, 4], shallow: [0.15, 0.25], wins: 0.85 },
  },
  {
    easy: { casual: [0.4, 0.65], depth: [1, 1], shallow: [] },
    medium: { casual: [0.2, 0.45], depth: [2, 3], shallow: [0.5] },
    hard: { casual: [0, 0.2], depth: [2, 3], shallow: [0.25] },
    'very hard': { casual: [0, 0.06], depth: [3, 4], shallow: [0.1, 0.2], wins: 0.85 },
  },
  FORTY_ONE_TO_SIXTY,
  FORTY_ONE_TO_SIXTY,
  {
    easy: { casual: [0.25, 0.5], depth: [1, 1], shallow: [] },
    medium: { casual: [0.1, 0.3], depth: [2, 3], shallow: [0.35] },
    hard: { casual: [0, 0.1], depth: [2, 3], shallow: [0.15] },
    'very hard': { casual: [0, 0.04], depth: [3, 4], shallow: [0.1, 0.15], wins: 0.85 },
  },
  {
    easy: { casual: [0.2, 0.45], depth: [1, 1], shallow: [] },
    medium: { casual: [0.08, 0.25], depth: [2, 3], shallow: [0.3] },
    hard: { casual: [0, 0.08], depth: [2, 3], shallow: [0.1] },
    'very hard': { casual: [0, 0.03], depth: [3, 4], shallow: [0.05, 0.1], wins: 0.85 },
  },
  {
    easy: { casual: [0.15, 0.4], depth: [1, 1], shallow: [] },
    medium: { casual: [0.06, 0.2], depth: [2, 3], shallow: [0.25] },
    hard: { casual: [0, 0.06], depth: [2, 3], shallow: [0.05] },
    'very hard': { casual: [0, 0.03], depth: [3, 4], shallow: [0.05, 0.1], wins: 0.85 },
  },
];

/** The wave a level number sits on: easy, medium, hard, repeating, and very hard at every tenth. */
export function bandFor(level: number): Band {
  if (level % 10 === 0) return 'very hard';
  return (['easy', 'medium', 'hard'] as const)[((level % 10) - 1) % 3] as Band;
}

/** The rule of a level's band, in its block. */
export function ruleFor(level: number): BandRule {
  const block = BLOCKS[Math.min(Math.floor((level - 1) / 10), BLOCKS.length - 1)] as Record<Band, BandRule>;
  return block[bandFor(level)];
}

/** Whether a casual share is below, in or above a band. */
export function casualFit(rule: BandRule, share: number): 'harder' | 'in' | 'easier' {
  const [lo, hi] = rule.casual;
  return share < lo ? 'harder' : share >= hi ? 'easier' : 'in';
}

/**
 * What the thinkers' shares, depth 1 first, say about a deal for a band: 'easier' when a shallower
 * thinker wins too often, 'harder' when the deepest allowed thinker still loses, otherwise the depth
 * needed: the first depth whose thinker wins.
 */
export function thinkerFit(rule: BandRule, shares: readonly number[]): 'harder' | 'easier' | number {
  for (let d = 1; d <= shares.length; d++) {
    const share = shares[d - 1] as number;
    const cap = rule.shallow[d - 1];
    if (cap !== undefined && share > cap) return 'easier';
    if (share >= (rule.wins ?? THINKER_WINS)) return d < rule.depth[0] ? 'easier' : d;
  }
  return 'harder';
}

export interface Structure {
  columns: number;
  buckets: number;
  potMin: number;
  potMax: number;
}

/** A level, made from a scene. */
export interface Level {
  number: number;
  band: Band;
  /** A digest of the picture and the deal: a saved game for another digest is not this level. */
  id: string;
  /** The scene's title; the scene is SCENES[number − 1]. */
  title: string;
  /** The seed that placed the scene's scattered pixels. */
  sceneSeed: number;
  /** The picture in pool letters. */
  rows: string[];
  structure: Structure;
  /** The pots per column, the top one first; a pot's colour indexes the picture's palette. */
  columns: Pot[][];
  /** The seed of the pots' making and perturbing, how hard they were perturbed, and the knobs that makes. */
  seed: number;
  strength: number;
  knobs: Knobs;
  /** Casual games won, of CASUAL_GAMES. */
  casualWins: number;
  /** Each thinker's share on the visible pots, depth 1 first, up to the depth needed. */
  thinkers: number[];
  depth: number;
  /** The share of a thinker of that depth that sees every pot. */
  fullSight: number;
  luck: number;
  /**
   * The same measures on the hold-out games: casual games won of CASUAL_GAMES, and each thinker's share. Every
   * level after BAKED_WITHOUT_HOLDOUT has them.
   */
  holdout?: Holdout;
  /** What the careless cap and the decided floor measured. Every level after BAKED_WITHOUT_GATES that fits has them. */
  gates?: Gates;
  /**
   * Set when no deal fitted the band and this is the closest one found: which bound it misses and by how
   * much. An outlier now and then is accepted; the level still has a winning order and a luck of at most MAX_LUCK.
   */
  misses?: string;
  /** The scene's overrides, set only on a level that has some: how it is painted, never how it is dealt or played. */
  overrides?: Overrides;
}

export interface Holdout {
  casualWins: number;
  thinkers: number[];
}

/**
 * Whether a level's measures keep it in its band: its casual share inside the band's inner range, and its
 * hold-out games in the band at a depth the band allows. Says which way it is off when not.
 */
export function holdsBand(l: Pick<Level, 'number' | 'casualWins' | 'thinkers'> & { holdout: Holdout }): 'in' | 'easier' | 'harder' {
  const rule = ruleFor(l.number);
  const inner = casualFit({ ...rule, casual: innerCasual(rule) }, l.casualWins / CASUAL_GAMES);
  if (inner !== 'in') return inner;
  const casual = casualFit(rule, l.holdout.casualWins / CASUAL_GAMES);
  if (casual !== 'in') return casual;
  const depth = thinkerFit(rule, l.holdout.thinkers);
  return typeof depth === 'number' ? 'in' : depth;
}

/** The pool letters a picture's rows use, in pool order: letter i is colour i of the picture. */
function lettersOf(rows: readonly string[]): string[] {
  return POOL.map((c) => c.char).filter((ch) => rows.some((r) => r.includes(ch)));
}

/**
 * The letter each letter of `from` becomes in `to`, when `to` is `from` square for square with its letters
 * swapped one for one; null when the squares differ in any other way.
 */
export function letterMap(from: readonly string[], to: readonly string[]): Record<string, string> | null {
  if (from.length !== to.length) return null;
  const map: Record<string, string> = {};
  const back: Record<string, string> = {};
  for (let y = 0; y < from.length; y++) {
    const a = from[y] as string;
    const b = to[y] as string;
    if (a.length !== b.length) return null;
    for (let x = 0; x < a.length; x++) {
      const p = a[x] as string;
      const q = b[x] as string;
      if ((p === CLEAR) !== (q === CLEAR) || (map[p] ?? q) !== q || (back[q] ?? p) !== p) return null;
      map[p] = q;
      back[q] = p;
    }
  }
  return map;
}

/**
 * A level drawn in other letters: the same squares, the same pots and the same game, each pot's colour
 * renumbered to its letter's number in the new rows. The measures stay, since no player sees a colour's
 * number. Throws when the new rows are not the level's rows with letters swapped one for one.
 */
export function relabel(level: Level, rows: string[]): Level {
  const map = letterMap(level.rows, rows);
  if (!map) throw new Error(`level ${level.number}: the new rows are not its rows in other letters`);
  const before = lettersOf(level.rows);
  const after = lettersOf(rows);
  const columns = level.columns.map((c) => c.map((p) => ({ ...p, colour: after.indexOf(map[before[p.colour] as string] as string) })));
  return { ...level, id: levelId(rows, columns, level.structure.buckets), rows, columns };
}

/** FNV-1a over the picture, the deal and the buckets, as 8 hex digits. */
export function levelId(rows: string[], columns: Pot[][], buckets: number): string {
  const text = JSON.stringify([rows, columns, buckets]);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}
