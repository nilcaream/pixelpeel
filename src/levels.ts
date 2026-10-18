// What a level is, and the rules that place levels on the difficulty waves. Levels go in waves of
// easy, medium, hard, with a very hard one at every tenth.
//
// Difficulty is measured on skill, not luck. A casual player (the sensible player: never a pot whose
// colour reaches nothing now) should lose the harder levels, while a player who thinks a few picks ahead
// on the pots the page shows should win them. How far ahead one must think is the level's depth. What
// a thinker gains by seeing the hidden pots too is the level's luck, and it must be next to nothing:
// the pick that decides a game is never a blind guess.

import type { Knobs } from './generator.ts';
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
 * Block 5: casual ranges down by about 0.1 again (easy from 0.3, medium under 0.35, hard under 0.12,
 * very hard under 0.04), and the shallow caps lower once more.
 */
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
  {
    easy: { casual: [0.3, 0.55], depth: [1, 1], shallow: [] },
    medium: { casual: [0.12, 0.35], depth: [2, 3], shallow: [0.4] },
    hard: { casual: [0, 0.12], depth: [2, 3], shallow: [0.2] },
    'very hard': { casual: [0, 0.04], depth: [3, 4], shallow: [0.1, 0.15], wins: 0.85 },
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
  /** A game that wins this level: the column of each pick, in turn. */
  winningOrder: number[];
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
   * Set when no deal fitted the band and this is the closest one found: which bound it misses and by how
   * much. An outlier now and then is accepted; the level still has a winning order and a luck of at most MAX_LUCK.
   */
  misses?: string;
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
