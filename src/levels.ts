// What a level is, and the rules that place levels on the difficulty waves. Levels go in waves of
// easy, medium, hard, with a very hard one at every tenth; every ten levels, one part of the structure
// grows (the picture's size, then its colours, then the columns), so a level is harder than the level
// with the same band ten earlier. Difficulty is measured: the share of sensible pick orders that win.

import type { Knobs, Player } from './generator.ts';
import type { Pot } from './rules.ts';

export type Band = 'easy' | 'medium' | 'hard' | 'very hard';

/**
 * The share of games won, from (inclusive) and to (exclusive). Easy reaches up to the cap of its
 * block of ten, so no level is won by every game.
 */
const BANDS: Record<Band, readonly [number, number]> = {
  easy: [0.8, 1],
  medium: [0.6, 0.8],
  hard: [0.2, 0.6],
  'very hard': [0.02, 0.2],
};

/** The most a level's share may be, per block of ten: every block must be lost a little more often. */
const CAPS: readonly number[] = [0.98, 0.96, 0.94, 0.92];

export function capFor(level: number): number {
  return CAPS[Math.min(Math.floor((level - 1) / 10), CAPS.length - 1)] as number;
}

export function bandRange(level: number, band: Band): readonly [number, number] {
  const [lo, hi] = BANDS[band];
  return [lo, Math.min(hi, capFor(level))];
}

/** How many games measure a level. */
export const PLAYOUTS = 200;

/** Who plays the games that measure a level. */
export const GAUGE: Player = 'sensible';

export function bandOf(share: number, level: number): Band | null {
  for (const band of Object.keys(BANDS) as Band[]) {
    const [lo, hi] = bandRange(level, band);
    if (share >= lo && share < hi) return band;
  }
  return null;
}

/** The wave a level number sits on: easy, medium, hard, repeating, and very hard at every tenth. */
export function bandFor(level: number): Band {
  if (level % 10 === 0) return 'very hard';
  return (['easy', 'medium', 'hard'] as const)[((level % 10) - 1) % 3] as Band;
}

export interface Structure {
  /** The longer side of the picture, in squares. */
  size: number;
  colours: number;
  columns: number;
  buckets: number;
  potMin: number;
  potMax: number;
}

/** The structure of each block of ten levels; past the last block, the last one holds. */
export const STRUCTURE: readonly Structure[] = [
  { size: 20, colours: 4, columns: 3, buckets: 4, potMin: 10, potMax: 30 },
  { size: 24, colours: 4, columns: 3, buckets: 4, potMin: 10, potMax: 30 },
  { size: 24, colours: 5, columns: 3, buckets: 4, potMin: 10, potMax: 30 },
];

export function structureFor(level: number): Structure {
  return STRUCTURE[Math.min(Math.floor((level - 1) / 10), STRUCTURE.length - 1)] as Structure;
}

/** Where a picture came from, kept with every level made from it. */
export interface Source {
  title: string;
  /** The source image in the repo. */
  file: string;
  author: string;
  licence: string;
  licenceUrl: string;
  /** The page the image was taken from. */
  page: string;
}

export interface Level {
  number: number;
  band: Band;
  /** A digest of the picture and the deal: a saved game for another digest is not this level. */
  id: string;
  source: Source;
  /** The picture in pool letters; '.' is a clear square. */
  rows: string[];
  /** 'clear', or the pool colour name the background was filled with. */
  background: string;
  structure: Structure;
  /** The pots per column, the top one first; a pot's colour indexes the picture's palette. */
  columns: Pot[][];
  /** The seed of the pots' making and perturbing, and how hard they were perturbed. */
  seed: number;
  knobs: Knobs;
  playouts: number;
  wins: number;
  winShare: number;
  /** A game that wins this level: the column of each pick, in turn. */
  winningOrder: number[];
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
