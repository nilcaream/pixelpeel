// What the design tools share: picture numbers, the output directory, the deal records and a PNG writer.
//
// Pictures are numbered as levels: 1 to SCENES.length are the levels' scenes, and the pictures of PORTFOLIO,
// which are drawn but not yet levels, follow from SCENES.length + 1 in their order there.

import { mkdirSync, readFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { PORTFOLIO } from '../../src/portfolio.ts';
import { SCENES, type Scene } from '../../src/scenes.ts';

/** Where the design tools write: git-ignored, at the repository root. */
export const OUT_DIR = 'out';

/** OUT_DIR, or a directory under it, made if it is not there yet. */
export function outDir(name = ''): string {
  const dir = name ? `${OUT_DIR}/${name}` : OUT_DIR;
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** The number of PORTFOLIO's first picture. */
export const FIRST_PORTFOLIO = SCENES.length + 1;

/** Every picture by its number: the levels' scenes, then the portfolio. */
export function pictureAt(n: number): Scene {
  const scene = n < FIRST_PORTFOLIO ? SCENES[n - 1] : PORTFOLIO[n - FIRST_PORTFOLIO];
  if (!scene) throw new Error(`no picture ${n}: there are ${SCENES.length} levels and ${PORTFOLIO.length} portfolio pictures`);
  return scene;
}

/** The number of the picture with this title. */
export function numberOf(title: string): number | undefined {
  const i = [...SCENES, ...PORTFOLIO].findIndex((s) => s.title === title);
  return i < 0 ? undefined : i + 1;
}

/** Each row read right to left: the picture mirrored, which plays as a picture of its own. */
export function mirrored(rows: readonly string[]): string[] {
  return rows.map((r) => [...r].reverse().join(''));
}

/** One measured deal of a picture, one line of a deal file (`npm run design:deals`). */
export interface Deal {
  /** The picture's number; with `mirror`, the level whose scene was mirrored. */
  n: number;
  mirror?: boolean;
  title?: string;
  buckets: number;
  strength: number;
  deal: number;
  sceneSeed: number;
  seed: number;
  columns: number;
  potMin: number;
  potMax: number;
  pots: number;
  /** Share of the casual (sensible) games won. */
  casual: number;
  /** Mean share of the picture peeled before the first pick where a top pot can reach nothing. */
  freeStart: number;
  /** Mean longest run of such no-choice picks, as a share of the game's picks. */
  freeRun: number;
  /** Mean share peeled when a lost game got stuck; null when none was lost. */
  lossAt: number | null;
  /** Each visible thinker's share, depth 1 first; empty when skipped. */
  thinkers: number[];
  skipped?: boolean;
  depth?: number;
  solved?: 'win' | 'lose' | 'unknown';
  full?: number;
  luck?: number;
}

/** The deals of several deal files, in order. */
export function readDeals(files: readonly string[]): Deal[] {
  return files.flatMap((f) =>
    readFileSync(f, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => JSON.parse(l) as Deal),
  );
}

/** A deal's picture as a key: `N`, or `Nm` for the mirrored scene of level N. */
export const keyOf = (d: Pick<Deal, 'n' | 'mirror'>): string => (d.mirror ? `${d.n}m` : `${d.n}`);

/** An RGB image as a PNG file's bytes. */
export function png(width: number, height: number, rgb: Uint8Array): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgb.subarray(y * width * 3, (y + 1) * width * 3)).copy(raw, y * (width * 3 + 1) + 1);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([signature, chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

/** A hex colour as its three channels. */
export function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
