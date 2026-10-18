// What a level is, and the rules that place levels on the difficulty waves. Levels go in waves of
// easy, medium, hard, with a very hard one at every tenth; every ten levels, one part of the structure
// grows (the picture's size, then its colours, then the columns), so a level is harder than the level
// with the same band ten earlier. Difficulty is measured: the share of random pick orders that win.

import type { Knobs, Player } from './generator.ts';
import type { Pot } from './rules.ts';

export type Band = 'easy' | 'medium' | 'hard' | 'very hard';

/** The share of random games won, from (inclusive) and to (exclusive; easy includes 1). */
export const BANDS: Record<Band, readonly [number, number]> = {
  easy: [0.9, 1],
  medium: [0.65, 0.9],
  hard: [0.35, 0.65],
  'very hard': [0.1, 0.35],
};

/** How many games measure a level. */
export const PLAYOUTS = 200;

/** Who plays the games that measure a level. */
export const GAUGE: Player = 'random';

export function bandOf(share: number): Band | null {
  for (const [band, [lo, hi]] of Object.entries(BANDS) as [Band, readonly [number, number]][])
    if (share >= lo && (share < hi || (hi === 1 && share === 1))) return band;
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
