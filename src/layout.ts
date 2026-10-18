// Where everything goes on the page. Portrait first: one tall column (picture, buckets, pots) that fits
// between the header and the footer, and is centred there on a wide or a tall screen.

/** The height kept free at the top for the menu button and the level's three lines (--header-h in src/style.css). */
export const HEADER_HEIGHT = 88;

/** The level's name is in the pixel font, whose letters are all 1 em wide, at 12 px or as wide as the page allows. */
const NAME_SIZE = 12;

/** The page's side gutter round the level's name (#hud's padding in src/style.css). */
const NAME_GUTTER = 16;

/** The level name's font size in whole pixels, so a name of `chars` letters fits a page `width` wide. */
export function nameFontSize(width: number, chars: number): number {
  return Math.max(0, Math.min(NAME_SIZE, Math.floor((width - 2 * NAME_GUTTER) / Math.max(1, chars))));
}

/** The height kept free at the bottom for the name of the game (--footer-h in src/style.css). */
export const FOOTER_HEIGHT = 52;

export interface Layout {
  left: number;
  top: number;
  cell: number;
  bucketY: number;
  bucketSize: number;
  columnsY: number;
  columnWidth: number;
  potSize: number;
  potGap: number;
  inner: number;
}

export interface Shape {
  /** The picture's size in squares. */
  width: number;
  height: number;
  buckets: number;
  columns: number;
  /** How many pots of a column are shown. */
  visible: number;
}

/** The layout for a window of this size; a window too small to hold anything gets sizes of zero, never below. */
export function measure(width: number, height: number, shape: Shape): Layout {
  const fw = shape.width + 2;
  const fh = shape.height + 2;
  const at = (inner: number): Layout & { total: number } => {
    const pad = inner * 0.04;
    const cell = inner / Math.max(fw, fh);
    const gap = inner * 0.04;
    const bucketSize = Math.min(((shape.width * cell) / shape.buckets) * 0.8, inner * 0.16);
    const columnWidth = inner / shape.columns;
    const potSize = Math.min(columnWidth * 0.7, inner * 0.16);
    const potGap = potSize * 0.18;
    const bucketY = HEADER_HEIGHT + pad + fh * cell + gap;
    const columnsY = bucketY + bucketSize + gap * 1.5;
    const total = columnsY + shape.visible * (potSize + potGap) + pad + FOOTER_HEIGHT;
    const left = (width - inner) / 2 + (inner - fw * cell) / 2;
    return { left, top: HEADER_HEIGHT + pad, cell, bucketY, bucketSize, columnsY, columnWidth, potSize, potGap, inner, total };
  };
  const bars = HEADER_HEIGHT + FOOTER_HEIGHT;
  let inner = Math.min(width * 0.92, 560);
  let l = at(inner);
  if (l.total > height) {
    inner *= Math.max(0, height - bars) / (l.total - bars);
    l = at(inner);
  }
  // A tall screen (a phone held upright) has height to spare: the column sits in the middle of it.
  const shift = Math.max(0, height - l.total) / 2;
  return { ...l, top: l.top + shift, bucketY: l.bucketY + shift, columnsY: l.columnsY + shift, inner };
}
