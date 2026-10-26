// The colours a level may use: one fixed pool of clearly different colours, so a level never asks the
// player to tell red from dark red. Every pair in the pool, and every colour against the page behind
// the picture, is at least MIN_DELTA_E apart in CIEDE2000; the palette test holds the pool to that.
// Each colour has one letter, which is how it is written in a picture's rows.

export interface Colour {
  name: string;
  /** The letter that stands for this colour in a picture's rows. */
  char: string;
  hex: string;
}

export const POOL: readonly Colour[] = [
  { name: 'red', char: 'r', hex: '#e53935' },
  { name: 'orange', char: 'o', hex: '#fb8c00' },
  { name: 'yellow', char: 'y', hex: '#fdd835' },
  { name: 'green', char: 'g', hex: '#8bc34a' },
  { name: 'dark green', char: 'd', hex: '#2e7d32' },
  { name: 'sky', char: 's', hex: '#4fc3f7' },
  { name: 'blue', char: 'b', hex: '#2f6fe0' },
  { name: 'purple', char: 'p', hex: '#a83cc8' },
  { name: 'pink', char: 'k', hex: '#f48fb1' },
  { name: 'brown', char: 'n', hex: '#7a4a2a' },
  { name: 'white', char: 'w', hex: '#ffffff' },
  { name: 'grey', char: 'e', hex: '#a8a8a8' },
  { name: 'charcoal', char: 'c', hex: '#5b5b5f' },
];

/**
 * Colours a picture may be painted in instead of a default one (a level's overrides). They have letters but no
 * place in the pool: a picture is drawn, dealt and played in the pool's letters only.
 */
export const EXTENDED: readonly Colour[] = [
  { name: 'navy', char: 'v', hex: '#1a237e' },
  { name: 'teal', char: 't', hex: '#008488' },
];

/** What a picture is painted in instead of its default colours: default letter → painted letter. */
export type Overrides = Readonly<Record<string, string>>;

/** The rows as they are painted: each overridden letter replaced by the one it is painted in. */
export function paint(rows: readonly string[], overrides: Overrides = {}): string[] {
  return rows.map((r) => [...r].map((ch) => overrides[ch] ?? ch).join(''));
}

/**
 * Throws unless the overrides fit the rows: each key a default letter the picture uses, each value an extended
 * letter or a default letter the picture does not use, and no two keys painted alike.
 */
export function checkOverrides(rows: readonly string[], overrides: Overrides = {}): void {
  const used = new Set(rows.join(''));
  const painted = new Set<string>();
  for (const [from, to] of Object.entries(overrides)) {
    if (!POOL.some((c) => c.char === from) || !used.has(from)) throw new Error(`override '${from}': not a default colour of the picture`);
    if (!EXTENDED.some((c) => c.char === to) && !(POOL.some((c) => c.char === to) && !used.has(to)))
      throw new Error(`override '${from}' → '${to}': not an extended colour, nor a default one the picture does not use`);
    if (painted.has(to)) throw new Error(`override '${from}' → '${to}': two colours painted alike`);
    painted.add(to);
  }
}

/** The character for a square with no pixel: the page shows through it from the start. */
export const CLEAR = '.';

/** The page behind the picture, which is also what an emptied square looks like. */
export const PAGE = '#1c1c22';

/** The least CIEDE2000 distance between two colours of the pool, and between a colour and the page. */
export const MIN_DELTA_E = 20;

/**
 * The blue-greens, by letter: green, dark green, mint, sky, teal, blue, navy, where colours are most often taken
 * for one another. A letter not in the pool (mint, until it joins) simply never matches.
 */
export const BLUE_GREENS = 'gdxstbv';

/** The most blue-greens one picture may hold. */
export const MAX_BLUE_GREENS = 4;

/** The blue-greens a picture's rows hold. */
export function blueGreensOf(rows: readonly string[]): string[] {
  const used = new Set(rows.join(''));
  return [...BLUE_GREENS].filter((c) => used.has(c));
}

export function colourByChar(char: string): Colour {
  const c = POOL.find((p) => p.char === char) ?? EXTENDED.find((p) => p.char === char);
  if (!c) throw new Error(`'${char}' is not a colour of the pool`);
  return c;
}

export type Lab = readonly [number, number, number];

/** sRGB '#rrggbb' to CIELAB under D65. */
export function hexToLab(hex: string): Lab {
  const n = parseInt(hex.slice(1), 16);
  return rgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const lin = (v: number) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const x = (0.4124564 * R + 0.3575761 * G + 0.1804375 * B) / 0.95047;
  const y = 0.2126729 * R + 0.7151522 * G + 0.072175 * B;
  const z = (0.0193339 * R + 0.119192 * G + 0.9503041 * B) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** The CIEDE2000 colour difference (Sharma, Wu and Dalal, 2005). */
export function deltaE(lab1: Lab, lab2: Lab): number {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (b: number, a: number) => {
    if (a === 0 && b === 0) return 0;
    const h = Math.atan2(b, a) / rad;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lmp = (L1 + L2) / 2;
  const Cmp = (C1p + C2p) / 2;
  let hmp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) <= 180) hmp = (h1p + h2p) / 2;
    else hmp = h1p + h2p < 360 ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hmp - 30) * rad) +
    0.24 * Math.cos(2 * hmp * rad) +
    0.32 * Math.cos((3 * hmp + 6) * rad) -
    0.2 * Math.cos((4 * hmp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hmp - 275) / 25) ** 2));
  const RC = 2 * Math.sqrt(Cmp ** 7 / (Cmp ** 7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lmp - 50) ** 2) / Math.sqrt(20 + (Lmp - 50) ** 2);
  const SC = 1 + 0.045 * Cmp;
  const SH = 1 + 0.015 * Cmp * T;
  const RT = -Math.sin(2 * dTheta * rad) * RC;
  return Math.sqrt((dLp / SL) ** 2 + (dCp / SC) ** 2 + (dHp / SH) ** 2 + RT * (dCp / SC) * (dHp / SH));
}
