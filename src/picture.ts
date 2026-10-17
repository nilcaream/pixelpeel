// A level's picture: a grid of palette indices, row 0 at the top, read from rows of characters
// where each character stands for one colour of the palette.

export interface Picture {
  width: number;
  height: number;
  /** Every colour of the picture, as '#rrggbb'. */
  palette: string[];
  /** Row-major palette indices, width × height of them. */
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
      const index = chars.indexOf(c);
      if (index < 0) throw new Error(`row ${y}: '${c}' is not in the palette`);
      cells.push(index);
    }
  });
  return { width, height, palette: chars.map((c) => colours[c] as string), cells };
}
