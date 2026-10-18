// A level's picture: a grid of palette indices, row 0 at the top, read from rows of characters
// where each character stands for one colour of the palette. A '.' is a clear square: it has no pixel
// from the start, so the page shows through it and dots walk over it as over an emptied square.

import { CLEAR, POOL } from './palette.ts';

/** The cell value of a clear square; the same value the rules give a square whose pixel is gone. */
export const CLEAR_CELL = -1;

export interface Picture {
  width: number;
  height: number;
  /** Every colour of the picture, as '#rrggbb'. */
  palette: string[];
  /** Row-major palette indices, or CLEAR_CELL, width × height of them. */
  cells: number[];
}

/** Builds a picture from rows of characters and a map from each character to its colour. */
export function parsePicture(rows: string[], colours: Record<string, string>): Picture {
  const chars = Object.keys(colours);
  const height = rows.length;
  const width = rows[0]?.length ?? 0;
  if (width < 1 || height < 1) throw new Error('a picture needs at least one row and one column');
  const cells: number[] = [];
  rows.forEach((row, y) => {
    if (row.length !== width) throw new Error(`row ${y} has ${row.length} cells, the first has ${width}`);
    for (const c of row) {
      if (c === CLEAR) {
        cells.push(CLEAR_CELL);
        continue;
      }
      const index = chars.indexOf(c);
      if (index < 0) throw new Error(`row ${y}: '${c}' is not in the palette`);
      cells.push(index);
    }
  });
  return { width, height, palette: chars.map((c) => colours[c] as string), cells };
}

/** Builds a picture written in the pool's letters; its palette is the pool colours it uses, in pool order. */
export function poolPicture(rows: string[]): Picture {
  const used = new Set(rows.join(''));
  const colours: Record<string, string> = {};
  for (const c of POOL) if (used.has(c.char)) colours[c.char] = c.hex;
  return parsePicture(rows, colours);
}
