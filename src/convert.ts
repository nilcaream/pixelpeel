// Turns a source image into a picture written in the pool's letters: crop to the visible part, choose
// the few pool colours that draw it best, shrink it by a vote in each square, and clean up single
// stray squares. Pure: the image comes in as RGBA pixels and the picture goes out as rows of text.

import { CLEAR, MAX_COLOURS, POOL, deltaE, hexToLab, rgbToLab, type Lab } from './palette.ts';

export interface Image {
  width: number;
  height: number;
  /** Row-major RGBA, four bytes a pixel. */
  rgba: Uint8Array;
}

export interface ConvertOptions {
  /** The longer side of the picture in squares; the other side keeps the image's proportions. */
  size: number;
  /** The most pool colours the picture may use. */
  colours: number;
}

/** A pixel at least this opaque counts as part of the picture; a fainter one is clear. */
const OPAQUE = 128;

/** A colour that occurs in the source, with how many pixels have it. */
export interface SourceColour {
  lab: Lab;
  count: number;
}

/** A colour covering at least this share of the visible pixels is one of the picture's areas, not an edge blend. */
const AREA_SHARE = 0.005;

/** Source colours closer than this are tones of one area and share a pool colour. */
const SAME_TONE = 8;

/**
 * Gives every source colour a pool colour. The picture's areas (colours common enough not to be edge
 * blends, with near tones joined) are taken largest first, up to `colours` of them, and each takes the
 * closest pool colour no larger area has taken: two areas never share a colour, so a light muzzle on a
 * brown face stays a muzzle in a colour of its own. Every other source colour goes with the area whose
 * colour is closest to it. Returns a pool index per source colour, in the order given.
 */
export function assignColours(sources: SourceColour[], colours: number): number[] {
  const total = sources.reduce((n, s) => n + s.count, 0);
  const byCount = sources.map((s, i) => ({ ...s, i })).sort((a, b) => b.count - a.count);
  const areas: { lab: Lab; count: number }[] = [];
  for (const s of byCount) {
    if (s.count < total * AREA_SHARE) break;
    const same = areas.find((a) => deltaE(a.lab, s.lab) < SAME_TONE);
    if (same) same.count += s.count;
    else areas.push({ lab: s.lab, count: s.count });
  }
  if (areas.length === 0) areas.push({ lab: (byCount[0] as SourceColour).lab, count: total });
  const kept = areas.sort((a, b) => b.count - a.count).slice(0, colours);
  const pool = POOL.map((c) => hexToLab(c.hex));
  const taken = new Set<number>();
  const poolOf = kept.map((a) => {
    let best = -1;
    pool.forEach((q, p) => {
      if (!taken.has(p) && (best < 0 || deltaE(a.lab, q) < deltaE(a.lab, pool[best] as Lab))) best = p;
    });
    taken.add(best);
    return best;
  });
  return sources.map((s) => {
    let best = 0;
    kept.forEach((a, k) => {
      if (deltaE(s.lab, a.lab) < deltaE(s.lab, (kept[best] as { lab: Lab }).lab)) best = k;
    });
    return poolOf[best] as number;
  });
}

