// Where everything goes on the page. Portrait first: one tall column (picture, buckets, pots) that fits
// the screen and is centred on a wide one.

/** The height kept free at the top for the level's number and band. */
export const HUD_HEIGHT = 40;

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
    const bucketY = HUD_HEIGHT + pad + fh * cell + gap;
    const columnsY = bucketY + bucketSize + gap * 1.5;
    const total = columnsY + shape.visible * (potSize + potGap) + pad;
    const left = (width - inner) / 2 + (inner - fw * cell) / 2;
    return { left, top: HUD_HEIGHT + pad, cell, bucketY, bucketSize, columnsY, columnWidth, potSize, potGap, inner, total };
  };
  let inner = Math.min(width * 0.92, 560);
  let l = at(inner);
  if (l.total > height) {
    inner *= Math.max(0, height - HUD_HEIGHT) / (l.total - HUD_HEIGHT);
    l = at(inner);
  }
  return { ...l, inner };
}