export function convert(image: Image, o: ConvertOptions): string[] {
  if (o.colours < 1 || o.colours > MAX_COLOURS) throw new Error(`a picture uses 1 to ${MAX_COLOURS} colours, not ${o.colours}`);
  const { width, rgba } = image;
  const opaque = (p: number) => (rgba[p * 4 + 3] as number) >= OPAQUE;
  const keyOf = (p: number) => ((rgba[p * 4] as number) << 16) | ((rgba[p * 4 + 1] as number) << 8) | (rgba[p * 4 + 2] as number);

  // The visible part of the image.
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -1;
  let y1 = -1;
  for (let p = 0; p < image.width * image.height; p++) {
    if (!opaque(p)) continue;
    const x = p % width;
    const y = (p - x) / width;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  if (x1 < 0) throw new Error('the image has no visible pixel');
  const bw = x1 - x0 + 1;
  const bh = y1 - y0 + 1;

  // The pool colours that draw it.
  const byKey = new Map<number, SourceColour>();
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const p = y * width + x;
      if (!opaque(p)) continue;
      const key = keyOf(p);
      let s = byKey.get(key);
      if (!s) {
        s = { lab: rgbToLab(key >> 16, (key >> 8) & 255, key & 255), count: 0 };
        byKey.set(key, s);
      }
      s.count += 1;
    }
  const keys = [...byKey.keys()];
  const assigned = assignColours(keys.map((k) => byKey.get(k) as SourceColour), o.colours);
  const colourOf = new Map(keys.map((k, i) => [k, assigned[i] as number]));

  // Shrink: each square takes the value most of its source pixels have (a pool colour, or clear).
  const scale = o.size / Math.max(bw, bh);
  const W = Math.max(1, Math.round(bw * scale));
  const H = Math.max(1, Math.round(bh * scale));
  let grid: number[] = [];
  for (let gy = 0; gy < H; gy++)
    for (let gx = 0; gx < W; gx++) {
      const votes = new Map<number, number>();
      const sx0 = x0 + Math.floor((gx * bw) / W);
      const sx1 = x0 + Math.max(Math.floor(((gx + 1) * bw) / W), Math.floor((gx * bw) / W) + 1);
      const sy0 = y0 + Math.floor((gy * bh) / H);
      const sy1 = y0 + Math.max(Math.floor(((gy + 1) * bh) / H), Math.floor((gy * bh) / H) + 1);
      for (let y = sy0; y < sy1; y++)
        for (let x = sx0; x < sx1; x++) {
          const p = y * width + x;
          const v = opaque(p) ? (colourOf.get(keyOf(p)) as number) : -1;
          votes.set(v, (votes.get(v) ?? 0) + 1);
        }
      let best = -1;
      let bestVotes = -1;
      for (const [v, n] of votes) if (n > bestVotes || (n === bestVotes && v < best)) [best, bestVotes] = [v, n];
      grid.push(best);
    }

  grid = cleanStrays(grid, W, H);
  const rows: string[] = [];
  for (let y = 0; y < H; y++)
    rows.push(grid.slice(y * W, (y + 1) * W).map((v) => (v < 0 ? CLEAR : (POOL[v] as { char: string }).char)).join(''));
  return rows;
}

/**
 * A square none of whose four neighbours shares its value, while at least three of them share another
 * one, is a stray left by the shrinking: it takes that other value. A lone feature such as an eye has
 * neighbours of mixed values and stays.
 */
export function cleanStrays(grid: number[], W: number, H: number): number[] {
  const out = grid.slice();
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = grid[y * W + x] as number;
      const around: number[] = [];
      if (y > 0) around.push(grid[(y - 1) * W + x] as number);
      if (x > 0) around.push(grid[y * W + x - 1] as number);
      if (x < W - 1) around.push(grid[y * W + x + 1] as number);
      if (y < H - 1) around.push(grid[(y + 1) * W + x] as number);
      if (around.includes(v)) continue;
      for (const n of around)
        if (around.filter((m) => m === n).length >= 3) {
          out[y * W + x] = n;
          break;
        }
    }
  return out;
}

/** The pool colour a background takes when it is drawn: the one furthest from all the picture's colours. */
export function backgroundColour(rows: string[]): string {
  const used = POOL.filter((c) => rows.some((r) => r.includes(c.char)));
  let best = '';
  let bestDistance = -1;
  for (const c of POOL) {
    if (used.includes(c)) continue;
    const d = Math.min(...used.map((u) => deltaE(hexToLab(c.hex), hexToLab(u.hex))));
    if (d > bestDistance) [best, bestDistance] = [c.char, d];
  }
  if (!best) throw new Error('every pool colour is in the picture, so none is left for its background');
  return best;
}

/**
 * The picture framed one square larger on every side, with every clear square that touches it (above,
 * below or beside) drawn in one colour: a ring that has to be peeled before the picture opens up.
 */
export function outline(rows: string[], char: string): string[] {
  const w = (rows[0] as string).length;
  const grid = [CLEAR.repeat(w + 2), ...rows.map((r) => CLEAR + r + CLEAR), CLEAR.repeat(w + 2)];
  const filled = (x: number, y: number) => (grid[y]?.[x] ?? CLEAR) !== CLEAR;
  return grid.map((r, y) =>
    r.replace(/./g, (c, x: number) =>
      c === CLEAR && (filled(x, y - 1) || filled(x - 1, y) || filled(x + 1, y) || filled(x, y + 1)) ? char : c,
    ),
  );
}

/** The picture with its clear squares filled in one colour, for levels whose background is peeled too. */
export function fillClear(rows: string[], char: string): string[] {
  return rows.map((r) => r.split(CLEAR).join(char));
}
