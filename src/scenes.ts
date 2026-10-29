// The pictures of the first levels: whole scenes drawn in code, in pool letters, the way pixel-art
// pictures are built. A scene fills its rectangle (sky and grass are colours to peel too), gives each
// area two tones dithered together, and nests small things in big ones: spots in a cap, apples in a
// crown, flowers in grass, stars in the night. The detail is what makes a picture hard: dithered tones
// and single scattered pixels make colours interleave, so no pot reaches all of its colour at once.
// A scene's seed only moves its scattered pixels.

import type { Overrides } from './palette.ts';
import { seededRng, type Rng } from './rng.ts';

/** The size of a scene that names none: the first twenty levels. Later levels are drawn larger. */
export const SCENE_WIDTH = 32;
export const SCENE_HEIGHT = 24;

export class Canvas {
  readonly g: string[][];
  readonly rng: Rng;
  readonly width: number;
  readonly height: number;
  /** Rows of the same scene drawn above and below the picture's own, for a square icon; 0 for a level. */
  readonly pad: number;
  constructor(rng: Rng, pad = 0, width = SCENE_WIDTH, height = SCENE_HEIGHT) {
    this.rng = rng;
    this.pad = pad;
    this.width = width;
    this.height = height;
    this.g = Array.from({ length: height + 2 * pad }, () => Array.from({ length: width }, () => 's'));
  }

  at(x: number, y: number): string | undefined {
    return this.g[y + this.pad]?.[x];
  }

  put(x: number, y: number, c: string): void {
    const row = this.g[y + this.pad];
    if (row && x >= 0 && x < this.width) row[x] = c;
  }

  /** Puts `c` where the square now holds a colour in `on`; the way to shade or texture one area only. */
  putOn(x: number, y: number, c: string, on: string): void {
    if (on.includes(this.at(x, y) as string)) this.put(x, y, c);
  }

  /** A straight line of single squares. */
  line(x0: number, y0: number, x1: number, y1: number, c: string): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.put(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), c);
  }

  /**
   * Rows from y0 to y1 blended from colour `a` at the top to `b` at the bottom: `a` alone, then the two
   * dithered, then `b` alone. Only squares holding a colour in `on` change, when `on` is given.
   */
  gradient(y0: number, y1: number, a: string, b: string, on?: string): void {
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / Math.max(1, y1 - y0);
      for (let x = 0; x < this.width; x++) {
        const c = t < 0.3 ? a : t < 0.7 ? ((x + y) % 2 === 0 ? a : b) : b;
        if (on) this.putOn(x, y, c, on);
        else this.put(x, y, c);
      }
    }
  }

  /** Texture over a rectangle: a lattice of single squares in `c` every `every` squares, each row of dots half a step off the last, on `on`. */
  dots(x0: number, y0: number, x1: number, y1: number, c: string, on: string, every = 3): void {
    for (let y = y0; y <= y1; y++) {
      if (y % every !== 0) continue;
      const shift = (Math.floor(y / every) % 2) * Math.floor(every / 2);
      for (let x = x0; x <= x1; x++) if ((x + shift) % every === 0) this.putOn(x, y, c, on);
    }
  }

  /** A brick or plank pattern: the mortar colour on every `h`-th row, and on alternating joints between. */
  bricks(x0: number, y0: number, x1: number, y1: number, mortar: string, on: string, w = 4, h = 2): void {
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const row = Math.floor((y - y0) / h);
        const joint = (x - x0 + (row % 2) * Math.floor(w / 2)) % w === 0;
        if ((y - y0) % h === h - 1 || joint) this.putOn(x, y, mortar, on);
      }
  }

  /** The outline of every run of a colour in `of`, where it meets a colour not in `of`, in `c`; across the whole picture. */
  outline(of: string, c: string): void {
    const marks: [number, number][] = [];
    for (let y = -this.pad; y < this.height + this.pad; y++)
      for (let x = 0; x < this.width; x++) {
        if (!of.includes(this.at(x, y) as string)) continue;
        const touches = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dy]) => {
          const n = this.at(x + dx, y + dy);
          return n !== undefined && !of.includes(n);
        });
        if (touches) marks.push([x, y]);
      }
    for (const [x, y] of marks) this.put(x, y, c);
  }

  rect(x0: number, y0: number, x1: number, y1: number, c: string): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, c);
  }

  /** An ellipse; its lower right is in `shade`, dithered at the edge, and its upper left in `light`. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, shade?: string, light?: string): void {
    for (let y = -this.pad; y < this.height + this.pad; y++)
      for (let x = 0; x < this.width; x++) {
        const u = (x - cx) / rx;
        const v = (y - cy) / ry;
        if (u * u + v * v > 1) continue;
        const t = 0.6 * u + 0.8 * v;
        let col = c;
        if (shade && (t > 0.35 || (t > 0.15 && (x + y) % 2 === 0))) col = shade;
        if (light && t < -0.55) col = light;
        this.put(x, y, col);
      }
  }

  /** A triangle standing on its base, apex at (cx, top); its right part is in `shade`, dithered at the edge. */
  triangle(cx: number, top: number, bottom: number, halfBase: number, c: string, shade?: string): void {
    for (let y = top; y <= bottom; y++) {
      const half = Math.round((halfBase * (y - top)) / Math.max(1, bottom - top));
      for (let x = cx - half; x <= cx + half; x++) {
        const right = half ? (x - cx) / half : 0;
        const shaded = shade && (right > 0.45 || (right > 0.15 && (x + y) % 2 === 0));
        this.put(x, y, shaded ? (shade as string) : c);
      }
    }
  }

  /** Ground from about row `top` down, a gentle wave on top: `light` near the top, `deep` below, dithered between. */
  ground(top: number, wave = 1.5, light = 'g', deep = 'd'): void {
    for (let x = 0; x < this.width; x++) {
      const h = top + Math.round(wave * Math.sin(x / 4));
      for (let y = h; y < this.height + this.pad; y++) {
        const d = y - h;
        this.put(x, y, d > 3 || (d > 1 && (x + y) % 2 === 0) ? deep : light);
      }
    }
  }

  /** `n` single pixels in colours from `cs`, on squares of a colour in `on`, between rows y0 and y1. */
  scatter(cs: string, n: number, y0: number, y1: number, on: string): void {
    for (let i = 0; i < n; i++)
      for (let tries = 0; tries < 50; tries++) {
        const x = Math.floor(this.rng() * this.width);
        const y = y0 + Math.floor(this.rng() * (y1 - y0 + 1));
        if (on.includes(this.at(x, y) as string)) {
          this.put(x, y, cs[Math.floor(this.rng() * cs.length)] as string);
          break;
        }
      }
  }

  /** A white cloud with a grey underside. */
  cloud(x: number, y: number, w: number): void {
    this.rect(x + 1, y, x + w - 2, y, 'w');
    this.rect(x, y + 1, x + w - 1, y + 1, 'w');
    this.rect(x + 1, y + 2, x + w - 2, y + 2, 'e');
  }

  /** A flower: four petals round a centre. */
  flower(x: number, y: number, petal: string, centre: string): void {
    for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1]] as const) this.put(x + dx, y + dy, petal);
    this.put(x, y, centre);
  }

  // The helpers below draw without the two-by-two checker and without ruler-straight edges: a boundary
  // between two colours wanders with smooth noise, and where two tones meet, single squares of one stray
  // into the other at fixed but irregular places. The noise is fixed by a salt, never by the seed.

  /** Smooth value noise in [0, 1) with features about `scale` squares wide. */
  noise(x: number, y: number, scale: number, salt = 0): number {
    const fx = x / scale;
    const fy = y / scale;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const sx = smooth(fx - x0);
    const sy = smooth(fy - y0);
    const top = hash(x0, y0, salt) + (hash(x0 + 1, y0, salt) - hash(x0, y0, salt)) * sx;
    const bottom = hash(x0, y0 + 1, salt) + (hash(x0 + 1, y0 + 1, salt) - hash(x0, y0 + 1, salt)) * sx;
    return top + (bottom - top) * sy;
  }

  /**
   * The small-scale wander of an edge, in rows: a second, finer octave of noise and a stray of a square
   * either way, so that no edge runs ruler-straight for long even where the large noise is flat.
   */
  wobble(x: number, y: number, salt = 0): number {
    return (this.noise(x, y, 2.5, salt + 5) - 0.5) * 1.6 + (hash(x, y, salt + 7) - 0.5) * 1.6;
  }

  /** Every square, the picture's own and the pad's: `paint` returns its new colour, or nothing to leave it. */
  fill(paint: (x: number, y: number, now: string) => string | undefined): void {
    for (let y = -this.pad; y < this.height + this.pad; y++)
      for (let x = 0; x < this.width; x++) {
        const c = paint(x, y, this.at(x, y) as string);
        if (c) this.put(x, y, c);
      }
  }

  /**
   * Rows from y0 to y1 in bands of `colours`, top to bottom, of equal height. Each band's lower edge
   * wanders up to `wave` rows up or down with the noise, and squares within a row of an edge stray across it.
   */
  bands(y0: number, y1: number, colours: string, salt = 0, wave = 1.5, scale = 7, on?: string): void {
    const n = colours.length;
    const h = (y1 - y0 + 1) / n;
    this.fill((x, y, now) => {
      if (y < y0 || y > y1 || (on && !on.includes(now))) return undefined;
      const r = y - y0 + 0.5 + (this.noise(x, y, scale, salt) - 0.5) * 2 * wave + this.wobble(x, y, salt);
      return colours[Math.min(n - 1, Math.max(0, Math.floor(r / h)))];
    });
  }

  /**
   * An ellipse whose rim wanders by `rough` with the noise; lit from the upper left, its far side in
   * `shade` and its near side in `light`, each in a solid patch with a wandering edge.
   */
  blob(cx: number, cy: number, rx: number, ry: number, c: string, shade?: string, light?: string, salt = 0, rough = 0.25): void {
    this.fill((x, y) => {
      const u = (x - cx) / rx;
      const v = (y - cy) / ry;
      const n = this.noise(x, y, 3, salt) - 0.5;
      // A rough rim also wanders by about a square at any size, so a long flat side never runs straight.
      const fine = rough > 0 ? ((this.noise(x, y, 1.7, salt + 9) - 0.5) * 2.4) / Math.min(rx, ry) : 0;
      if (u * u + v * v > 1 + rough * 2 * n + fine) return undefined;
      const t = 0.6 * u + 0.8 * v + 0.5 * n + (hash(x, y, salt + 3) - 0.5) * 0.25;
      if (shade && t > 0.35) return shade;
      if (light && t < -0.5) return light;
      return c;
    });
  }

  /** A curved stroke from (x0, y0) bending towards (bx, by) and ending at (x1, y1), `w0` squares wide at its start and `w1` at its end. */
  curve(x0: number, y0: number, bx: number, by: number, x1: number, y1: number, c: string, w0 = 1, w1 = w0): void {
    const steps = 4 * (Math.abs(x1 - x0) + Math.abs(y1 - y0) + Math.abs(bx - x0) + Math.abs(by - y0) + 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * bx + t * t * x1;
      const py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * by + t * t * y1;
      const r = (w0 + (w1 - w0) * t) / 2;
      if (r <= 0.5) {
        this.put(Math.round(px), Math.round(py), c);
        continue;
      }
      for (let y = Math.floor(py - r); y <= Math.ceil(py + r); y++)
        for (let x = Math.floor(px - r); x <= Math.ceil(px + r); x++) if ((x - px) ** 2 + (y - py) ** 2 <= r * r) this.put(x, y, c);
    }
  }

  /** A filled polygon through the given corners, [x, y, x, y, …]; a square is in when its centre is. */
  poly(corners: readonly number[], c: string): void {
    const n = corners.length / 2;
    this.fill((x, y) => {
      let inside = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = corners[2 * i] as number;
        const yi = corners[2 * i + 1] as number;
        const xj = corners[2 * j] as number;
        const yj = corners[2 * j + 1] as number;
        if (yi > y + 0.5 !== yj > y + 0.5 && x + 0.5 < ((xj - xi) * (y + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside ? c : undefined;
    });
  }

  /** Single squares of `c` on a colour in `on`, at fixed irregular places, about `share` of them. */
  speckle(c: string, on: string, share: number, salt = 0): void {
    this.fill((x, y, now) => (on.includes(now) && hash(x, y, salt + 11) < share ? c : undefined));
  }

  rows(): string[] {
    return this.g.map((r) => r.join(''));
  }
}

const smooth = (t: number): number => t * t * (3 - 2 * t);

/** Fixed white noise in [0, 1) for a square: the same square and salt give the same number on every draw. */
export function hash(x: number, y: number, salt = 0): number {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(salt, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export interface Scene {
  title: string;
  /** The picture's size in squares; SCENE_WIDTH × SCENE_HEIGHT when not given. */
  width?: number;
  height?: number;
  draw: (c: Canvas) => void;
  /**
   * The deal the bake tries first, chosen from a sweep of the picture's deals for its band and for a game
   * with no trivial first phase; the bake searches as usual when it does not fit.
   */
  deal?: { sceneSeed: number; buckets: number; seed: number; strength: number };
  /** Drawn right to left: another level's picture mirrored, which plays as a picture of its own. */
  mirror?: boolean;
  /**
   * Colours the picture is painted in instead of default ones, as default letter → painted letter (`paint` in
   * src/palette.ts). The scene draws in default letters only; the overrides change how it looks, never how it plays.
   */
  overrides?: Overrides;
}

/** The size of the scenes from level 21 on: more squares for shading, texture and detail, still legible on a phone. */
export const LARGE = { width: 40, height: 30 } as const;

/** Ground below a skyline that wanders by up to `amp` rows round `base`, in bands of `colours` by depth. */
export function land(c: Canvas, base: number, amp: number, colours: string, salt: number, depth = 4, scale = 9): void {
  c.fill((x, y) => {
    const top = base + (c.noise(x, 0, scale, salt) - 0.5) * 2 * amp + (c.noise(x, 0, 2.5, salt + 3) - 0.5) * 1.6;
    if (y < top) return undefined;
    const d = (y - top + c.wobble(x, y, salt + 1)) / depth + (c.noise(x, y, 4, salt + 1) - 0.5) * 1.2;
    return colours[Math.min(colours.length - 1, Math.max(0, Math.floor(d)))];
  });
}

/** A cloud: a few overlapping puffs, white, with a `shade` underside. */
export function cloud(c: Canvas, x: number, y: number, w: number, salt: number, shade = 'e'): void {
  c.blob(x, y + 0.6, w / 2, w / 6 + 0.6, shade, undefined, undefined, salt, 0.3);
  c.blob(x - w / 5, y, w / 4, w / 6 + 0.4, 'w', undefined, undefined, salt + 1, 0.3);
  c.blob(x + w / 6, y - 0.6, w / 4, w / 5 + 0.4, 'w', undefined, undefined, salt + 2, 0.3);
}

/** Short ripples on water: little arcs in `c` on `on`, at fixed irregular places. */
export function ripples(c: Canvas, y0: number, y1: number, col: string, on: string, n: number, salt: number): void {
  for (let i = 0; i < n; i++) {
    const x = Math.floor(hash(i, 1, salt) * c.width);
    const y = y0 + Math.floor(hash(i, 2, salt) * (y1 - y0 + 1));
    const w = 2 + Math.floor(hash(i, 3, salt) * 3);
    for (let k = 0; k < w; k++) c.putOn(x + k, y + (k === 0 || k === w - 1 ? 0 : -1) * (w > 3 ? 1 : 0), col, on);
  }
}

/**
 * Wavy streaks of `col`, `thick` squares deep, across the squares of `on` from row y0 to y1, one every `gap`
 * rows, broken into dashes where the noise is below `dash`: interleaves two colours without a checker.
 */
export function streaks(c: Canvas, col: string, on: string, y0: number, y1: number, gap: number, salt: number, thick = 1, dash = 0.35): void {
  c.fill((x, y, now) => {
    if (y < y0 || y > y1 || !on.includes(now)) return undefined;
    const p = y + (c.noise(x, 0, 6, salt) - 0.5) * 4 + Math.sin(x / 3.5 + salt) * 1.1;
    const band = Math.floor(p / gap);
    return p - band * gap < thick && c.noise(x, band * 7, 3.5, salt + 2) > dash ? col : undefined;
  });
}

/** A ribbon of `col` one to two squares wide over the squares of `on`, waving across the whole width round row `base`. */
export function ribbon(c: Canvas, col: string, on: string, base: number, amp: number, salt: number, width = 0.9): void {
  c.fill((x, y, now) => {
    if (!on.includes(now)) return undefined;
    const mid = base + Math.sin(x / 5 + salt) * amp + (c.noise(x, 0, 6, salt) - 0.5) * 3;
    return Math.abs(y - mid) < width + c.noise(x, y, 2, salt + 1) * 0.8 ? col : undefined;
  });
}

/**
 * A rim in `col` on the squares of `of`, inside the box x0..x1, y0..y1, that touch a colour of `against`:
 * sets a subject off a background of colours close to its own.
 */
export function rim(c: Canvas, of: string, against: string, col: string, x0: number, y0: number, x1: number, y1: number): void {
  const marks: [number, number][] = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (of.includes(c.at(x, y) as string) && ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dy]) => against.includes(c.at(x + dx, y + dy) ?? '-')))
        marks.push([x, y]);
  for (const [x, y] of marks) c.put(x, y, col);
}

/** A bright star with the cross of light a telescope's mirror gives it: one square of `core`, four of `ray`. */
export function starCross(c: Canvas, x: number, y: number, core: string, ray: string): void {
  c.put(x, y, core);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) c.put(x + dx, y + dy, ray);
}

/** A little picture of letters, row by row, its top left at (x0, y0); '.' leaves the square as it is. */
export function sprite(c: Canvas, x0: number, y0: number, rows: readonly string[]): void {
  rows.forEach((row, y) => [...row].forEach((k, x) => k !== '.' && c.put(x0 + x, y0 + y, k)));
}

/** A little picture of letters, row by row, '.' left alone; `flip` mirrors it inside its own box. */
export function spriteFlip(c: Canvas, rows: readonly string[], x0: number, y0: number, flip = false): void {
  rows.forEach((row, y) =>
    [...row].forEach((k, i) => {
      if (k !== '.') c.put(flip ? x0 + row.length - 1 - i : x0 + i, y0 + y, k);
    }),
  );
}

/** The part of `v` after the point, in [0, 1) also for negative `v`. */
export function frac(v: number): number {
  return v - Math.floor(v);
}

/** A fir in three tiers, each a little wider than the one above. */
export function pine(c: Canvas, cx: number, top: number, bottom: number, half: number, col: string): void {
  const h = bottom - top;
  for (let k = 0; k < 3; k++) {
    const t0 = top + ((k * h) / 3) * 0.8;
    const t1 = top + ((k + 1) * h) / 3;
    const w = half * (0.45 + (0.55 * (k + 1)) / 3);
    c.poly([cx, t0, cx + w, t1, cx - w * 0.9, t1 + 0.4], col);
  }
}

/** A koi seen from above along a bent spine, head first: body, two side fins and a tail fan. */
export function koi(c: Canvas, p: number[], R: number, body: string, fin: string) {
  const [x0, y0, bx, by, x1, y1] = p as [number, number, number, number, number, number];
  const at = (t: number): [number, number] => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * bx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * by + t * t * y1];
  const dir = (t: number): [number, number] => {
    const dx = 2 * (1 - t) * (bx - x0) + 2 * t * (x1 - bx);
    const dy = 2 * (1 - t) * (by - y0) + 2 * t * (y1 - by);
    const l = Math.hypot(dx, dy);
    return [dx / l, dy / l];
  };
  const rad = (t: number): number => R * (t < 0.25 ? 0.55 + t * 1.8 : Math.max(0.25, 1 - (t - 0.25) * 1.05));
  const [tx, ty] = at(1);
  const [dx, dy] = dir(1);
  for (const s of [-1, 1])
    c.curve(tx - dx, ty - dy, tx + dx * 2.5 - s * dy * 1.4, ty + dy * 2.5 + s * dx * 1.4, tx + dx * 4.4 - s * dy * 3.2, ty + dy * 4.4 + s * dx * 3.2, fin, 2.4, 1.3);
  const [px, py] = at(0.24);
  const [ex, ey] = dir(0.24);
  const r0 = rad(0.24);
  for (const s of [-1, 1]) {
    const nx = -ey * s;
    const ny = ex * s;
    c.curve(px + nx * r0 * 0.6, py + ny * r0 * 0.6, px + nx * (r0 + 1.8) - ex, py + ny * (r0 + 1.8) - ey, px + nx * (r0 + 2.8) - ex * 3, py + ny * (r0 + 2.8) - ey * 3, fin, 2.2, 1.2);
  }
  const cells: [number, number, number][] = [];
  const seen = new Set<string>();
  for (let i = 0; i <= 300; i++) {
    const t = i / 300;
    const [x, y] = at(t);
    const r = rad(t);
    for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
      for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++)
        if ((xx - x) ** 2 + (yy - y) ** 2 <= r * r && !seen.has(`${xx},${yy}`)) {
          seen.add(`${xx},${yy}`);
          cells.push([xx, yy, t]);
          c.put(xx, yy, body);
        }
  }
  const eyes = (): void => {
    const [hx, hy] = at(0.08);
    const [hdx, hdy] = dir(0.08);
    const hr = rad(0.08) * 0.62;
    for (const s of [-1, 1]) c.put(Math.round(hx - hdy * s * hr), Math.round(hy + hdx * s * hr), 'c');
  };
  return { cells, at, eyes };
}

/**
 * A fish seen from above, its head towards angle `ang`: a body `len` long and `wide` across at its widest,
 * bent by `bend`, a forked tail fan and two pectoral fins. The function it returns tells the part a square falls in.
 */
export function fishPart(cx: number, cy: number, ang: number, len: number, wide: number, bend: number) {
  return (x: number, y: number): 'body' | 'spine' | 'fin' | 'tail' | undefined => {
    const dx = x + 0.5 - cx;
    const dy = y + 0.5 - cy;
    const u = dx * Math.cos(ang) + dy * Math.sin(ang);
    const t = u / len;
    const v = -dx * Math.sin(ang) + dy * Math.cos(ang) - bend * t * t * len;
    const hw = wide * Math.sqrt(Math.max(0, 1 - ((t - 0.1) / 0.6) ** 2));
    if (t > -0.5 && t < 0.7 && Math.abs(v) < hw) return Math.abs(v) < 0.55 && t > -0.3 && t < 0.4 ? 'spine' : 'body';
    if (t > 0.12 && t < 0.32 && Math.abs(v) >= hw && Math.abs(v) < hw + 0.5 + (1.6 * (0.32 - t)) / 0.2) return 'fin';
    if (t <= -0.42 && t > -0.86) {
      const spread = (-0.42 - t) * len * 0.62 + 0.7;
      const notch = (-0.68 - t) * len * 1.2;
      if (Math.abs(v) < spread && Math.abs(v) >= notch) return 'tail';
    }
    return undefined;
  };
}

/** A pointed leaf along the angle `ang`, `len` from the middle to each tip, `w` wide, with a vein if given. */
export function leaf(c: Canvas, cx: number, cy: number, len: number, w: number, ang: number, col: string, vein?: string): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  c.fill((x, y) => {
    const dx = x + 0.5 - cx;
    const dy = y + 0.5 - cy;
    const u = (dx * ca + dy * sa) / len;
    const v = (-dx * sa + dy * ca) / w;
    if (u < -1 || u > 1 || Math.abs(v) > Math.sqrt(1 - u * u) * (1 - 0.25 * u)) return undefined;
    return vein && Math.abs(v * w) < 0.5 && u > -0.8 && u < 0.7 ? vein : col;
  });
}

/** Draws with `draw`, then rings what it drew with one square of `col` outside it, so it stands off its ground. */
export function outlined(c: Canvas, col: string, draw: () => void): void {
  const before: string[][] = [];
  for (let y = 0; y < 30; y++) {
    before.push([]);
    for (let x = 0; x < 40; x++) {
      before[y]!.push(c.at(x, y) as string);
      c.put(x, y, '#');
    }
  }
  draw();
  const drawn = new Set<number>();
  for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) if (c.at(x, y) !== '#') drawn.add(y * 40 + x);
  const mine = (x: number, y: number): boolean => x >= 0 && x < 40 && y >= 0 && y < 30 && drawn.has(y * 40 + x);
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 40; x++) {
      if (mine(x, y)) continue;
      const edge = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dy]) => mine(x + dx, y + dy));
      c.put(x, y, edge ? col : (before[y]![x] as string));
    }
}

/**
 * A wavy tentacle from (x0, y0) along angle `ang`, `len` squares long, swaying `amp` squares either side,
 * `w0` wide at its root and `w1` at its tip; the last `tipShare` of it in `tip`.
 */
function tentacle(c: Canvas, x0: number, y0: number, ang: number, len: number, amp: number, phase: number, body: string, tip: string, w0 = 1.6, w1 = 0.9, tipShare = 0.25): void {
  const dx = Math.cos(ang);
  const dy = Math.sin(ang);
  const steps = Math.ceil(len * 4);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const sway = Math.sin(t * Math.PI * 1.6 + phase) * amp * t;
    const px = x0 + dx * len * t - dy * sway;
    const py = y0 + dy * len * t + dx * sway;
    const r = (w0 + (w1 - w0) * t) / 2;
    const col = t > 1 - tipShare ? tip : body;
    for (let y = Math.floor(py - r); y <= Math.ceil(py + r); y++)
      for (let x = Math.floor(px - r); x <= Math.ceil(px + r); x++)
        if ((x + 0.5 - px) ** 2 + (y + 0.5 - py) ** 2 <= r * r + 0.15) c.put(x, y, col);
  }
}

/** A five-armed star round (cx, cy): its arms reach `tip` squares out from a body `core` squares across. */
function starAt(cx: number, cy: number, core: number, tip: number, turn: number, x: number, y: number) {
  const dx = x + 0.5 - cx;
  const dy = y + 0.5 - cy;
  const r = Math.hypot(dx, dy);
  // A slight curl: the arms bend as they go out.
  const a = Math.atan2(dy, dx) - turn - r * 0.035;
  const arm = Math.abs(Math.cos((5 * a) / 2));
  const reach = core + (tip - core) * arm ** 2.1;
  return { r, reach, arm, a };
}

/** Points along a Catmull-Rom spline through `pts`, densely sampled, each with its arc length from the start. */
function spline(pts: readonly (readonly [number, number])[], per = 24): { x: number; y: number; s: number }[] {
  const out: { x: number; y: number; s: number }[] = [];
  let s = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)]!;
    const p1 = pts[i]!;
    const p2 = pts[i + 1]!;
    const p3 = pts[Math.min(pts.length - 1, i + 2)]!;
    for (let k = 0; k < per; k++) {
      const t = k / per;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      const x = f(p0[0], p1[0], p2[0], p3[0]);
      const y = f(p0[1], p1[1], p2[1], p3[1]);
      const last = out[out.length - 1];
      if (last) s += Math.hypot(x - last.x, y - last.y);
      out.push({ x, y, s });
    }
  }
  const end = pts[pts.length - 1]!;
  const last = out[out.length - 1]!;
  out.push({ x: end[0], y: end[1], s: s + Math.hypot(end[0] - last.x, end[1] - last.y) });
  return out;
}

/** A firework burst: a core, a ring with sparks of `spark` mixed in, and long broken rays of `ray` thrown out to `r`. */
function burst(c: Canvas, cx: number, cy: number, r: number, core: string, ring: string, ray: string, spark: string, salt: number, heart?: string, halo?: string): void {
  // The smoke the burst lights up, a ragged ring round it.
  if (halo)
    c.fill((x, y, now) => {
      const d = Math.hypot(x - cx, (y - cy) / 0.9) - r * 0.95;
      return now === 'c' && d > -0.2 && d < 0.9 + c.noise(x, y, 2, salt + 4) * 1.6 ? halo : undefined;
    });
  const n = Math.max(9, Math.round(r * 2.1));
  for (let k = 0; k < n; k++) {
    const a = (k / n) * 2 * Math.PI + (hash(k, 0, salt) - 0.5) * 0.4;
    const len = r * (0.75 + 0.25 * hash(k, 1, salt));
    for (let d = r * 0.4; d <= len; d += 0.5) {
      if (c.noise(k * 5, d, 1.6, salt + 1) < 0.35) continue;
      c.put(Math.round(cx + Math.cos(a) * d), Math.round(cy + Math.sin(a) * d * 0.9), d > len - 0.6 ? ring : ray);
    }
  }
  c.fill((x, y) => {
    const d = Math.hypot(x - cx, (y - cy) / 0.9);
    if (d > r * 0.3 + (hash(x, y, salt + 2) - 0.5) * 0.9) return undefined;
    if (d < r * 0.1 + 0.4) return core;
    return hash(x, y, salt + 3) < 0.3 ? spark : ring;
  });
  if (heart) c.put(Math.round(cx), Math.round(cy), heart);
}

/** A bee seen from above, its head to the left: rounded white wings with a sky edge, a striped abdomen, a thorax, a head. */
function bee(c: Canvas, cx: number, cy: number, s: number, thorax: string): void {
  for (const side of [-1, 1]) {
    const wx = cx - 0.15 * s;
    const wy = cy + side * 1.3 * s;
    c.blob(wx, wy, 1.25 * s, 0.85 * s, 's', undefined, undefined, 300 + side, 0.08);
    c.blob(wx - 0.2, wy - side * 0.3, 1.25 * s - 1, 0.85 * s - 1, 'w', undefined, undefined, 302 + side, 0.08);
  }
  c.fill((x, y) => {
    const u = (x + 0.5 - (cx + 1.15 * s)) / (1.75 * s);
    const v = (y + 0.5 - cy) / (0.7 * s);
    if (u * u + v * v > 1) return undefined;
    if (u > 0.78) return 'c';
    return frac((u + 1) * (s > 2 ? 2 : 1.5)) < 0.68 ? 'y' : 'c';
  });
  c.blob(cx - 0.7 * s, cy, 0.62 * s, 0.62 * s, thorax, undefined, undefined, 304, 0.05);
  c.blob(cx - 1.6 * s, cy, 0.45 * s, 0.48 * s, 'c', undefined, undefined, 305, 0.05);
}

/** A turned ellipse; `col` is a colour or a painter given the ellipse's own coordinates (u along, v across, both −1..1). */
function oval(c: Canvas, cx: number, cy: number, rx: number, ry: number, ang: number, col: string | ((u: number, v: number, x: number, y: number) => string | undefined), rough = 0, salt = 0): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  c.fill((x, y) => {
    const dx = x + 0.5 - cx;
    const dy = y + 0.5 - cy;
    const u = (dx * ca + dy * sa) / rx;
    const v = (-dx * sa + dy * ca) / ry;
    if (u * u + v * v > 1 + (rough ? (c.noise(x, y, 2.2, salt) - 0.5) * 2 * rough : 0)) return undefined;
    return typeof col === 'string' ? col : col(u, v, x, y);
  });
}

/** A broken line of single squares through the points, as a lightning bolt or a crack. */
function path(c: Canvas, pts: readonly (readonly [number, number])[], col: string): void {
  for (let i = 1; i < pts.length; i++) c.line(...(pts[i - 1] as [number, number]), ...(pts[i] as [number, number]), col);
}

// Ten pictures drawn by Retell: each from a description in words only, never from the picture it describes.

/** How far a square's centre lies from an ellipse's centre, 1 on its edge. */
const ell = (x: number, y: number, cx: number, cy: number, rx: number, ry: number): number => Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);

type Sample = [number, number, number];
/** A path sampled finely, each sample with the arc length up to it. */
function sampled(f: (t: number) => [number, number], n = 240): Sample[] {
  const out: Sample[] = [];
  let s = 0;
  let [px, py] = f(0);
  for (let i = 0; i <= n; i++) {
    const [x, y] = f(i / n);
    s += Math.hypot(x - px, y - py);
    out.push([x, y, s]);
    px = x;
    py = y;
  }
  return out;
}
/** The distance from a square's centre to the path, and the arc length where it is nearest. */
function nearest(pts: Sample[], x: number, y: number): [number, number] {
  let best = Infinity;
  let at = 0;
  for (const [px, py, s] of pts) {
    const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
    if (d < best) {
      best = d;
      at = s;
    }
  }
  return [best, at];
}
/** A tube along a path, `width(s)` wide on each side, painted by arc length. */
function tube(c: Canvas, pts: Sample[], width: (s: number) => number, paint: (s: number, d: number) => string | undefined): void {
  c.fill((x, y) => {
    const [d, s] = nearest(pts, x, y);
    return d <= width(s) ? paint(s, d) : undefined;
  });
}
/** How close a square lies to the wall between two cells of a jittered grid: 0 on the wall. */
function cellGap(x: number, y: number, size: number, salt: number): number {
  const gx = Math.floor(x / size);
  const gy = Math.floor(y / size);
  let d0 = 99;
  let d1 = 99;
  for (let j = gy - 1; j <= gy + 1; j++)
    for (let i = gx - 1; i <= gx + 1; i++) {
      const d = Math.hypot(x + 0.5 - (i + 0.2 + hash(i, j, salt) * 0.6) * size, y + 0.5 - (j + 0.2 + hash(i, j, salt + 1) * 0.6) * size);
      if (d < d0) {
        d1 = d0;
        d0 = d;
      } else if (d < d1) d1 = d;
    }
  return d1 - d0;
}
/** Turns every square of the working letter `from` into `to`. */
const settle = (c: Canvas, from: string, to: string): void => c.fill((_x, _y, now) => (now === from ? to : undefined));

/** A flat-topped savanna tree: a leaning forked trunk and a broad ragged crown with sky showing through. */
function acacia(c: Canvas, cx: number, top: number, half: number, ground: number, salt: number): void {
  const mid = (ground + top) / 2 + 2;
  c.curve(cx + 0.5, ground + 1, cx - 0.5, mid, cx - half * 0.45, top + 1, 'e', 1.3, 0.8);
  c.curve(cx, mid, cx + half * 0.2, top + 3, cx + half * 0.5, top + 1, 'e', 1, 0.7);
  c.fill((x, y) => {
    const u = (x + 0.5 - cx) / half;
    const v = y + 0.5 - top;
    if (Math.abs(u) > 1 + (c.noise(0, y, 2, salt + 1) - 0.5) * 0.3) return undefined;
    if (v < (c.noise(x, 1, 2.5, salt + 2) - 0.5) * 1.4 || v > 2.1 * (1 - u * u * 0.5) + (c.noise(x, 0, 2, salt) - 0.5) * 1.2) return undefined;
    return hash(x, y, salt + 3) < 0.08 ? undefined : 'e';
  });
}

const giraffe: Scene = {
  title: 'Giraffe at dusk',
  ...LARGE,
  draw(c) {
    // The evening sky in wavy bands: blue above, then purple, pink, and an orange glow at the horizon.
    c.fill((x, y) => {
      const t = y + (c.noise(x, y, 5, 501) - 0.5) * 3.5 + Math.sin(x / 4 + y / 3) * 0.7;
      return t < 5.5 ? 'b' : t < 10.5 ? 'p' : t < 16 ? 'k' : 'o';
    });
    // Long thin clouds: pink streaks in the purple, purple in the pink, yellow in the glow; the first stars.
    c.fill((x, y, now) => {
      const s = c.noise(x * 0.5, y * 2.2, 3, 502);
      if (now === 'p' && s > 0.66) return 'k';
      if (now === 'k' && s < 0.3) return 'p';
      if (now === 'o' && s > 0.62) return 'y';
      if (now === 'b' && hash(x, y, 503) < 0.06) return 'w';
      return undefined;
    });
    // The sun sinking at the horizon on the left.
    c.fill((x, y) => (ell(x, y, 10, 18.5, 2.6, 2.4) < 1 ? 'y' : undefined));
    // The ground: brown earth, lit orange in places, a few dark stones.
    const horizon = (x: number): number => 19 + c.noise(x, 0, 6, 504) * 1.6 + Math.sin(x / 5) * 0.4;
    c.fill((x, y) => {
      if (y + 0.5 < horizon(x)) return undefined;
      const h = hash(x, y, 505);
      return h < 0.08 ? 'o' : h < 0.12 ? 'c' : 'n';
    });
    acacia(c, 6, 11, 6, 20, 510);
    acacia(c, 37, 9, 5.5, 20, 520);
    // The giraffe, facing left: legs, body, the long neck up to the head at the top edge (drawn in Y, patched after).
    const feet: [number, number][] = [];
    for (const [x, lean] of [[19.5, -0.8], [22.2, 0.2], [31.2, -0.4], [34, 0.6]] as const) {
      c.curve(x, 17, x + lean * 0.3, 22, x + lean, 28.5, 'Y', 1.9, 1.4);
      feet.push([Math.floor(x + lean), 28]);
    }
    c.blob(27, 14.5, 9, 4.4, 'Y', undefined, undefined, 540, 0.12);
    c.blob(20.5, 13.2, 4, 4, 'Y', undefined, undefined, 541, 0.1);
    c.blob(34.5, 14.6, 3.4, 3.4, 'Y', undefined, undefined, 544, 0.1);
    c.curve(20.5, 12.5, 17, 6, 15.5, 2.8, 'Y', 4.4, 2.8);
    c.blob(13.8, 2.2, 3.4, 1.9, 'Y', undefined, undefined, 542, 0.1);
    c.blob(10.6, 3, 2, 1.4, 'Y', undefined, undefined, 543, 0.1);
    c.put(17, 1, 'Y');
    c.curve(37.5, 13.5, 38.5, 17, 38.5, 21, 'Y', 0.8, 0.6);
    // Brown patches with pale lines between them; the legs stay plain below the knee.
    c.fill((x, y, now) => (now === 'Y' && y < 21 && y > 1 && cellGap(x, y, 3, 550) > 0.7 ? 'n' : undefined));
    // The mane down the back of the neck, the horns, the eye, hooves and the tail tuft.
    c.fill((x, y, now) => (now === 'Y' && y > 3 && y < 12 && x > 15 && c.at(x + 1, y) !== 'Y' && c.at(x + 1, y) !== 'n' ? 'n' : undefined));
    for (const [x, y] of [[14, 0], [16, 0], [13, 2], [9, 3], [38, 21], [38, 22]] as const) c.put(x, y, 'c');
    settle(c, 'Y', 'y');
    // Dark green grass along the bottom, light tips catching the last light.
    c.fill((x, y) => {
      const top = 25 + (c.noise(x, 0, 3, 530) - 0.5) * 3 + (hash(x, 0, 531) < 0.3 ? -1.5 : 0) - Math.max(0, 4 - Math.min(x, 39 - x)) * 1.8;
      if (y + 0.5 < top) return undefined;
      return hash(x, y, 532) < 0.16 || (y + 0.5 < top + 1 && hash(x, y, 533) < 0.5) ? 'g' : 'd';
    });
    for (const [x, y] of feet) c.put(x, y, 'c');
  },
};

/** A cloud of bonsai leaves: dark below, lit above, with tufts of each colour in the other. */
function pad(c: Canvas, cx: number, cy: number, rx: number, ry: number, salt: number): void {
  c.fill((x, y) => {
    const d = ell(x, y, cx, cy, rx, ry) + (c.noise(x, y, 1.6, salt) - 0.5) * 0.5;
    if (d > 1) return undefined;
    const lit = (y + 0.5 - cy) / ry + ((x + 0.5 - cx) / rx) * 0.4 < -0.1 + (hash(x, y, salt + 1) - 0.5) * 0.6;
    const flip = hash(x, y, salt + 2) < 0.08;
    return lit !== flip ? 'g' : 'd';
  });
}

const bonsai: Scene = {
  title: 'Bonsai on the table',
  ...LARGE,
  draw(c) {
    // The warm wall: orange plaster clouded with yellow, and a round yellow paper window behind the tree flecked orange.
    c.fill((x, y) => {
      const v = c.noise(x, y, 4, 601) + c.noise(x, y, 1.5, 602) * 0.35;
      return ell(x, y, 20, 11.5, 13.5, 13) + (c.noise(x, y, 2, 603) - 0.5) * 0.08 < 1 ? (v > 0.95 ? 'o' : 'y') : v > 0.8 ? 'y' : 'o';
    });
    // The table: brown wood with dark grain.
    const edge = (x: number): number => 25.6 + (c.noise(x, 0, 6, 610) - 0.5) * 0.8;
    c.fill((x, y) => {
      if (y + 0.5 < edge(x)) return undefined;
      const g = frac((y + c.noise(x, y, 5, 611) * 2.5) / 1.8);
      return g < 0.22 && hash(x, y, 612) > 0.35 ? 'c' : 'n';
    });
    // Moss heaped in the pot.
    c.blob(20, 20.6, 7, 1.4, 'd', undefined, undefined, 620, 0.2);
    c.fill((x, y, now) => (now === 'd' && y < 21 && hash(x, y, 621) < 0.35 ? 'g' : undefined));
    // The trunk twisting up out of the moss, and the limbs out to the three leaf clouds.
    c.blob(21, 20.4, 2.5, 1, 'n', undefined, undefined, 622, 0.1);
    c.curve(21, 21, 13, 17, 17, 12.5, 'n', 2.6, 1.6);
    c.curve(17, 12.5, 22, 10, 21, 5, 'n', 1.6, 1);
    c.curve(16, 14, 12, 13.5, 9, 11.5, 'n', 1.2, 0.8);
    c.curve(19, 11, 25, 11, 29, 8.5, 'n', 1.2, 0.8);
    c.fill((x, y, now) => (now === 'n' && y < 21 && hash(x, y, 623) < 0.14 ? 'c' : undefined));
    pad(c, 8.5, 10.5, 8, 4.3, 630);
    pad(c, 21, 5, 9.2, 4.6, 640);
    pad(c, 31.2, 9.5, 8, 4.2, 650);
    // Red blossoms on the right side, a few with a pink petal; two fallen on the table.
    for (let i = 0; i < 16; i++) {
      const x = Math.round(24 + hash(i, 1, 660) * 11);
      const y = Math.round(3 + hash(i, 2, 660) * 8);
      if (c.at(x, y) !== 'd' && c.at(x, y) !== 'g') continue;
      c.put(x, y, 'r');
      if (hash(i, 3, 660) < 0.4) c.put(x + 1, y, 'k');
    }
    c.put(31, 27, 'r');
    c.put(34, 26, 'k');
    // The shallow blue pot: curved rim and foot, sky-blue glaze running down from the rim, a white glint.
    c.fill((x, y) => {
      const u = (x + 0.5 - 20) / 11;
      if (Math.abs(u) > 1 - (y + 0.5 - 21) * 0.04) return undefined;
      if (y + 0.5 < 21 + u * u * 0.8 || y + 0.5 > 25.8 - u * u * 0.9) return undefined;
      return y + 0.5 < 22.4 + u * u * 0.8 + hash(x, 0, 670) * 1.2 ? 's' : 'b';
    });
    c.put(12, 23, 'w');
    c.put(13, 24, 'w');
    for (const x of [12, 13, 26, 27]) c.put(x, 25, 'c');
    c.put(4, 21, 'e');
  },
};

const chameleon: Scene = {
  title: 'Chameleon on the move',
  ...LARGE,
  draw(c) {
    // The sky, deeper blue at the very top, with white clouds shaded grey underneath.
    c.fill((x, y) => (y + c.noise(x, 0, 5, 701) * 3 < 3 ? 'b' : y < 18 && c.noise(x, y, 5, 702) > 0.7 ? 'w' : 's'));
    c.fill((x, y, now) => (now === 'w' && c.at(x, y + 1) === 's' && hash(x, y, 703) < 0.6 ? 'e' : undefined));
    // Dark green leaves crowding into the four corners.
    const corners = [[0, 0], [40, 0], [0, 30], [40, 30]] as const;
    for (let i = 0; i < 28; i++) {
      const [kx, ky] = corners[i % 4]!;
      const r = 3 + hash(i, 1, 710) * 7;
      const a = (hash(i, 2, 710) * Math.PI) / 2;
      const cx = kx + (kx ? -1 : 1) * Math.cos(a) * r;
      const cy = ky + (ky ? -1 : 1) * Math.sin(a) * r;
      const col = i % 3 === 0 ? 'g' : 'd';
      leaf(c, cx, cy, 6 + hash(i, 4, 710) * 3, 2.4, Math.atan2(cy - ky, cx - kx) + (hash(i, 3, 710) - 0.5) * 0.8, col, col === 'g' ? 'd' : 'g');
    }
    // The branch across the picture, dark underneath, a twig rising on the right.
    const br = (x: number): number => 21 + Math.sin(x / 7) * 0.9 - x * 0.05 + (c.noise(x, 0, 3, 720) - 0.5) * 0.6;
    c.fill((x, y) => {
      const v = y + 0.5 - br(x);
      if (v < 0 || v > 2.8 + c.wobble(x, y, 721) * 0.4) return undefined;
      return v > 2 || hash(x, y, 722) < 0.12 ? 'c' : 'n';
    });
    c.curve(33, br(33), 36, 16, 39.5, 13, 'n', 1, 0.7);
    // The chameleon, drawn in O: body with a ridged back, the casqued head on the left, four gripping legs.
    c.blob(19.5, 13, 11.5, 6, 'O', undefined, undefined, 730, 0.08);
    for (let x = 10; x <= 28; x += 2) c.put(x, Math.round(13 - 6 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 19.5) / 11.5) ** 2))) - 1, 'O');
    c.poly([9.5, 8, 9.5, 18.5, 1.5, 15.6, 1, 13, 5.5, 8], 'O');
    c.poly([4.8, 8.8, 8, 4.8, 11, 8.8], 'O');
    for (const [x0, x1] of [[12, 10.5], [15.5, 16], [23.5, 24.5], [27, 28.4]] as const) {
      c.curve(x0, 18, x0 - 1, 19.6, x1, br(x1) + 0.2, 'O', 1.8, 1.3);
      c.put(Math.round(x1) - 1, Math.round(br(x1)), 'y');
      c.put(Math.round(x1) + 1, Math.round(br(x1)), 'y');
    }
    // The tail: out over the back, down past the branch, and curled into a spiral.
    const tail = sampled((t) => {
      if (t < 0.3) {
        const u = t / 0.3;
        return [(1 - u) ** 2 * 28.5 + 2 * u * (1 - u) * 36.5 + u * u * 35, (1 - u) ** 2 * 13 + 2 * u * (1 - u) * 10 + u * u * 20.5];
      }
      const a = -Math.PI / 2 + ((t - 0.3) / 0.7) * 3.4 * Math.PI;
      const r = 4 * (1 - ((t - 0.3) / 0.7) * 0.82);
      return [35 + Math.cos(a) * r, 24.5 + Math.sin(a) * r];
    });
    const len = tail[tail.length - 1]![2];
    tube(c, tail, (s) => 1.9 - (s / len) * 1.1, (s) => (frac(s / 3.2) < 0.3 ? 'r' : 'O'));
    // Markings: wavering red bands across the body, a yellow stripe low along the side, yellow spots.
    c.fill((x, y, now) => {
      if (now !== 'O' || x < 9) return undefined;
      if (y + 0.5 > 16.8 + (c.noise(x, y, 2, 740) - 0.5) * 1.4) return 'y';
      if (frac((x + c.noise(x, y, 2.5, 741) * 2.5) / 4) < 0.27) return 'r';
      return hash(x, y, 742) < 0.08 ? 'y' : undefined;
    });
    // The turret eye: a yellow-ringed cone with a dark pupil; the mouth line.
    c.fill((x, y) => {
      const d = ell(x, y, 6.6, 11.4, 2.3, 2.3);
      return d < 0.45 ? 'c' : d < 1 ? 'y' : undefined;
    });
    c.line(2, 15, 9, 16, 'r');
    settle(c, 'O', 'o');
  },
};

const flamingo: Scene = {
  title: 'Flamingo on one leg',
  ...LARGE,
  draw(c) {
    // Sky, the yellow sun top left with a broken orange halo, a white cloud top right shaded grey underneath.
    c.fill(() => 's');
    c.fill((x, y) => {
      const d = ell(x, y, 6, 5, 3.6, 3.6);
      return d < 1 ? 'y' : d < 1.4 && hash(x, y, 801) < 0.6 ? 'o' : undefined;
    });
    c.fill((x, y) => {
      const d = Math.min(ell(x, y, 33, 5, 6, 2), ell(x, y, 35.5, 3.3, 3.5, 2.2), ell(x, y, 30.5, 4, 2.8, 1.8)) + (c.noise(x, y, 1.5, 802) - 0.5) * 0.3;
      if (d > 1) return undefined;
      return y + 0.5 > 5.6 + (c.noise(x, 0, 2, 803) - 0.5) * 1.2 ? 'e' : 'w';
    });
    // The far shore: a low dark green treeline.
    c.fill((x, y) => (y + 0.5 > 13.4 - c.noise(x, 0, 2.5, 804) * 2 && y < 15 ? 'd' : undefined));
    // The shallows: blue with short sky-blue ripples and white glints; a muddy bank in front.
    c.fill((x, y) => {
      if (y < 15) return undefined;
      if (y + 0.5 > 28.2 + (c.noise(x, 0, 3, 813) - 0.5) * 1.6) return hash(x, y, 814) < 0.2 ? 'g' : 'n';
      const h = hash(Math.floor((x + hash(0, y, 811) * 7) / 3), y, 812);
      return h < 0.28 ? 's' : h > 0.97 ? 'w' : 'b';
    });
    // The reed beds crowding in at both sides.
    c.fill((x, y) => {
      const n = c.noise(0, y, 3, 815) * 2.5;
      if (y < 9 + hash(x, 0, 816) * 4 || (x > 3 + n && x < 36 - n)) return undefined;
      return frac((x + y * 0.15) / 2.3) < 0.45 ? 'd' : 'g';
    });
    // The flamingo, drawn in K: body and tail, the S of the neck, the head, the standing leg and the folded one.
    c.blob(24, 12.5, 9.5, 4.8, 'K', undefined, undefined, 820, 0.1);
    c.poly([31, 10, 37, 9, 36, 14.5, 31, 15.5], 'K');
    c.curve(17, 11.5, 9.5, 7, 13.5, 4.5, 'K', 3, 2.4);
    c.curve(13.5, 4.5, 17, 1, 12.5, 1.4, 'K', 2.4, 1.8);
    c.blob(11.5, 2, 2.6, 1.8, 'K', undefined, undefined, 821, 0.05);
    c.curve(24, 16, 23.6, 21, 23, 27.5, 'K', 1.7, 1.3);
    c.line(25, 16, 28, 19, 'K');
    c.line(28, 19, 25, 21, 'K');
    c.line(25, 17, 28, 20, 'K');
    // The beak, white with a dark bent tip; the eye.
    for (const [x, y, col] of [[9, 2, 'w'], [8, 2, 'w'], [8, 3, 'c'], [7, 3, 'c'], [7, 4, 'c'], [12, 1, 'c']] as const) c.put(x, y, col);
    // The wing: purple feathers edged in red, the black flight feathers at the tail.
    c.fill((x, y, now) => {
      if (now !== 'K') return undefined;
      const d = ell(x, y, 25, 12, 6, 3);
      return d < 0.75 ? 'p' : d < 1.05 && y > 11 ? 'r' : undefined;
    });
    for (const [x, y] of [[34, 11], [35, 11], [34, 12], [35, 12]] as const) c.put(x, y, 'c');
    // Ripples ringing the standing leg.
    c.fill((x, y, now) => (now === 'b' && Math.abs(ell(x, y, 23.5, 27.5, 4, 1) - 1) < 0.25 ? 's' : undefined));
    settle(c, 'K', 'k');
    // Reeds along both sides, some topped with brown seed heads.
    for (let i = 0; i < 26; i++) {
      const left = i % 2 === 0;
      const bx = left ? hash(i, 1, 840) * 7 : 33 + hash(i, 1, 840) * 7;
      const h = 9 + hash(i, 2, 840) * 11;
      const lean = (hash(i, 3, 840) - 0.5) * 4 + (left ? 0.8 : -0.8);
      const col = i % 3 === 0 ? 'd' : 'g';
      c.curve(bx, 30, bx + lean * 0.4, 30 - h * 0.5, bx + lean, 30 - h, col, 1, 0.6);
      if (hash(i, 4, 840) < 0.45) c.rect(Math.round(bx + lean), Math.round(30 - h), Math.round(bx + lean), Math.round(30 - h) + 2, 'n');
    }
  },
};

const jellyfish: Scene = {
  title: 'Jellyfish adrift',
  ...LARGE,
  overrides: { c: 'v' },
  draw(c) {
    // The water: light near the surface, shafts of light slanting down, navy in the deep.
    c.fill((x, y) => {
      const t = y + (c.noise(x, y, 6, 901) - 0.5) * 5;
      if (t < 5.5) return hash(x, y, 905) < 0.05 ? 'w' : 's';
      if (t > 21 && c.noise(x, y, 4, 902) > 0.4) return 'c';
      const ray = frac((x - y * 0.35 + c.noise(x, y, 8, 903) * 3) / 9);
      return ray < 0.16 && y < 20 - hash(x, 0, 904) * 6 ? 's' : 'b';
    });
    // The purple seabed with grey pebbles, a little green weed waving up from it.
    const bed = (x: number): number => 26.5 + (c.noise(x, 0, 5, 910) - 0.5) * 3;
    c.fill((x, y) => (y + 0.5 > bed(x) ? (hash(x, y, 911) < 0.1 ? 'e' : 'p') : undefined));
    for (const [bx, h] of [[3, 6], [5, 4], [33, 7], [35.5, 5], [37, 3]] as const)
      for (let y = 29; y > 29 - h - 1; y--) c.put(Math.round(bx + Math.sin(y / 1.6 + bx) * 0.8), Math.round(y - (29 - bed(bx)) * 0.2), 'g');
    // Specks drifting in the water.
    c.fill((x, y, now) => ((now === 'b' || now === 'c') && hash(x, y, 912) < 0.025 ? 'w' : undefined));
    // Long thin tentacles hanging from the rim, broken here and there.
    for (let k = 0; k < 10; k++) {
      const x0 = 10.5 + k * 2.1;
      const end = 25 + hash(k, 1, 920) * 4;
      for (let y = 12; y < end; y++) if (hash(k, y, 921) > 0.12) c.put(Math.round(x0 + Math.sin(y / 3 + k) * 1.3 + (y - 12) * (k - 4.5) * 0.04), y, 'k');
    }
    // Four frilly oral arms, white down the middle, pink and red frills.
    for (let k = 0; k < 4; k++) {
      const cx = 15.2 + k * 3.2;
      const end = 21 + hash(k, 2, 930) * 4;
      for (let y = 11; y < end; y++) {
        const x = Math.round(cx + Math.sin(y / 2.5 + k * 1.7) * 1.4);
        c.put(x, y, 'w');
        c.put(x - 1, y, y % 4 === 0 ? 'r' : 'k');
        c.put(x + 1, y, y % 4 === 2 ? 'r' : 'k');
      }
    }
    // The bell: a pink dome with a scalloped rim dotted red, a white sheen, four orange rings inside.
    const lip = (x: number): number => 12.4 + 1.3 * Math.abs(Math.sin((x + 0.5) * 0.75));
    c.fill((x, y) => {
      if (ell(x, y, 20, 10.5, 12.5, 9.5) > 1 || y + 0.5 > lip(x)) return undefined;
      if (y + 1.5 > lip(x)) return x % 2 ? 'r' : 'k';
      if (ell(x, y, 14.5, 4.8, 4, 2.2) < 1 && hash(x, y, 940) < 0.75) return 'w';
      for (const gx of [13.8, 18, 22, 26.2]) {
        const g = ell(x, y, gx, 9, 1.8, 1.5);
        if (g > 0.5 && g < 1.05) return 'o';
      }
      return frac((Math.atan2(y + 0.5 - 12, x + 0.5 - 20) * 8) / Math.PI) < 0.12 ? 'p' : 'k';
    });
  },
};

const monkey: Scene = {
  title: 'Snow monkey taking a bath',
  ...LARGE,
  draw(c) {
    // A grey winter sky over a snowy slope, dark pines crowded on it with snow on their boughs, snow falling.
    c.fill((x, y) => (y + c.noise(x, 0, 6, 1001) * 3 < 2.5 ? 'e' : 'w'));
    for (let i = 0; i < 14; i++) pine(c, i * 3.1 - 1 + hash(i, 1, 1002) * 2, 1 + hash(i, 2, 1002) * 6, 21, 2.8 + hash(i, 3, 1002) * 1.6, i % 4 === 3 ? 'g' : 'd');
    c.fill((x, y, now) => {
      if (now !== 'd' && now !== 'g') return undefined;
      if (frac((y + hash(Math.floor(x / 2), 0, 1003) * 3) / 3) < 0.18 && c.noise(x, y, 1.5, 1004) > 0.55) return 'w';
      return hash(x, y, 1005) < 0.05 ? 'w' : undefined;
    });
    // The rocks round the pool, capped with snow.
    const rim = (x: number): number => 21 + (c.noise(x, 0, 3, 1010) - 0.5) * 1.6;
    c.fill((x, y) => {
      const v = y + 0.5 - rim(x);
      if (v < 0 || v > 1.6 + hash(x, 0, 1011)) return undefined;
      return v < 0.7 && hash(x, y, 1012) < 0.6 ? 'w' : 'c';
    });
    // The hot pool: blue with sky-blue ripples.
    const pool = (x: number): number => rim(x) + 1.6 + hash(x, 0, 1011);
    c.fill((x, y) => {
      if (y + 0.5 < pool(x)) return undefined;
      return frac((x * 0.7 + Math.sin(y * 1.3) * 2 + y * 2.3) / 5) < 0.2 && hash(x, y, 1013) < 0.7 ? 's' : 'b';
    });
    // The monkey, drawn in E: a shaggy head and the shoulders just above the water.
    c.fill((x, y) => (ell(x, y, 20, 25, 16, 8.5) + (c.noise(x, y, 1.2, 1020) - 0.5) * 0.3 < 1 && y + 0.5 < pool(x) + 0.5 ? 'E' : undefined));
    c.blob(20, 10.8, 7.4, 6.9, 'E', undefined, undefined, 1021, 0.3);
    // Fur: dark strands, snow resting on the crown.
    c.fill((x, y, now) => (now === 'E' && y < 7 && hash(x, y, 1022) < 0.2 ? 'w' : now === 'E' && hash(x, y, 1023) < 0.06 ? 'c' : undefined));
    // The pink face with red cheeks, dark eyes and brow, the nose and mouth.
    c.fill((x, y) => (ell(x, y, 20, 11.5, 3.9, 3.3) < 1 ? 'k' : undefined));
    for (const [x, y, col] of [[17, 12, 'r'], [23, 12, 'r'], [18, 10, 'c'], [22, 10, 'c'], [19, 9, 'e'], [21, 9, 'e'], [20, 12, 'r'], [19, 14, 'c'], [20, 14, 'c'], [21, 14, 'c']] as const) c.put(x, y, col);
    settle(c, 'E', 'e');
    // Ripples round the shoulders, steam rising off the water.
    c.fill((x, y, now) => {
      const r = ell(x, y, 20, 24, 15, 2);
      if (now === 'b' && r > 0.85 && r < 1.2) return 's';
      const n = c.noise(x * 0.7, y * 1.4, 3, 1030);
      if (y > 20 && (now === 'b' || now === 's') && n > 0.7) return 'w';
      return undefined;
    });
  },
};

const nest: Scene = {
  title: 'Nest of blue eggs',
  ...LARGE,
  draw(c) {
    // Leaves everywhere, and a patch of sky at the top with a wisp of cloud.
    c.fill((x, y) => (c.noise(x, y, 4, 1100) > 0.5 ? 'g' : 'd'));
    for (let i = 0; i < 40; i++) {
      const [lx, ly] = [hash(i, 1, 1101) * 44 - 2, hash(i, 2, 1101) * 34 - 2];
      leaf(c, lx, ly, 5 + hash(i, 3, 1101) * 3, 2.2, hash(i, 4, 1101) * Math.PI, c.at(Math.round(lx), Math.round(ly)) === 'g' ? 'd' : 'g');
    }
    c.fill((x, y) => (Math.hypot((x + 0.5 - 22) / 12, (y + 1) / 6) + (c.noise(x, y, 2.5, 1102) - 0.5) * 0.7 < 1 ? 's' : undefined));
    c.fill((x, y, now) => (now === 's' && ell(x, y, 24, 1.5, 4, 0.9) < 1 ? 'w' : undefined));
    leaf(c, 14, 3, 6, 2.2, 0.4, 'g', 'd');
    leaf(c, 31, 4, 6, 2.2, 2.6, 'd', 'g');
    // A sprig of red berries low on the left.
    for (const [x, y] of [[4, 25], [5, 26], [3, 27], [6, 24], [35, 26], [36, 27]] as const) c.put(x, y, 'r');
    // The branch the nest sits in.
    c.curve(-1, 27, 18, 25, 41, 20, 'n', 1.6, 1.2);
    // The nest seen from a little above: woven strands round a dark cup lying towards the back.
    c.fill((x, y) => {
      const dx = x + 0.5 - 20;
      const r = Math.hypot(dx, (y + 0.5 - 17) / 0.62) + (c.noise(x, y, 1.3, 1110) - 0.5) * 1.2;
      if (r > 14) return undefined;
      const a = Math.atan2((y + 0.5 - 17) / 0.62, dx);
      if (Math.hypot(dx, (y + 0.5 - 15.8) / 0.62) < 9) return frac(a * 3 + r * 0.9 + c.noise(x, y, 2, 1111)) < 0.25 ? 'n' : 'c';
      const s = frac(a * 4 + r * 1.3 + c.noise(x, y, 2.5, 1112) * 1.5);
      return s < 0.35 ? 'n' : s < 0.6 ? 'o' : s < 0.72 ? 'y' : s < 0.85 ? 'n' : 'c';
    });
    // Loose straws sticking out of the rim.
    for (let i = 0; i < 14; i++) {
      const a = hash(i, 1, 1120) * 2 * Math.PI;
      const x0 = 20 + Math.cos(a) * 13;
      const y0 = 17 + Math.sin(a) * 8;
      c.line(Math.round(x0), Math.round(y0), Math.round(x0 + Math.cos(a) * 2.5), Math.round(y0 + Math.sin(a) * 1.8), i % 3 ? 'n' : 'y');
    }
    // Four blue eggs in the cup, each with a sky-blue highlight and a dark speckle.
    for (const [ex, ey] of [[15, 15.5], [20.5, 13], [26, 15.5], [20.5, 18.3]] as const) {
      c.fill((x, y) => (ell(x, y, ex, ey, 2.4, 1.7) < 1 ? 'b' : undefined));
      c.put(Math.round(ex) - 1, Math.round(ey) - 1, 's');
      c.put(Math.round(ex) + 1, Math.round(ey), 'c');
    }
  },
};

const crab: Scene = {
  title: 'Red crab on the sand',
  ...LARGE,
  draw(c) {
    // Sky and sea along the top, a line of foam, wet sand, then dry sand with wind ripples, specks and pebbles.
    const shore = (x: number): number => 7 + c.noise(x, 0, 5, 1201) * 1.5 + Math.sin(x / 4) * 0.5;
    c.fill((x, y) => {
      if (y < 2 + c.noise(x, 0, 5, 1202) * 1.5) return 's';
      if (y + 0.5 < shore(x) - 0.8) return frac((x + y * 3 + hash(0, y, 1203) * 9) / 6) < 0.3 ? 's' : 'b';
      if (y + 0.5 < shore(x)) return 'w';
      if (y + 0.5 < shore(x) + 1.5) return hash(x, y, 1204) < 0.5 ? 'o' : 'y';
      const rip = frac((y + c.noise(x, y, 6, 1205) * 3 + Math.sin(x / 3) * 0.4) / 3.2);
      const h = hash(x, y, 1206);
      return rip < 0.18 ? 'o' : h < 0.04 ? 'n' : h < 0.06 ? 'e' : 'y';
    });
    // Shells and seaweed on the sand.
    for (const [x, y, col] of [[3, 25, 'w'], [4, 25, 'w'], [3, 26, 'e'], [35, 27, 'k'], [36, 27, 'k'], [6, 12, 'p'], [7, 12, 'p'], [33, 10, 'g'], [34, 11, 'g'], [35, 11, 'd'], [36, 10, 'g'], [37, 28, 'c']] as const) c.put(x, y, col);
    // The crab's shadow on the sand.
    c.blob(20, 22, 12, 2.8, 'o', undefined, undefined, 1210, 0.15);
    // The crab, drawn in R, mirrored about the middle: legs, arms raised with open claws, eyes on stalks, the shell.
    for (const m of [(x: number) => x, (x: number) => 40 - x]) {
      for (let i = 0; i < 4; i++) {
        c.curve(m(12), 16.5 + i, m(7 - i * 0.6), 15.5 + i * 1.8, m(5.5 - i * 0.9), 21 + i * 2, 'R', 1.5, 1);
        c.put(Math.floor(m(5.5 - i * 0.9)), Math.round(21 + i * 2), 'c');
      }
      c.curve(m(12), 15, m(8), 13, m(7.5), 9.5, 'R', 2, 1.7);
      c.blob(m(7.5), 7.5, 3.7, 3, 'R', undefined, undefined, 1220, 0.1);
      c.curve(m(5.8), 6, m(4), 3.5, m(5.8), 1.5, 'R', 1.5, 1);
      c.curve(m(9.2), 6, m(10.5), 3.5, m(9), 1.8, 'R', 1.4, 0.9);
      c.curve(m(18), 11, m(17.6), 9.5, m(17), 7.8, 'R', 1, 1);
      c.fill((x, y) => (ell(x, y, m(16.9), 7, 1, 1) < 1 ? 'c' : undefined));
    }
    c.fill((x, y) => (ell(x, y, 20, 15.5, 11, 6) + (c.noise(x, y, 1.5, 1230) - 0.5) * 0.15 < 1 ? 'R' : undefined));
    // The shell: bumps lit orange on top, a dark lower rim, the mouth; claw tips dark, eye glints white.
    c.fill((x, y, now) => {
      if (now !== 'R') return undefined;
      if (y < 14 && hash(x, y, 1240) < 0.12) return 'o';
      if (y > 17 && x > 11 && x < 28 && c.at(x, y + 1) !== 'R') return 'c';
      return undefined;
    });
    for (const [x, y, col] of [[19, 20, 'n'], [20, 20, 'n'], [5, 1, 'c'], [34, 1, 'c'], [16, 6, 'w'], [23, 6, 'w']] as const) c.put(x, y, col);
    settle(c, 'R', 'r');
  },
};

const kingfisher: Scene = {
  title: 'Kingfisher on the dive',
  ...LARGE,
  draw(c) {
    // Leaves fill the background, sun flecks on the light ones, a couple of twigs and red berries.
    c.fill(() => 'd');
    for (let i = 0; i < 36; i++) {
      const col = i % 3 ? 'g' : 'd';
      leaf(c, 4 + hash(i, 1, 1301) * 32, 4 + hash(i, 2, 1301) * 20, 5 + hash(i, 3, 1301) * 3, 2.3, hash(i, 4, 1301) * Math.PI, col);
    }
    c.fill((x, y, now) => (now === 'g' && hash(x, y, 1302) < 0.05 ? 'y' : undefined));
    c.curve(-1, 6, 6, 4, 12, 0, 'n', 1, 0.7);
    c.curve(41, 18, 35, 16, 31, 20, 'n', 1, 0.7);
    for (const [x, y] of [[3, 18], [4, 19], [2, 20], [36, 4], [37, 5]] as const) c.put(x, y, 'r');
    // The water below: sky-blue with blue rings spreading where the beak points, white glints.
    const wl = (x: number): number => 26.5 + (c.noise(x, 0, 4, 1310) - 0.5) * 1.5;
    c.fill((x, y) => {
      if (y + 0.5 < wl(x)) return undefined;
      if (hash(x, y, 1311) < 0.06) return 'w';
      return frac(Math.hypot((x + 0.5 - 20) / 2, y + 0.5 - 28.5) / 1.6) < 0.3 ? 'b' : 's';
    });
    // The kingfisher from above, drawn in B: wings spread wide, the body, a short tail up top, the head down low.
    c.poly([16.5, 9.5, 9, 6, 0.5, 5, 0.5, 11, 5, 15, 11, 17.5, 16.5, 18], 'B');
    c.poly([23.5, 9.5, 31, 6, 39.5, 5, 39.5, 11, 35, 15, 29, 17.5, 23.5, 18], 'B');
    c.blob(20, 13, 3.9, 6.5, 'B', undefined, undefined, 1320, 0.05);
    c.poly([18.4, 8, 21.6, 8, 22, 2, 18, 2], 'B');
    c.blob(20, 20.8, 3.4, 3.2, 'B', undefined, undefined, 1321, 0.05);
    // Markings: the bright stripe down the back, sky-blue spots on the wings, dark tips on the flight feathers.
    c.fill((x, y, now) => {
      if (now !== 'B') return undefined;
      if ((x === 19 || x === 20) && y >= 4 && y <= 19) return 's';
      if (c.at(x, y + 1) !== 'B' && (x < 15 || x > 24) && x % 2 === 0) return 'c';
      if ((x < 16 || x > 23) && hash(x, y, 1330) < 0.22) return 's';
      return undefined;
    });
    // Orange cheeks and flanks, white patches behind the cheeks, the long dark beak.
    for (const [x, y, col] of [[17, 20, 'o'], [17, 21, 'o'], [22, 20, 'o'], [22, 21, 'o'], [16, 17, 'o'], [23, 17, 'o'], [17, 19, 'w'], [22, 19, 'w']] as const) c.put(x, y, col);
    c.poly([19, 23.3, 21, 23.3, 20, 27.6], 'c');
    settle(c, 'B', 'b');
  },
};

const snake: Scene = {
  title: 'Snake in the leaf litter',
  ...LARGE,
  draw(c) {
    // Dark soil and old brown litter, covered in fallen leaves of every autumn colour.
    c.fill((x, y) => (hash(x, y, 1402) < 0.06 ? 'c' : c.noise(x, y, 2, 1401) > 0.55 ? 'o' : 'n'));
    const hue = 'nnooyyrrgp';
    const vein: Record<string, string> = { n: 'o', o: 'n', y: 'o', r: 'n', g: 'y', p: 'n' };
    const fallen = (i: number, x: number, y: number, len: number, salt: number): void => {
      const col = hue[Math.floor(hash(i, 1, salt) * hue.length)]!;
      leaf(c, x, y, len, 1.8, hash(i, 4, salt) * Math.PI * 2, col, hash(i, 7, salt) < 0.5 ? vein[col] : undefined);
    };
    for (let i = 0; i < 75; i++) fallen(i, hash(i, 2, 1410) * 44 - 2, hash(i, 3, 1410) * 34 - 2, 3 + hash(i, 5, 1410) * 2, 1410);
    // The coral snake winding through: wide red bands, narrow yellow, black; a black snout behind a yellow collar.
    const body = sampled((t) => [1 + 33 * t, 15 + 7 * Math.sin(t * Math.PI * 2.1 + 0.4) + 1.5 * Math.sin(t * 9)]);
    const len = body[body.length - 1]![2];
    tube(
      c,
      body,
      (s) => Math.min(1.7, 0.6 + s / 6),
      (s) => {
        const h = len - s;
        if (h < 2) return 'c';
        const u = (h - 2) % 7.5;
        return u < 1 ? 'y' : u < 3 ? 'c' : u < 4 ? 'y' : 'r';
      },
    );
    // Leaves fallen across the snake, so that only parts of it show.
    for (let i = 0; i < 4; i++) {
      const [x, y] = body[Math.floor(hash(i, 6, 1420) * body.length)]!;
      fallen(i, x, y, 3.5, 1420);
    }
  },
};

/** The scenes, in the order of the levels they make. */
export const SCENES: readonly Scene[] = [
  {
    title: 'Mushroom house',
    draw: (c) => {
      c.cloud(1, 1, 7);
      c.cloud(24, 3, 7);
      c.ground(19, 0.8);
      c.ellipse(16, 10, 13, 7, 'r', 'n');
      c.rect(2, 11, 30, 17, 's');
      for (let x = 4; x <= 28; x++) {
        c.put(x, 11, 'r');
        c.put(x, 12, 'n');
      }
      c.rect(8, 13, 24, 20, 'y');
      c.rect(8, 13, 24, 13, 'o');
      c.rect(14, 15, 18, 20, 'n');
      c.put(17, 18, 'y');
      c.rect(10, 15, 12, 17, 'w');
      c.put(11, 16, 'b');
      c.rect(20, 15, 22, 17, 'w');
      c.put(21, 16, 'b');
      for (const [x, y] of [[9, 6], [15, 4], [21, 6], [12, 9], [19, 9], [25, 9], [6, 9]] as const) c.rect(x, y, x + 1, y + 1, 'w');
      c.scatter('rykw', 12, 20, 23, 'gd');
    },
  },
  {
    title: 'Sailboat',
    draw: (c) => {
      c.cloud(2, 2, 8);
      c.cloud(20, 1, 9);
      c.rect(0, 15, 31, 23, 'b');
      c.ellipse(28, 15, 6, 3, 'g', 'd');
      c.rect(22, 15, 31, 18, 'b');
      for (let y = 3; y <= 13; y++) {
        const main = Math.floor(((y - 3) * 8) / 10);
        c.rect(17, y, 17 + main, y, 'w');
        c.put(17 + main, y, 'e');
        if (y >= 6) c.rect(15 - Math.floor(((y - 6) * 5) / 7), y, 15, y, y % 2 ? 'w' : 'e');
      }
      c.rect(16, 3, 16, 14, 'c');
      c.rect(17, 2, 19, 3, 'r');
      for (let y = 14; y <= 16; y++) c.rect(8 + (y - 14), y, 24 - (y - 14), y, y === 16 ? 'c' : 'n');
      c.scatter('w', 16, 17, 23, 'b');
    },
  },
  {
    title: 'Snowman',
    draw: (c) => {
      c.cloud(12, 1, 8);
      c.ground(18, 0.8, 'w', 'w');
      c.scatter('e', 18, 19, 23, 'w');
      c.triangle(4, 6, 19, 4, 'g', 'd');
      c.rect(4, 20, 4, 21, 'n');
      c.triangle(27, 8, 19, 4, 'g', 'd');
      c.rect(27, 20, 27, 21, 'n');
      c.ellipse(16, 17, 5, 4, 'w', 'e');
      c.ellipse(16, 10, 3, 3, 'w', 'e');
      c.rect(13, 13, 19, 13, 'r');
      c.put(18, 14, 'r');
      c.rect(14, 4, 18, 7, 'c');
      c.rect(13, 7, 19, 7, 'c');
      c.put(15, 9, 'c');
      c.put(17, 9, 'c');
      c.rect(16, 10, 18, 10, 'o');
      for (const y of [16, 18, 20]) c.put(16, y, 'c');
      c.scatter('w', 14, 0, 12, 's');
    },
  },
  {
    title: 'Cactus',
    draw: (c) => {
      c.ellipse(25, 4, 4, 4, 'y', 'o');
      c.cloud(2, 3, 8);
      c.ground(16, 1, 'y', 'o');
      c.rect(14, 5, 17, 20, 'g');
      c.rect(17, 5, 17, 20, 'd');
      c.rect(9, 9, 10, 14, 'g');
      c.rect(9, 14, 14, 15, 'g');
      c.rect(10, 9, 10, 15, 'd');
      c.rect(21, 7, 22, 12, 'g');
      c.rect(17, 12, 22, 13, 'g');
      c.rect(22, 7, 22, 13, 'd');
      for (let y = 6; y <= 19; y += 2) c.put(15, y, 'd');
      c.flower(15, 4, 'k', 'y');
      c.ellipse(5, 20, 3, 2, 'n', 'c');
      c.ellipse(27, 21, 2, 1, 'n', 'c');
      c.scatter('no', 14, 17, 23, 'y');
    },
  },
  {
    title: 'Lighthouse',
    draw: (c) => {
      c.cloud(14, 2, 8);
      c.cloud(24, 6, 6);
      c.rect(0, 17, 31, 23, 'b');
      c.ellipse(9, 21, 9, 5, 'e', 'c');
      for (let y = 6; y <= 17; y++) {
        const stripe = Math.floor((y - 6) / 2) % 2 === 0 ? 'r' : 'w';
        c.rect(7, y, 11, y, stripe);
        c.put(11, y, stripe === 'r' ? 'n' : 'e');
      }
      c.rect(7, 4, 11, 5, 'y');
      c.put(9, 4, 'w');
      c.triangle(9, 1, 3, 3, 'c');
      c.rect(8, 12, 9, 13, 'b');
      for (let x = 13; x <= 30; x += 3) c.put(x, 4 + Math.floor((x - 13) / 6), 'y');
      c.put(26, 12, 'c');
      c.put(25, 11, 'c');
      c.put(27, 11, 'c');
      c.scatter('w', 16, 18, 23, 'b');
    },
  },
  {
    title: 'Apple tree',
    draw: (c) => {
      c.cloud(2, 2, 8);
      c.cloud(22, 4, 7);
      c.ground(17);
      c.rect(14, 11, 17, 20, 'n');
      c.rect(15, 11, 15, 19, 'c');
      c.ellipse(16, 8, 11, 7, 'g', 'd');
      for (const [x, y] of [[10, 6], [19, 5], [14, 10], [22, 9], [8, 10], [17, 7]] as const) {
        c.rect(x, y, x + 1, y + 1, 'r');
        c.put(x, y, 'w');
      }
      c.scatter('ryw', 14, 18, 23, 'gd');
    },
  },
  {
    title: 'Cottage',
    draw: (c) => {
      c.cloud(19, 1, 8);
      c.ground(18);
      c.ellipse(26, 9, 5, 6, 'g', 'd');
      c.rect(26, 14, 27, 19, 'n');
      c.rect(4, 11, 20, 19, 'y');
      c.rect(20, 11, 20, 19, 'o');
      c.triangle(12, 3, 11, 10, 'r', 'n');
      c.rect(16, 3, 17, 6, 'c');
      c.rect(6, 13, 9, 16, 'b');
      c.rect(6, 14, 9, 14, 'w');
      c.rect(7, 13, 7, 16, 'w');
      c.rect(15, 13, 18, 16, 'b');
      c.rect(15, 14, 18, 14, 'w');
      c.rect(16, 13, 16, 16, 'w');
      c.rect(11, 14, 13, 19, 'n');
      c.put(13, 17, 'y');
      for (let x = 0; x <= 31; x += 2) c.rect(x, 20, x, 21, x > 3 && x < 21 ? 'w' : 'e');
      c.rect(0, 20, 31, 20, 'w');
      c.scatter('ryw', 20, 21, 23, 'gd');
      c.scatter('r', 6, 4, 12, 'gd');
    },
  },
  {
    title: 'Bee in the meadow',
    draw: (c) => {
      c.cloud(1, 1, 7);
      c.cloud(23, 2, 8);
      c.ground(12, 1);
      const petals = 'rkpy';
      for (let i = 0; i < 9; i++) {
        const x = 2 + Math.floor(c.rng() * 28);
        const y = 15 + Math.floor(c.rng() * 7);
        c.flower(x, y, petals[i % petals.length] as string, i % 2 ? 'o' : 'y');
      }
      c.ellipse(14, 8, 4, 2, 'w', 'e');
      c.ellipse(19, 7, 3, 2, 'w', 'e');
      c.ellipse(16, 11, 5, 3, 'y', 'o');
      for (const x of [14, 17]) c.rect(x, 9, x, 13, 'c');
      c.put(21, 11, 'c');
      c.put(10, 11, 'c');
      c.scatter('rkyw', 22, 13, 23, 'gd');
    },
  },
  {
    title: 'Fruit on a branch',
    draw: (c) => {
      c.cloud(2, 18, 8);
      c.cloud(23, 20, 7);
      c.cloud(14, 1, 6);
      for (let x = 0; x < SCENE_WIDTH; x++) {
        const y = 4 + Math.floor((x * 5) / 31);
        c.rect(x, y, x, y + 1, 'n');
        if (x % 3 === 0) c.put(x, y + 1, 'c');
      }
      for (const [x, y] of [[5, 2], [24, 4], [16, 9]] as const) c.ellipse(x, y, 4, 2, 'g', 'd');
      for (const [x, y] of [[10, 13], [22, 14]] as const) {
        c.rect(x, y - 6, x, y - 5, 'n');
        c.ellipse(x, y, 6, 5, 'o', 'r', 'y');
        c.put(x - 2, y - 2, 'w');
      }
    },
  },
  {
    title: 'Night village',
    draw: (c) => {
      c.rect(0, 0, 31, 23, 'b');
      c.ellipse(24, 5, 4, 4, 'w', 'e');
      c.put(23, 4, 'e');
      c.put(25, 7, 'e');
      c.scatter('yw', 30, 0, 12, 'b');
      c.ellipse(8, 22, 14, 8, 'g', 'd');
      c.ellipse(26, 23, 12, 7, 'd', 'g');
      for (const [x, y, w] of [[4, 15, 5], [13, 16, 4], [21, 17, 5]] as const) {
        c.triangle(x + Math.floor(w / 2), y - 3, y - 1, Math.ceil(w / 2), 'r', 'n');
        c.rect(x, y, x + w - 1, y + 3, 'n');
        c.put(x + 1, y + 1, 'y');
        c.put(x + w - 2, y + 1, 'y');
        c.rect(x + Math.floor(w / 2), y + 2, x + Math.floor(w / 2), y + 3, 'c');
      }
      c.triangle(29, 11, 18, 2, 'd', 'c');
      c.scatter('yp', 12, 19, 23, 'gd');
    },
  },
  {
    title: 'Hot-air balloon',
    draw: (c) => {
      c.cloud(1, 3, 8);
      c.cloud(23, 13, 7);
      c.ground(19, 1.2);
      c.ellipse(15, 7, 6, 6, 'r', 'n');
      for (let y = 1; y <= 13; y++)
        for (const x of [12, 13, 17, 18]) {
          if (c.at(x, y) === 'r') c.put(x, y, 'y');
          else if (c.at(x, y) === 'n') c.put(x, y, 'o');
        }
      c.put(12, 13, 'c');
      c.put(12, 14, 'c');
      c.put(18, 13, 'c');
      c.put(18, 14, 'c');
      c.rect(12, 15, 18, 16, 'n');
      c.rect(12, 15, 18, 15, 'o');
      c.ellipse(26, 5, 3, 3, 'b');
      for (let y = 2; y <= 8; y++) for (const x of [25, 27]) if (c.at(x, y) === 'b') c.put(x, y, 'w');
      c.put(25, 9, 'c');
      c.put(27, 9, 'c');
      c.rect(25, 10, 27, 10, 'n');
      c.scatter('ryw', 14, 20, 23, 'gd');
    },
  },
  {
    title: 'Windmill',
    draw: (c) => {
      c.cloud(18, 1, 8);
      c.cloud(26, 7, 6);
      c.ground(14, 0.6);
      for (let y = 16; y <= 22; y += 2)
        for (let x = (y / 2) % 2; x < SCENE_WIDTH; x += 2) c.put(x, y, 'rkyp'[(y - 16) / 2] as string);
      for (let y = 6; y <= 17; y++) {
        const half = 1 + Math.floor((y - 6) / 4);
        c.rect(9 - half, y, 9 + half, y, 'w');
        c.put(9 + half, y, 'e');
      }
      c.triangle(9, 3, 5, 2, 'n');
      c.rect(9, 15, 9, 17, 'n');
      c.put(9, 11, 'y');
      for (let i = 1; i <= 6; i++) {
        c.put(9 + i, 6 - i, 'n');
        c.put(10 + i, 6 - i, 'w');
        c.put(9 - i, 6 - i, 'n');
        c.put(9 - i, 7 - i, 'e');
        c.put(9 + i, 6 + i, 'n');
        c.put(9 + i, 5 + i, 'e');
        c.put(9 - i, 6 + i, 'n');
        c.put(8 - i, 6 + i, 'w');
      }
      c.put(9, 6, 'n');
    },
  },
  {
    title: 'Ladybird on a leaf',
    draw: (c) => {
      c.cloud(1, 1, 7);
      c.cloud(22, 1, 8);
      c.ellipse(16, 12, 15, 8, 'g', 'd');
      c.ellipse(28, 21, 5, 3, 'd', 'g');
      for (let x = 0; x <= 2; x++) c.put(x, 13, 'n');
      for (let x = 2; x <= 30; x++) c.put(x, 13 - Math.round((x - 2) / 14), 'd');
      for (const x0 of [6, 12, 24]) for (let i = 1; i <= 3; i++) {
        c.put(x0 + i, 12 - i, 'd');
        c.put(x0 + i, 13 + i, 'd');
      }
      c.ellipse(18, 11, 5, 4, 'r', 'n');
      c.rect(18, 7, 18, 15, 'c');
      c.ellipse(18, 6, 2, 1, 'c');
      c.put(17, 6, 'w');
      c.put(19, 6, 'w');
      for (const [x, y] of [[16, 4], [15, 3], [20, 4], [21, 3], [12, 10], [13, 11], [24, 10], [23, 11], [12, 13], [24, 13]] as const) c.put(x, y, 'c');
      for (const [x, y] of [[15, 9], [21, 9], [16, 13], [20, 13]] as const) c.rect(x, y, x, y + 1, 'c');
      for (const [x, y] of [[6, 9], [27, 14], [9, 16]] as const) {
        c.rect(x, y, x + 1, y + 1, 'w');
        c.put(x + 1, y + 1, 'e');
      }
    },
  },
  {
    title: 'Beach umbrella',
    draw: (c) => {
      c.ellipse(4, 3, 3, 3, 'y', 'o');
      c.cloud(10, 0, 7);
      c.cloud(25, 4, 6);
      c.rect(0, 10, 31, 15, 'b');
      c.scatter('w', 12, 10, 14, 'b');
      c.ground(15, 0.6, 'y', 'o');
      for (let y = 5; y <= 9; y++) {
        const half = [3, 5, 6, 7, 8][y - 5] as number;
        for (let x = 18 - half; x <= 18 + half; x++) c.put(x, y, Math.floor((x + 1) / 3) % 2 ? 'r' : 'k');
      }
      for (let x = 10; x <= 26; x += 2) c.put(x, 9, 's');
      c.put(18, 4, 'n');
      c.rect(18, 10, 18, 19, 'n');
      for (let x = 4; x <= 10; x++) c.rect(x, 18, x, 20, x % 2 ? 'k' : 'w');
      c.ellipse(25, 19, 1, 1, 'r');
      c.put(25, 19, 'w');
      for (const [x, y] of [[21, 4], [22, 3], [23, 4], [27, 1], [28, 0], [29, 1]] as const) c.put(x, y, 'c');
      c.scatter('kw', 8, 17, 23, 'yo');
    },
  },
  {
    title: 'Castle',
    draw: (c) => {
      c.cloud(12, 1, 7);
      c.ground(19, 0.8);
      c.rect(8, 9, 23, 19, 'e');
      for (let x = 8; x <= 23; x += 2) c.put(x, 8, 'e');
      for (const [x0, x1] of [[3, 9], [22, 28]] as const) {
        c.rect(x0, 6, x1, 19, 'e');
        c.rect(x1, 6, x1, 19, 'c');
        c.triangle((x0 + x1) / 2, 2, 5, 4, 'r', 'n');
        c.rect((x0 + x1) / 2, 0, (x0 + x1) / 2, 1, 'n');
        c.rect((x0 + x1) / 2 + 1, 0, (x0 + x1) / 2 + 2, 0, 'y');
        c.rect((x0 + x1) / 2 - 1, 9, (x0 + x1) / 2, 10, 'y');
      }
      for (let y = 10; y <= 18; y += 2) for (let x = 9 + (y % 4 === 0 ? 0 : 2); x <= 21; x += 4) c.put(x, y, 'c');
      for (const x of [11, 19]) {
        c.rect(x, 10, x + 1, 14, 'p');
        c.put(x, 12, 'y');
        c.put(x + 1, 14, 's');
      }
      c.rect(14, 13, 17, 19, 'n');
      c.put(14, 13, 'e');
      c.put(17, 13, 'e');
      c.rect(15, 14, 15, 19, 'c');
      c.rect(0, 21, 31, 22, 'b');
      c.rect(14, 20, 17, 22, 'n');
      c.scatter('w', 6, 21, 22, 'b');
    },
  },
  {
    title: 'Coral reef',
    draw: (c) => {
      c.rect(0, 0, 31, 23, 'b');
      for (let y = 0; y <= 4; y++) for (let x = 0; x < SCENE_WIDTH; x++) if (y < 2 || (y < 4 && (x + y) % 2 === 0) || (y === 4 && x % 4 === 0)) c.put(x, y, 's');
      c.ground(19, 1.2, 'y', 'o');
      for (const x0 of [2, 7, 27, 30])
        for (let y = 8 + (x0 % 5); y <= 21; y++) c.put(x0 + Math.round(Math.sin(y / 2)), y, y % 2 ? 'g' : 'd');
      c.rect(13, 14, 13, 21, 'k');
      c.rect(11, 12, 11, 17, 'k');
      c.rect(15, 11, 15, 17, 'k');
      c.rect(11, 17, 15, 17, 'k');
      for (const [x, y] of [[11, 12], [15, 11], [13, 14], [12, 17], [14, 19]] as const) c.put(x, y, 'p');
      c.ellipse(22, 19, 4, 3, 'p', 'r');
      c.ellipse(9, 7, 3, 2, 'o', 'r');
      for (const [x, y] of [[5, 6], [5, 8], [6, 7], [5, 7]] as const) c.put(x, y, 'o');
      for (let y = 5; y <= 9; y++) if ('or'.includes(c.at(9, y) as string)) c.put(9, y, 'w');
      c.put(11, 6, 'c');
      c.ellipse(23, 10, 3, 2, 'y', 'o');
      for (const [x, y] of [[27, 9], [27, 11], [26, 10], [27, 10]] as const) c.put(x, y, 'y');
      for (let y = 8; y <= 12; y++) if ('yo'.includes(c.at(24, y) as string)) c.put(24, y, 'c');
      c.put(21, 9, 'c');
      for (const [x, y] of [[12, 4], [13, 2], [12, 0], [20, 7], [19, 5]] as const) c.put(x, y, 'w');
      c.scatter('w', 8, 0, 16, 'bs');
    },
  },
  {
    title: 'Pumpkin patch',
    draw: (c) => {
      c.cloud(2, 2, 8);
      c.cloud(15, 4, 6);
      c.ground(14, 0.6);
      for (let x = 0; x < SCENE_WIDTH; x++) {
        c.put(x, 11, 'n');
        c.put(x, 13, 'n');
        if (x % 4 === 1) c.rect(x, 10, x, 15, 'n');
      }
      c.rect(27, 9, 28, 15, 'n');
      c.ellipse(27, 5, 5, 5, 'o', 'r', 'y');
      c.scatter('yor', 10, 16, 23, 'gd');
      for (const [x, y, rx, ry] of [[8, 18, 5, 3], [20, 19, 4, 3], [14, 21, 2, 2], [27, 21, 3, 2]] as const) {
        c.ellipse(x, y, rx, ry, 'o', 'r', 'y');
        for (let yy = y - ry + 1; yy <= y + ry - 1; yy++) if (c.at(x, yy) === 'o') c.put(x, yy, 'r');
        c.rect(x, y - ry - 1, x, y - ry, 'n');
        c.put(x + 1, y - ry - 1, 'd');
      }
      for (const [x, y] of [[14, 10], [15, 10], [15, 9]] as const) c.put(x, y, 'c');
      c.put(16, 9, 'o');
    },
  },
  {
    title: 'Steam train',
    draw: (c) => {
      c.cloud(19, 1, 8);
      c.ellipse(6, 16, 10, 6, 'g', 'd');
      c.ellipse(26, 17, 9, 5, 'g', 'd');
      c.ground(20, 0);
      c.rect(0, 19, 31, 19, 'c');
      for (let x = 0; x < SCENE_WIDTH; x += 3) c.put(x, 20, 'n');
      c.rect(2, 12, 11, 17, 'r');
      c.rect(11, 12, 11, 17, 'n');
      c.rect(1, 13, 1, 16, 'c');
      c.rect(8, 9, 12, 17, 'b');
      c.rect(7, 8, 13, 8, 'c');
      c.rect(9, 10, 11, 12, 'w');
      c.rect(3, 9, 4, 11, 'c');
      c.rect(2, 8, 5, 8, 'c');
      c.ellipse(5, 5, 2, 2, 'w', 'e');
      c.ellipse(9, 3, 3, 2, 'w', 'e');
      c.ellipse(14, 1, 3, 1, 'w', 'e');
      c.rect(12, 16, 14, 16, 'c');
      c.rect(14, 12, 21, 17, 'y');
      c.rect(21, 12, 21, 17, 'o');
      c.rect(14, 11, 21, 11, 'o');
      c.rect(23, 12, 31, 17, 'b');
      c.rect(23, 11, 31, 11, 'c');
      for (const x of [15, 18, 24, 27, 30]) c.rect(x, 13, x + 1, 14, 'w');
      for (const x of [3, 6, 10, 16, 20, 25, 29]) {
        c.ellipse(x, 18, 1.5, 1.5, 'c');
        c.put(x, 18, 'e');
      }
    },
  },
  {
    title: 'Butterfly on a sunflower',
    draw: (c) => {
      c.ground(20, 1);
      c.rect(8, 12, 9, 23, 'd');
      c.ellipse(5, 16, 3, 1, 'g', 'd');
      c.ellipse(12, 18, 3, 1, 'g', 'd');
      for (let k = 0; k < 8; k++) c.put(Math.round(8 + 7 * Math.cos((k * Math.PI) / 4)), Math.round(8 + 7 * Math.sin((k * Math.PI) / 4)), 'y');
      c.ellipse(8, 8, 6, 6, 'y', 'o');
      c.ellipse(8, 8, 3, 3, 'n', 'c');
      c.ellipse(19, 7, 4, 3, 'p', 'b');
      c.ellipse(27, 7, 4, 3, 'p', 'b');
      c.ellipse(20, 12, 3, 2, 'k', 'p');
      c.ellipse(26, 12, 3, 2, 'k', 'p');
      for (const [x, y] of [[18, 6], [28, 6], [19, 12], [27, 12]] as const) c.put(x, y, 'w');
      c.rect(23, 6, 23, 13, 'c');
      for (const [x, y] of [[22, 5], [21, 4], [24, 5], [25, 4]] as const) c.put(x, y, 'c');
      c.scatter('kwp', 14, 21, 23, 'gd');
    },
  },
  {
    title: 'Mountain lake at sunset',
    draw: (c) => {
      for (let y = 0; y <= 14; y++)
        for (let x = 0; x < SCENE_WIDTH; x++) {
          const odd = (x + y) % 2 === 0;
          c.put(x, y, y < 3 ? 'p' : y < 5 ? (odd ? 'p' : 'k') : y < 8 ? 'k' : y < 10 ? (odd ? 'k' : 'o') : 'o');
        }
      c.ellipse(16, 11, 3, 3, 'y', 'o');
      c.triangle(8, 2, 14, 11, 'n', 'c');
      c.triangle(24, 4, 14, 10, 'e', 'c');
      for (let y = 2; y <= 6; y++)
        for (let x = 0; x < SCENE_WIDTH; x++) {
          const snow = (x < 16 && y <= 5) || (x >= 16 && y >= 4);
          const ch = c.at(x, y);
          if (snow && (ch === 'n' || ch === 'e')) c.put(x, y, 'w');
          if (snow && ch === 'c' && x < 16) c.put(x, y, 'e');
        }
      c.rect(0, 14, 31, 14, 'd');
      for (const x of [2, 6, 21, 29]) c.triangle(x, 10, 13, 1, 'd');
      c.rect(0, 15, 31, 23, 'b');
      for (let y = 15; y <= 23; y++)
        for (let x = 0; x < SCENE_WIDTH; x++) {
          const src = c.at(x, 29 - y) as string;
          if ('ncwedy'.includes(src) && (y < 20 || (x + y) % 2 === 0)) c.put(x, y, src);
        }
      c.scatter('s', 10, 16, 23, 'b');
    },
  },
  // From here the scenes are LARGE: 40 × 30, with shading, texture and scattered detail everywhere.
  {
    title: 'Teapot and cup',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 17, 's', 'w');
      c.dots(0, 0, 39, 17, 'k', 'sw', 6);
      c.rect(0, 18, 39, 29, 'n');
      c.bricks(0, 22, 39, 29, 'c', 'n', 10, 3);
      c.rect(0, 18, 39, 21, 'r');
      c.dots(0, 18, 39, 21, 'w', 'r', 2);
      c.ellipse(16, 12, 8, 6, 'b', 'p', 'w');
      c.ellipse(16, 6, 3, 1, 'b', 'p');
      c.rect(16, 4, 16, 5, 'y');
      c.line(23, 11, 28, 6, 'b');
      c.line(23, 12, 28, 7, 'b');
      c.line(8, 8, 5, 10, 'b');
      c.line(5, 10, 5, 14, 'b');
      c.line(5, 14, 8, 16, 'b');
      c.flower(13, 12, 'k', 'y');
      c.flower(19, 13, 'k', 'y');
      c.rect(29, 13, 36, 17, 'w');
      c.rect(34, 13, 36, 17, 'e');
      c.rect(37, 14, 37, 16, 'w');
      c.rect(28, 18, 37, 18, 'e');
      c.line(31, 11, 32, 9, 'e');
      c.line(34, 11, 35, 9, 'e');
      c.line(29, 4, 30, 2, 'e');
      c.scatter('oy', 10, 22, 29, 'n');
    },
  },
  {
    title: 'Rocket launch',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 29, 'b', 's');
      c.scatter('w', 30, 0, 20, 'bs');
      c.ellipse(33, 5, 3, 3, 'y', 'o');
      c.rect(0, 28, 39, 29, 'c');
      c.dots(0, 28, 39, 29, 'e', 'c', 3);
      c.rect(8, 6, 10, 27, 'e');
      c.bricks(8, 6, 10, 27, 'c', 'e', 3, 2);
      c.ellipse(12, 27, 7, 3, 'e', 'c', 'w');
      c.ellipse(27, 27, 7, 3, 'e', 'c', 'w');
      c.ellipse(19, 25, 4, 3, 'o', 'r');
      c.ellipse(19, 21, 3, 2, 'y', 'o');
      c.rect(14, 15, 16, 19, 'r');
      c.rect(23, 15, 25, 19, 'r');
      c.rect(17, 4, 22, 18, 'w');
      c.rect(21, 4, 22, 18, 'e');
      c.triangle(19, 1, 4, 3, 'r', 'n');
      c.rect(17, 13, 22, 13, 'r');
      c.ellipse(19, 9, 2, 2, 'c');
      c.ellipse(19, 9, 1, 1, 's', 'b');
      c.rect(17, 19, 22, 19, 'c');
    },
  },
  {
    title: 'Fox in autumn woods',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 13, 's', 'k');
      c.ground(21, 1, 'y', 'o');
      c.dots(0, 21, 39, 29, 'r', 'yo', 4);
      c.rect(3, 8, 5, 22, 'n');
      c.rect(34, 6, 36, 22, 'n');
      c.rect(12, 10, 13, 20, 'n');
      c.dots(3, 8, 5, 22, 'c', 'n', 4);
      c.dots(34, 6, 36, 22, 'c', 'n', 4);
      c.ellipse(4, 7, 6, 5, 'r', 'n', 'o');
      c.ellipse(35, 6, 6, 6, 'o', 'r', 'y');
      c.ellipse(13, 9, 5, 4, 'y', 'o');
      c.ellipse(13, 21, 4, 2, 'o', 'r');
      c.rect(9, 20, 10, 22, 'w');
      c.ellipse(20, 22, 6, 3, 'o', 'r', 'w');
      c.rect(17, 25, 18, 27, 'c');
      c.rect(22, 25, 23, 27, 'c');
      c.ellipse(27, 19, 3, 3, 'o', 'r');
      c.rect(25, 15, 25, 16, 'o');
      c.rect(29, 15, 29, 16, 'o');
      c.rect(28, 20, 29, 21, 'w');
      c.put(30, 21, 'c');
      c.put(27, 18, 'c');
      c.scatter('ry', 14, 0, 19, 'sk');
      c.scatter('n', 10, 22, 29, 'yo');
    },
  },
  {
    title: 'Ice cream cone',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 29, 'k', 'w');
      c.dots(0, 0, 39, 29, 'y', 'kw', 5);
      for (let y = 15; y <= 29; y++) {
        const half = Math.round((6 * (29 - y)) / 14);
        c.rect(20 - half, y, 20 + half, y, 'n');
      }
      c.bricks(14, 15, 26, 29, 'o', 'n', 3, 2);
      c.ellipse(20, 12, 8, 4, 'k', 'p', 'w');
      c.ellipse(15, 7, 5, 4, 'w', 'e');
      c.ellipse(25, 7, 5, 4, 'n', 'c', 'o');
      c.ellipse(20, 3, 5, 3, 'g', 'd', 'w');
      c.scatter('ry', 10, 4, 10, 'w');
      c.put(20, 0, 'r');
      c.rect(20, 1, 21, 1, 'r');
      c.line(14, 16, 14, 18, 'k');
      c.line(26, 16, 26, 17, 'k');
      c.line(20, 16, 20, 19, 'k');
    },
  },
  {
    title: 'Red barn and silo',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 15, 's', 'w');
      c.cloud(14, 2, 8);
      c.ellipse(5, 4, 3, 3, 'y', 'o');
      c.ground(18, 1);
      c.dots(0, 22, 39, 29, 'd', 'g', 3);
      c.rect(6, 10, 25, 25, 'r');
      c.bricks(6, 10, 25, 25, 'n', 'r', 40, 3);
      c.rect(24, 10, 25, 25, 'n');
      c.rect(4, 9, 27, 10, 'c');
      c.triangle(15, 4, 9, 12, 'c', 'e');
      c.rect(13, 18, 18, 25, 'w');
      c.line(13, 18, 18, 25, 'c');
      c.line(18, 18, 13, 25, 'c');
      c.rect(8, 13, 10, 15, 'w');
      c.rect(21, 13, 23, 15, 'w');
      c.put(9, 14, 'c');
      c.put(22, 14, 'c');
      c.rect(29, 7, 35, 25, 'e');
      c.rect(34, 7, 35, 25, 'c');
      c.ellipse(32, 6, 3, 3, 'c', 'c', 'e');
      c.rect(29, 12, 35, 12, 'c');
      c.rect(29, 18, 35, 18, 'c');
      c.rect(0, 20, 4, 20, 'n');
      c.rect(0, 22, 4, 22, 'n');
      c.rect(1, 19, 1, 23, 'n');
      c.rect(4, 19, 4, 23, 'n');
      c.ellipse(37, 24, 2, 2, 'y', 'o');
      c.scatter('wy', 12, 23, 29, 'gd');
    },
  },
  {
    title: 'Parrot in the jungle',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 29, 'g', 'd');
      c.ellipse(5, 4, 7, 4, 'd', 'd', 'g');
      c.ellipse(34, 26, 8, 5, 'd', 'd', 'g');
      c.ellipse(3, 24, 6, 4, 'g', 'd');
      c.ellipse(35, 8, 6, 5, 'g', 'd');
      c.rect(0, 20, 39, 21, 'n');
      c.dots(0, 20, 39, 21, 'c', 'n', 4);
      c.line(16, 22, 13, 29, 'b');
      c.line(17, 22, 15, 29, 'y');
      c.line(18, 22, 17, 29, 'r');
      c.ellipse(18, 14, 5, 7, 'r', 'n');
      c.ellipse(21, 15, 3, 5, 'b', 'p');
      c.line(20, 12, 22, 19, 'y');
      c.line(22, 12, 23, 18, 'g');
      c.ellipse(18, 5, 4, 4, 'r', 'n');
      c.rect(22, 5, 24, 6, 'y');
      c.put(24, 7, 'y');
      c.put(19, 4, 'w');
      c.put(20, 4, 'c');
      c.rect(17, 19, 17, 19, 'y');
      c.rect(19, 19, 19, 19, 'y');
      c.scatter('kyo', 16, 0, 29, 'gd');
    },
  },
  {
    title: 'Rainbow over hills',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 16, 'b', 's');
      c.ellipse(20, 22, 19, 16, 'r');
      c.ellipse(20, 22, 18, 15, 'o');
      c.ellipse(20, 22, 17, 14, 'y');
      c.ellipse(20, 22, 16, 13, 'g');
      c.ellipse(20, 22, 15, 12, 'b');
      c.ellipse(20, 22, 14, 11, 'p');
      c.ellipse(20, 22, 13, 10, 's');
      c.ellipse(34, 4, 3, 3, 'y', 'o');
      c.cloud(0, 13, 8);
      c.cloud(32, 12, 8);
      c.rect(0, 21, 39, 29, 'g');
      c.ellipse(31, 30, 15, 10, 'd', 'd', 'g');
      c.ellipse(6, 33, 14, 11, 'd', 'd', 'g');
      c.dots(0, 21, 39, 29, 'd', 'g', 3);
      c.rect(6, 23, 8, 24, 'w');
      c.put(9, 24, 'c');
      c.rect(14, 25, 16, 26, 'w');
      c.put(13, 26, 'c');
      c.ellipse(29, 23, 3, 3, 'g', 'd');
      c.ellipse(21, 25, 2, 2, 'g', 'd');
      c.scatter('wy', 14, 22, 29, 'gd');
    },
  },
  {
    title: 'Robot',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 25, 'p', 'b');
      c.scatter('w', 20, 0, 24, 'pb');
      c.rect(0, 26, 39, 29, 'c');
      c.bricks(0, 26, 39, 29, 'e', 'c', 6, 2);
      c.rect(19, 0, 20, 2, 'c');
      c.put(19, 0, 'r');
      c.rect(14, 3, 25, 11, 'e');
      c.rect(24, 3, 25, 11, 'c');
      c.rect(16, 5, 18, 7, 'y');
      c.rect(21, 5, 23, 7, 'y');
      c.put(17, 6, 'c');
      c.put(22, 6, 'c');
      c.rect(16, 9, 23, 9, 'c');
      for (let x = 16; x <= 23; x += 2) c.put(x, 9, 'w');
      c.rect(18, 12, 21, 12, 'c');
      c.rect(12, 13, 27, 23, 'b');
      c.dots(12, 13, 27, 23, 'c', 'b', 4);
      c.rect(26, 13, 27, 23, 'p');
      c.rect(15, 15, 24, 20, 'e');
      c.put(17, 17, 'r');
      c.put(20, 17, 'g');
      c.put(23, 17, 'y');
      c.rect(16, 19, 23, 19, 'c');
      c.rect(9, 13, 11, 21, 'e');
      c.rect(28, 13, 30, 21, 'e');
      c.rect(9, 16, 11, 16, 'c');
      c.rect(28, 16, 30, 16, 'c');
      c.rect(9, 22, 9, 23, 'e');
      c.rect(11, 22, 11, 23, 'e');
      c.rect(28, 22, 28, 23, 'e');
      c.rect(30, 22, 30, 23, 'e');
      c.rect(14, 24, 17, 25, 'e');
      c.rect(22, 24, 25, 25, 'e');
      c.rect(13, 26, 18, 27, 'b');
      c.rect(21, 26, 26, 27, 'b');
      c.scatter('y', 6, 0, 24, 'pb');
    },
  },
  {
    title: 'Owl at night',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 29, 'c', 'b');
      c.scatter('w', 30, 0, 29, 'cb');
      c.ellipse(8, 6, 4, 4, 'y', 'o', 'w');
      c.rect(0, 24, 39, 25, 'n');
      c.dots(0, 24, 39, 25, 'c', 'n', 4);
      c.ellipse(6, 27, 5, 2, 'd', 'd', 'g');
      c.ellipse(34, 27, 5, 2, 'd', 'd', 'g');
      c.ellipse(14, 22, 3, 2, 'd', 'd', 'g');
      c.ellipse(24, 17, 6, 7, 'n', 'c');
      c.ellipse(19, 17, 2, 5, 'c');
      c.ellipse(24, 19, 3, 4, 'w', 'e');
      c.dots(21, 15, 27, 23, 'n', 'we', 2);
      c.ellipse(24, 9, 5, 4, 'n', 'c');
      c.triangle(20, 5, 8, 1, 'n');
      c.triangle(28, 5, 8, 1, 'n');
      c.ellipse(22, 9, 2, 2, 'y', 'o');
      c.ellipse(26, 9, 2, 2, 'y', 'o');
      c.put(22, 9, 'c');
      c.put(26, 9, 'c');
      c.rect(24, 11, 24, 12, 'o');
      c.put(22, 24, 'y');
      c.put(26, 24, 'y');
    },
  },
  {
    title: 'Dragon',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 27, 'c', 'p');
      c.scatter('w', 24, 0, 27, 'cp');
      c.rect(0, 28, 39, 29, 'c');
      c.dots(0, 28, 39, 29, 'e', 'c', 3);
      c.ellipse(23, 6, 13, 5, 'd');
      c.triangle(12, 0, 2, 2, 'd');
      c.triangle(23, 0, 2, 2, 'd');
      c.triangle(34, 0, 2, 2, 'd');
      for (const [x, y] of [[12, 1], [23, 1], [34, 1], [9, 7], [37, 7]] as const) c.line(22, 12, x, y, 'g');
      c.ellipse(22, 17, 10, 5, 'g', 'd');
      c.dots(12, 12, 32, 22, 'd', 'g', 3);
      c.ellipse(22, 20, 8, 2, 'y', 'o');
      c.bricks(14, 19, 30, 22, 'o', 'y', 40, 2);
      c.rect(17, 21, 19, 27, 'g');
      c.rect(26, 21, 28, 27, 'g');
      c.rect(19, 21, 19, 27, 'd');
      c.rect(28, 21, 28, 27, 'd');
      for (const x of [16, 18, 20, 25, 27, 29]) c.put(x, 28, 'w');
      c.line(31, 19, 37, 24, 'g');
      c.line(31, 20, 37, 25, 'd');
      c.triangle(38, 22, 27, 2, 'y');
      c.ellipse(13, 13, 4, 4, 'g', 'd');
      c.ellipse(11, 9, 4, 3, 'g', 'd');
      c.ellipse(10, 6, 6, 4, 'g', 'd');
      c.rect(4, 7, 9, 7, 'r');
      for (const x of [5, 7, 9]) c.put(x, 6, 'w');
      c.rect(11, 5, 12, 5, 'y');
      c.put(12, 5, 'c');
      c.line(13, 3, 15, 0, 'y');
      c.line(11, 3, 12, 1, 'y');
      c.ellipse(2, 8, 3, 2, 'o', 'r', 'y');
      c.put(0, 7, 'y');
    },
  },
  {
    title: 'Watermelon slice',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 29, 'w', 'y');
      c.dots(0, 0, 39, 29, 'o', 'wy', 6);
      c.ellipse(20, 22, 15, 13, 'd', 'd', 'g');
      c.ellipse(20, 22, 13, 11, 'w');
      c.ellipse(20, 22, 12, 10, 'r', 'r', 'k');
      c.dots(10, 12, 30, 22, 'c', 'r', 4);
      c.rect(0, 23, 39, 29, 'y');
      c.dots(0, 23, 39, 29, 'o', 'y', 6);
      c.ellipse(20, 25, 18, 3, 'e', 'c', 'w');
      c.rect(2, 23, 37, 23, 'd');
      c.dots(2, 23, 37, 23, 'g', 'd', 3);
    },
  },
  {
    title: 'Campfire and tent',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 19, 'c', 'b');
      c.scatter('w', 24, 0, 12, 'cb');
      c.ellipse(34, 4, 2, 2, 'w', 'e');
      c.ground(20, 1);
      c.dots(0, 22, 39, 29, 'd', 'g', 3);
      c.triangle(33, 4, 20, 5, 'g', 'd');
      c.rect(32, 20, 33, 23, 'n');
      c.triangle(4, 8, 20, 4, 'g', 'd');
      c.rect(3, 20, 4, 22, 'n');
      c.triangle(12, 8, 24, 9, 'o', 'r');
      c.triangle(12, 14, 24, 3, 'c');
      c.line(12, 8, 12, 24, 'y');
      c.line(15, 26, 25, 24, 'n');
      c.line(15, 24, 25, 26, 'n');
      c.ellipse(20, 21, 3, 4, 'o', 'r', 'y');
      c.ellipse(20, 19, 2, 2, 'y');
      c.line(20, 15, 22, 11, 'e');
      for (const x of [14, 17, 23, 26]) c.put(x, 27, 'e');
      c.scatter('y', 8, 12, 18, 'cb');
    },
  },
  {
    title: 'Peacock',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 29, 's', 'w');
      c.ellipse(20, 20, 19, 16, 'g', 'd');
      for (let k = 0; k <= 8; k++) {
        const a = Math.PI + (k * Math.PI) / 8;
        const x = Math.round(20 + 15 * Math.cos(a));
        const y = Math.round(20 + 13 * Math.sin(a));
        c.ellipse(x, y, 2, 2, 'b');
        c.put(x, y, 'y');
      }
      for (let k = 1; k <= 5; k++) {
        const a = Math.PI + (k * Math.PI) / 6;
        const x = Math.round(20 + 9 * Math.cos(a));
        const y = Math.round(20 + 8 * Math.sin(a));
        c.ellipse(x, y, 1, 1, 'p');
        c.put(x, y, 'y');
      }
      c.rect(0, 27, 39, 29, 'g');
      c.dots(0, 27, 39, 29, 'd', 'g', 3);
      c.ellipse(20, 22, 4, 6, 'b', 'p');
      c.rect(19, 11, 21, 17, 'b');
      c.ellipse(20, 9, 2, 2, 'b', 'p');
      c.put(19, 6, 'y');
      c.put(20, 5, 'y');
      c.put(21, 6, 'y');
      c.put(22, 9, 'y');
      c.put(21, 8, 'w');
      c.rect(18, 28, 18, 29, 'o');
      c.rect(22, 28, 22, 29, 'o');
      c.scatter('w', 8, 0, 8, 's');
    },
  },
  {
    title: 'Snail in the garden',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 14, 's', 'w');
      c.ground(15, 1);
      c.dots(0, 18, 39, 29, 'd', 'g', 3);
      c.rect(5, 14, 5, 25, 'd');
      c.ellipse(5, 11, 3, 3, 'r', 'r', 'k');
      c.put(5, 11, 'y');
      c.ellipse(3, 20, 2, 1, 'g', 'd');
      c.rect(34, 12, 34, 25, 'd');
      c.ellipse(34, 9, 3, 3, 'p', 'p', 'k');
      c.put(34, 9, 'y');
      c.ellipse(36, 19, 2, 1, 'g', 'd');
      c.rect(12, 24, 30, 26, 'k');
      c.rect(12, 26, 30, 26, 'p');
      c.ellipse(12, 23, 3, 3, 'k', 'p');
      c.line(11, 20, 10, 17, 'k');
      c.line(13, 20, 14, 17, 'k');
      c.put(10, 16, 'c');
      c.put(14, 16, 'c');
      c.ellipse(24, 20, 6, 5, 'o', 'n', 'y');
      c.ellipse(24, 20, 3, 3, 'y', 'o');
      c.put(24, 20, 'n');
      c.put(25, 20, 'n');
      c.scatter('wyr', 14, 19, 29, 'gd');
    },
  },
  {
    title: 'Pirate ship',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 15, 'p', 'o');
      c.ellipse(31, 14, 5, 5, 'y', 'o', 'w');
      c.gradient(16, 29, 's', 'b');
      c.dots(0, 17, 39, 29, 'w', 'sb', 4);
      for (let y = 20; y <= 27; y++) {
        const half = Math.round(16 * Math.sqrt(1 - ((y - 20) / 8) ** 2));
        c.rect(20 - half, y, 20 + half, y, 'n');
      }
      c.bricks(4, 21, 36, 27, 'c', 'n', 7, 2);
      for (let y = 21; y <= 27; y++) for (let x = 29; x <= 36; x++) c.putOn(x, y, 'c', 'n');
      c.rect(4, 20, 36, 20, 'y');
      c.rect(28, 16, 35, 19, 'n');
      c.rect(28, 16, 35, 16, 'y');
      c.rect(30, 17, 31, 18, 'y');
      c.rect(33, 17, 34, 18, 'y');
      for (const x of [10, 14, 18, 22, 26]) c.put(x, 23, 'c');
      for (const x of [8, 12, 16, 20, 24]) c.put(x, 25, 'y');
      c.line(14, 2, 4, 20, 'y');
      c.line(25, 5, 36, 16, 'y');
      c.rect(14, 2, 14, 19, 'n');
      c.rect(25, 5, 25, 19, 'n');
      c.ellipse(14, 8, 7, 5, 'w', 'e');
      c.ellipse(25, 11, 5, 4, 'w', 'e');
      c.rect(13, 6, 15, 8, 'c');
      c.put(13, 7, 'w');
      c.put(15, 7, 'w');
      c.line(11, 10, 17, 10, 'c');
      c.line(11, 11, 17, 9, 'c');
      c.rect(15, 0, 19, 1, 'c');
      c.put(17, 0, 'w');
      c.line(3, 4, 5, 5, 'c');
      c.line(5, 5, 7, 4, 'c');
    },
  },
  {
    title: 'Koi pond',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 29, 's', 'b');
      c.dots(0, 0, 39, 26, 'w', 'sb', 5);
      c.rect(0, 27, 39, 29, 'e');
      c.dots(0, 27, 39, 29, 'c', 'e', 3);
      c.ellipse(7, 7, 5, 3, 'g', 'd');
      c.ellipse(30, 22, 5, 3, 'g', 'd');
      c.ellipse(34, 5, 4, 2, 'g', 'd');
      c.ellipse(2, 20, 3, 2, 'g', 'd');
      c.ellipse(30, 21, 2, 1, 'k', 'p', 'w');
      c.ellipse(18, 16, 7, 3, 'w', 'e');
      c.ellipse(16, 15, 2, 1, 'o');
      c.ellipse(21, 17, 2, 1, 'r');
      c.put(24, 16, 'c');
      c.line(11, 16, 8, 13, 'o');
      c.line(11, 16, 8, 19, 'o');
      c.line(17, 13, 15, 12, 'o');
      c.ellipse(27, 9, 5, 2, 'o', 'r');
      c.put(31, 9, 'c');
      c.line(22, 9, 20, 7, 'o');
      c.line(22, 9, 20, 11, 'r');
      c.scatter('w', 8, 0, 26, 'sb');
    },
  },
  {
    title: 'Deer in the snow',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 22, 'b', 's');
      c.scatter('w', 30, 0, 21, 'bs');
      c.ellipse(33, 5, 3, 3, 'y', 'o', 'w');
      c.ground(23, 1, 'w', 'e');
      c.rect(5, 20, 6, 24, 'n');
      c.triangle(5, 12, 22, 8, 'd', 'g');
      c.triangle(5, 7, 15, 6, 'd', 'g');
      c.triangle(5, 3, 10, 4, 'd', 'g');
      c.dots(0, 3, 13, 22, 'w', 'dg', 3);
      c.rect(36, 20, 36, 24, 'n');
      c.triangle(36, 14, 22, 5, 'd', 'g');
      c.triangle(36, 10, 17, 4, 'd', 'g');
      c.dots(31, 10, 39, 22, 'w', 'dg', 3);
      c.ellipse(13, 24, 4, 2, 'd', 'd', 'g');
      c.dots(9, 22, 17, 26, 'r', 'dg', 2);
      c.ellipse(22, 19, 6, 3, 'n', 'c');
      c.rect(18, 22, 19, 27, 'n');
      c.rect(25, 22, 26, 27, 'n');
      c.rect(19, 22, 19, 27, 'c');
      c.rect(26, 22, 26, 27, 'c');
      c.put(16, 18, 'w');
      c.ellipse(27, 15, 2, 3, 'n', 'c');
      c.ellipse(28, 12, 3, 2, 'n', 'c');
      c.put(31, 12, 'c');
      c.put(28, 11, 'c');
      c.ellipse(22, 21, 4, 1, 'w', 'e');
      c.line(28, 10, 26, 6, 'o');
      c.line(28, 10, 30, 6, 'o');
      c.line(27, 8, 25, 7, 'o');
      c.line(29, 8, 31, 7, 'o');
      c.line(26, 6, 25, 4, 'o');
      c.line(30, 6, 31, 4, 'o');
      c.scatter('e', 12, 24, 29, 'w');
    },
  },
  {
    title: 'Tractor in a field',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 13, 's', 'w');
      c.cloud(2, 3, 7);
      c.cloud(28, 1, 8);
      c.ellipse(33, 13, 9, 3, 'd', 'd', 'g');
      c.ellipse(4, 14, 8, 3, 'd', 'd', 'g');
      c.rect(0, 14, 39, 29, 'n');
      c.bricks(0, 15, 39, 29, 'o', 'n', 40, 2);
      c.rect(0, 14, 39, 17, 'y');
      c.dots(0, 14, 39, 17, 'o', 'y', 2);
      c.rect(12, 14, 24, 20, 'r');
      c.rect(23, 14, 24, 20, 'c');
      c.rect(15, 8, 22, 13, 'r');
      c.rect(16, 9, 21, 12, 's');
      c.rect(19, 9, 19, 12, 'r');
      c.rect(13, 9, 13, 13, 'c');
      c.ellipse(12, 6, 2, 1, 'e');
      c.ellipse(8, 4, 1, 1, 'e');
      c.rect(25, 17, 29, 20, 'r');
      c.ellipse(14, 23, 5, 5, 'c', 'c', 'e');
      c.ellipse(14, 23, 2, 2, 'y', 'o');
      c.ellipse(26, 24, 3, 3, 'c', 'c', 'e');
      c.put(26, 24, 'y');
      c.scatter('g', 10, 18, 29, 'no');
    },
  },
  {
    title: 'Hummingbird at a flower',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 29, 's', 'g');
      c.dots(0, 18, 39, 29, 'd', 'g', 3);
      c.line(34, 29, 30, 16, 'd');
      c.line(35, 29, 31, 16, 'd');
      c.ellipse(36, 22, 3, 2, 'g', 'd');
      c.ellipse(28, 24, 3, 2, 'g', 'd');
      for (const [x, y] of [[30, 8], [26, 11], [34, 11], [28, 15], [32, 15]] as const) c.ellipse(x, y, 3, 2, 'r', 'r', 'k');
      c.ellipse(30, 12, 2, 2, 'y', 'o');
      c.line(30, 12, 35, 6, 'y');
      c.put(35, 6, 'o');
      c.ellipse(14, 13, 4, 2, 'g', 'd');
      c.ellipse(18, 11, 2, 2, 'g', 'd');
      c.put(18, 12, 'p');
      c.put(19, 12, 'p');
      c.put(19, 10, 'c');
      c.line(20, 11, 25, 11, 'c');
      c.triangle(13, 6, 11, 2, 'b');
      c.triangle(10, 8, 11, 2, 'b');
      c.line(10, 14, 6, 16, 'd');
      c.line(10, 13, 6, 14, 'b');
      c.scatter('w', 10, 4, 12, 's');
      c.scatter('yk', 12, 18, 29, 'gd');
    },
  },
  {
    title: 'Space station over a planet',
    ...LARGE,
    draw: (c) => {
      c.gradient(0, 29, 'c', 'p');
      c.scatter('w', 40, 0, 29, 'cp');
      c.ellipse(28, 22, 19, 4, 'e', 'c', 'w');
      c.ellipse(28, 22, 11, 11, 'o', 'r', 'y');
      for (const y of [15, 19, 23, 27]) for (let x = 0; x < 40; x++) if ((x + y) % 2 === 0) c.putOn(x, y, 'y', 'or');
      c.rect(0, 9, 6, 11, 'b');
      c.rect(15, 9, 21, 11, 'b');
      c.rect(3, 9, 3, 11, 'c');
      c.rect(18, 9, 18, 11, 'c');
      c.rect(0, 10, 21, 10, 'c');
      c.rect(8, 8, 13, 12, 'e');
      c.rect(12, 8, 13, 12, 'c');
      c.dots(8, 8, 13, 12, 'y', 'e', 2);
      c.line(10, 7, 10, 3, 'e');
      c.put(10, 2, 'r');
      c.ellipse(10, 14, 2, 2, 'w', 'e');
      c.ellipse(4, 24, 2, 2, 'e', 'c', 'w');
      c.line(32, 3, 38, 1, 'y');
      c.put(32, 3, 'w');
    },
  },
  // From level 41 every picture is one subject in its setting, drawn with the noise helpers of the Canvas,
  // so its horizons wander and its tones meet in broken edges; each names the deal it is baked from.
  {
    title: 'Treehouse in an oak',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1381, strength: 2 },
    draw: (c) => {
      c.bands(0, 27, 's', 320);
      cloud(c, 35, 17, 8, 330);
      cloud(c, 5, 19, 7, 331);
      land(c, 26, 1.2, 'gd', 321, 2, 6);
      // The trunk and its arms.
      c.curve(20, 29, 18, 22, 20, 13, 'n', 6, 4);
      c.curve(18, 28, 17, 22, 18, 15, 'c', 1.2);
      c.curve(20, 15, 12, 13, 7, 9, 'n', 2.5, 1.2);
      c.curve(21, 14, 28, 12, 33, 8, 'n', 2.5, 1.2);
      // The crown, many leafy clumps.
      for (const [x, y, rx, ry, s] of [[8, 7, 7, 5, 322], [32, 6, 8, 5, 323], [20, 5, 10, 5, 324], [13, 11, 5, 3, 325], [28, 11, 5, 3, 326]] as const) c.blob(x, y, rx, ry, 'g', 'd', 'y', s, 0.4);
      c.speckle('d', 'g', 0.06, 327);
      c.scatter('r', 5, 0, 13, 'gd');
      // The house, a little crooked, planks of two browns, a red roof.
      c.poly([13, 17, 27, 16, 27, 23, 13, 23], 'o');
      c.fill((x, y, now) => (now === 'o' && Math.floor(y + (13 - x) / 14) % 2 === 0 && hash(x, y, 328) < 0.85 ? 'n' : undefined));
      c.poly([11, 17, 20, 11, 29, 16], 'r');
      c.curve(11, 17, 20, 11.5, 29, 16, 'c');
      c.blob(17, 19.5, 1.8, 1.8, 'y', undefined, undefined, 329, 0);
      c.put(17, 19, 'n');
      c.poly([22, 18, 25, 18, 25, 23, 22, 23], 'c');
      c.put(24, 21, 'y');
      // A rope ladder down to the grass.
      c.curve(15, 23, 14, 26, 15, 28, 'e');
      c.curve(18, 23, 17, 26, 18, 28, 'e');
      for (const y of [24, 26, 28]) c.curve(14.5, y, 16, y + 0.3, 17.5, y, 'e');
    },
  },
  {
    title: 'Squirrel with an acorn',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1381, strength: 2 },
    draw: (c) => {
      // A wood: sky in pockets between leafy clumps, a trunk at the right, a branch below.
      c.bands(0, 29, 's', 160);
      for (const [x, y, rx, ry, s] of [[4, 3, 9, 6, 161], [20, 0, 9, 4, 162], [37, 7, 7, 9, 163], [2, 18, 5, 6, 164], [13, 13, 4, 3, 171]] as const)
        c.blob(x, y, rx, ry, 'g', 'd', undefined, s, 0.4);
      c.speckle('d', 'g', 0.06, 172);
      c.fill((x, y) => (x > 33 + (c.noise(0, y, 5, 173) - 0.5) * 3 + c.wobble(x, y, 174) * 0.5 ? (c.noise(x * 2, y * 0.3, 2, 175) > 0.6 ? 'c' : 'n') : undefined));
      c.curve(0, 27, 18, 24, 36, 25, 'n', 4, 3);
      c.curve(0, 29, 18, 26.5, 36, 27, 'c', 1.4, 1);
      // The tail: a big S of fur behind, up to the top.
      c.curve(17, 25, 3, 23, 6, 12, 'o', 7, 11);
      c.curve(6, 12, 7, 1, 15, 2, 'o', 11, 6);
      c.curve(15, 2, 18, 3, 17, 7, 'o', 4, 2);
      // Fur in wavy light streaks along the tail, before the body covers its root.
      streaks(c, 'y', 'o', 0, 27, 3, 177, 1, 0.4);
      // The squirrel sits up, facing right, outlined in brown against its own tail.
      c.blob(23, 17, 8, 9, 'n', undefined, undefined, 166, 0.08);
      c.blob(26.5, 8.5, 6, 5.2, 'n', undefined, undefined, 168, 0.05);
      c.blob(23, 17, 7, 8, 'o', 'n', 'y', 166, 0.08);
      c.blob(25.5, 18.5, 2.8, 5, 'w', undefined, undefined, 167, 0.1);
      c.blob(19, 23, 5, 3.4, 'o', 'n', undefined, 176, 0.08);
      c.blob(26.5, 8.5, 5, 4.2, 'o', 'n', 'y', 168, 0.05);
      c.curve(28, 9, 30, 10, 31, 10.5, 'o', 2.5, 1.5);
      c.poly([23, 7, 24, 0, 27, 6], 'o');
      c.put(24, 2, 'n');
      c.put(24, 1, 'n');
      c.put(27, 8, 'c');
      c.put(31, 10, 'c');
      c.put(28, 11, 'w');
      // The acorn, held up in its paws.
      c.blob(29, 15.5, 1.8, 2.2, 'y', 'o', undefined, 169, 0);
      c.blob(29, 13.5, 2.2, 1.1, 'n', 'c', undefined, 170, 0);
      c.put(29, 12, 'n');
      c.curve(25, 16, 27, 17, 28, 16, 'n', 1.5);
      c.curve(19, 26, 22, 27, 25, 26, 'n', 1.5);
      c.scatter('r', 5, 0, 10, 'gd');
    },
  },
  {
    title: 'Goldfish in a bowl',
    ...LARGE,
    deal: { sceneSeed: 2, buckets: 4, seed: 2404, strength: 1.75 },
    draw: (c) => {
      // A purple wall papered in wavy pink streaks, a table with a two-tone cloth.
      c.bands(0, 29, 'p', 340);
      streaks(c, 'k', 'p', 0, 25, 4, 341, 1, 0.45);
      land(c, 25, 1, 'nc', 343, 2, 9);
      // The bowl fills the height: glass, the water inside, a rim on top.
      c.blob(20, 15, 15, 14.6, 'w', undefined, undefined, 345, 0);
      c.blob(20, 15.5, 14, 13.6, 's', 'b', undefined, 346, 0.05);
      c.fill((_x, y, now) => (y < 4 && 'sb'.includes(now) ? 'p' : undefined));
      c.fill((x, y) => (y === 3 && Math.abs(x - 20) < 10 ? 'w' : undefined));
      c.curve(9, 9, 7, 15, 9, 22, 'w');
      c.put(10, 7, 'w');
      // Pebbles and weeds on the bottom.
      c.fill((x, y, now) => (y > 23 && 'sb'.includes(now) && y > 25 - c.noise(x, 0, 2, 347) * 2 ? ['y', 'r', 'o', 'w'][Math.floor(hash(x, y, 348) * 4)] : undefined));
      c.curve(11, 26, 9, 19, 12, 12, 'g', 1.8, 1);
      c.curve(13, 26, 15, 20, 13, 15, 'g', 1.8, 1);
      c.curve(30, 26, 32, 20, 29, 16, 'g', 1.6, 1);
      // The goldfish, big, swimming right, its tail a veil.
      c.blob(23, 14, 7, 4.5, 'o', 'r', 'y', 349, 0.05);
      c.poly([16.5, 14, 10, 7, 12, 14, 9, 21], 'o');
      c.curve(16, 14, 13, 11, 11, 9, 'y');
      c.curve(16, 15, 13, 17, 11, 19, 'r');
      c.poly([20, 10, 24, 6.5, 26, 10], 'r');
      c.put(28, 13, 'c');
      c.curve(23, 17, 23, 20, 20, 20, 'y', 1.4);
      for (const [x, y] of [[31, 11], [32, 8], [31, 6]] as const) c.put(x, y, 'w');
    },
  },
  {
    title: 'Giraffe at sunset',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1372, strength: 1.75 },
    draw: (c) => {
      c.bands(0, 22, 'bpk', 140, 1.5, 9);
      c.blob(35, 19, 4, 4, 'w', undefined, undefined, 141, 0);
      // Long sunset clouds lying across the bands.
      ribbon(c, 'k', 'b', 4, 1.5, 148, 0.7);
      ribbon(c, 'w', 'p', 11, 1.5, 149, 0.6);
      land(c, 23, 1.5, 'nd', 142, 4, 7);
      c.speckle('o', 'n', 0.06, 143);
      // Acacias at both sides, flat crowns over the bands.
      for (const [x, y, w, s] of [[35, 12, 8, 144], [4, 15, 7, 150]] as const) {
        c.curve(x - 1, 24, x - 1, y + 4, x - 3, y, 'c', 1.4, 1);
        c.curve(x - 1, y + 4, x + 1, y + 2, x + 2, y, 'c');
        c.blob(x, y, w, 1.8, 'c', undefined, 'd', s, 0.3);
      }
      // The giraffe, big, facing left, its head at the top edge.
      c.blob(23, 15.5, 10, 5.5, 'y', 'o', undefined, 145, 0.1);
      for (const x of [17, 20, 27, 30]) c.curve(x, 19, x + (x < 23 ? 0.5 : -0.5), 24, x, 28, 'y', 2, 1.6);
      for (const x of [17, 20, 27, 30]) c.put(x, 28, 'c');
      c.curve(17, 15, 13, 8, 10, 2, 'y', 6.5, 3.6);
      c.blob(8, 2, 3.6, 2.2, 'y', 'o', undefined, 146, 0);
      c.poly([3, 1, 6, 1, 6, 4, 3, 4], 'o');
      c.put(9, 0, 'n');
      c.put(11, 0, 'n');
      c.put(8, 1, 'c');
      c.curve(12, 4, 15, 10, 19, 13, 'n', 1.4);
      c.curve(31, 14, 33, 17, 32, 21, 'y');
      c.put(32, 22, 'c');
      // Patches on the coat, at fixed irregular places.
      c.fill((x, y, now) => (now === 'y' && x >= 8 && y > 3 && y < 21 && c.noise(x, y, 1.8, 147) > 0.58 ? 'n' : undefined));
      c.scatter('w', 6, 0, 8, 'bp');
    },
  },
  {
    title: 'Strawberry',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1472, strength: 1.75 },
    draw: (c) => {
      // A warm wall behind, a blue cloth in soft folds, and a plate on it.
      c.bands(0, 29, 'y', 240);
      // The wall is papered in soft orange blotches, about half and half.
      c.fill((x, y, now) => (now === 'y' && y < 23 && c.noise(x, y, 4, 246) > 0.5 ? 'o' : undefined));
      land(c, 22, 1.2, 'b', 241, 4, 6);
      c.fill((x, y, now) => (now === 'b' && c.noise(x * 0.5, y, 2, 245) > 0.68 ? 's' : undefined));
      c.blob(20, 27, 18, 3.6, 'w', 'e', undefined, 242, 0.3);
      // The berry: a big heart-like shape, red with a darker side and yellow seeds.
      c.fill((x, y) => {
        const u = (x - 20) / 16;
        const v = (y - 5) / 23;
        const half = (1 - v) * (0.75 + 0.35 * Math.sqrt(Math.max(0, v))) * 1.05;
        const n = c.noise(x, y, 3, 243) - 0.5;
        if (v < 0 || v > 1 || Math.abs(u) > half + 0.12 * n) return undefined;
        const t = u + 0.4 * v + 0.6 * n;
        return t > 0.85 ? 'p' : t < -0.6 ? 'k' : 'r';
      });
      c.fill((x, y, now) => {
        if (!'rpk'.includes(now)) return undefined;
        const row = y - 8;
        return row >= 0 && row % 3 === 0 && (x + (row / 3) * 2) % 4 === 0 ? (now === 'k' ? 'w' : 'y') : undefined;
      });
      // The calyx on top, then a stem up to the edge.
      for (const [x1, y1] of [[6, 8], [11, 10], [17, 11], [23, 11], [29, 10], [34, 8]] as const) c.curve(20, 5, (20 + x1) / 2, 4, x1, y1, 'g', 3, 1);
      c.blob(20, 4.5, 8, 1.8, 'd', undefined, 'g', 244, 0.3);
      c.curve(20, 4, 21, 1, 23, 0, 'd', 1.8, 1.4);
    },
  },
  {
    title: 'Sea turtle',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1342, strength: 1 },
    draw: (c) => {
      // Seen from above: deep water with pools of shallows, the light netting the surface in short arcs,
      // and two sandy patches of seabed with pink coral, at opposite corners.
      c.fill((x, y) => (c.noise(x, y, 6, 200) + c.noise(x, y, 3, 201) * 0.25 > 0.8 ? 's' : 'b'));
      ripples(c, 0, 29, 's', 'b', 22, 202);
      ripples(c, 0, 29, 'b', 's', 8, 203);
      c.blob(2, 27, 7, 5, 'y', undefined, undefined, 210, 0.45);
      c.blob(38, 2, 6, 4.5, 'y', undefined, undefined, 211, 0.45);
      c.fill((x, y, now) => (now === 'y' && c.noise(x, y, 2.5, 212) > 0.6 ? 'k' : undefined));
      // The turtle, big, swimming up and left: flippers out to the edges, then the shell, then the head.
      c.curve(14, 10, 7, 3, 0, 2, 'g', 5, 2);
      c.curve(30, 9, 35, 5, 40, 5, 'g', 3.5, 1.6);
      c.curve(31, 20, 36, 25, 40, 25, 'g', 4.5, 2);
      c.curve(15, 21, 10, 26, 5, 27, 'g', 4, 1.6);
      c.fill((x, y, now) => (now === 'g' && hash(x, y, 208) < 0.15 ? 'd' : undefined));
      c.blob(22, 15, 13.5, 9, 'n', 'c', undefined, 205, 0.1);
      // The shell's plates: light patches parted by the brown, one in the middle and six round it.
      c.blob(22, 15, 4, 2.8, 'o', undefined, 'y', 206, 0.3);
      for (const [x, y] of [[14.8, 11.8], [22, 9.4], [29.2, 11.8], [29.2, 18.2], [22, 20.6], [14.8, 18.2]] as const) c.blob(x, y, 3, 2.1, 'o', undefined, 'y', 209 + x + y, 0.3);
      c.blob(8, 13, 4, 3.4, 'g', 'd', 'y', 207, 0);
      c.put(6, 12, 'c');
      c.curve(4, 15, 5, 16, 7, 16, 'c');
      // A small school of fish passing on the right, one straggler at the top left.
      for (const [x, y] of [[33, 9], [36, 8], [35, 11], [31, 27], [34, 26], [4, 3]] as const) {
        c.put(x, y, 'y');
        c.put(x + 1, y, 'o');
      }
      c.scatter('w', 10, 0, 29, 'sb');
    },
  },
  {
    title: 'Bonsai tree',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 5, seed: 3574, strength: 1.75 },
    draw: (c) => {
      c.bands(0, 29, 'yo', 360, 1.6, 9);
      // Each half of the wall broken by a few soft patches of the other's colour.
      c.fill((x, y, now) => (now === 'o' && c.noise(x, y, 4, 369) > 0.62 ? 'y' : now === 'y' && c.noise(x, y, 4, 370) > 0.62 ? 'o' : undefined));
      c.blob(31, 9, 5, 5, 'r', undefined, undefined, 362, 0.05);
      // The stand and the pot.
      land(c, 27, 1.2, 'nc', 363, 2, 9);
      // A round bowl of a pot with a glaze of wavy light and dark runs, its moss heaped in the middle.
      c.fill((x, y) => {
        if (y < 21 || ((x - 20) / 12) ** 2 + ((y - 20.5) / 7) ** 2 > 1) return undefined;
        const p = x + y * 0.8 + (c.noise(x, y, 3, 371) - 0.5) * 4;
        return p - Math.floor(p / 5) * 5 < 2 ? 's' : 'b';
      });
      c.curve(9, 21, 20, 22, 31, 21, 'c');
      c.curve(10, 20.5, 20, 18.5, 30, 20.5, 'g', 1.8);
      // The trunk, twisted, then the leafy pads.
      c.curve(20, 20, 13, 16, 19, 11, 'n', 3, 2);
      c.curve(19, 11, 24, 8, 21, 5, 'n', 2, 1.2);
      c.curve(16, 15, 10, 14, 7, 12, 'n', 1.6, 1);
      c.curve(20, 10, 26, 11, 30, 13, 'n', 1.6, 1);
      c.curve(19, 19, 15, 16, 18, 12, 'c');
      for (const [x, y, rx, ry, s] of [[6, 10, 7, 3.4, 364], [32, 11, 7, 3.4, 365], [21, 3.5, 8.5, 3.5, 366], [15, 7, 5, 2.6, 367]] as const) c.blob(x, y, rx, ry, 'g', 'd', undefined, s, 0.35);
      c.speckle('d', 'g', 0.08, 368);
      c.scatter('w', 4, 0, 15, 'yo');
    },
  },
  {
    title: 'Swan on a lake',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1381, strength: 2 },
    draw: (c) => {
      c.bands(0, 15, 'pkoy', 100, 1.2, 8);
      c.blob(28, 14, 4, 4, 'y', undefined, 'w', 101, 0);
      land(c, 13, 2, 'd', 102, 4, 6);
      land(c, 16.5, 0.8, 'ob', 103, 3, 5);
      // The sun's path on the water.
      c.fill((x, y) => (y > 16 && Math.abs(x - 28) < 3 - (y - 16) * 0.12 && hash(x, y, 105) < 0.5 ? 'y' : undefined));
      ripples(c, 17, 29, 's', 'b', 18, 106);
      // Reeds at both sides.
      for (const [x, h, col] of [[1, 18, 'd'], [3, 21, 'n'], [5, 19, 'd'], [36, 20, 'd'], [38, 17, 'n']] as const) c.curve(x, 29, x + 1, h + 4, x + (x > 20 ? -1 : 1), h, col);
      // The swan, gliding left, its neck an S.
      c.blob(20, 22, 8, 3.6, 'w', 'e', undefined, 107, 0.15);
      c.blob(24, 19.5, 5, 3, 'w', 'e', undefined, 108, 0.25);
      c.curve(14, 21, 11, 16, 14, 13, 'w', 2.2, 2);
      c.curve(14, 13, 16, 10, 13, 9, 'w', 2, 2);
      c.blob(12.5, 9.5, 1.8, 1.4, 'w', undefined, undefined, 109, 0);
      c.poly([11, 9, 8, 11, 8, 12, 11, 11], 'o');
      c.put(11, 9, 'c');
      c.put(12, 9, 'c');
      c.curve(12, 24, 20, 26, 29, 24, 'b');
      c.scatter('w', 6, 0, 9, 'pk');
    },
  },
  {
    title: 'Sleeping cat',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1332, strength: 0.75 },
    draw: (c) => {
      // A green wall papered with wavy leaf streaks, a night window at the upper right.
      c.bands(0, 29, 'd', 260);
      streaks(c, 'g', 'd', 0, 29, 3, 261, 1, 0.3);
      c.blob(31, 7, 6.5, 5.5, 'b', undefined, undefined, 263, 0.05);
      c.blob(35, 4.5, 1.8, 1.8, 'y', undefined, 'w', 264, 0);
      c.scatter('w', 4, 1, 11, 'b');
      // The cushion, purple with a pink seam, under the whole cat.
      c.blob(20, 25.5, 19.5, 5, 'p', undefined, 'k', 265, 0.3);
      c.curve(1, 24, 20, 28, 39, 24, 'k');
      // The cat, curled up: a big round back, the head in front at the left, ears up.
      c.blob(23, 18, 13, 7.5, 'o', 'n', 'y', 267, 0.08);
      for (let i = 0; i < 6; i++) c.curve(17 + 3.5 * i, 11, 18.5 + 3.5 * i, 14, 17 + 3.5 * i, 16.5, 'n', 1.2, 1);
      c.blob(11, 16, 6, 5, 'o', 'n', 'y', 268, 0.05);
      c.poly([5, 14, 5.5, 6, 10, 11.5], 'o');
      c.poly([12, 11.5, 16.5, 6.5, 17, 13], 'o');
      for (const [x, y] of [[6, 10], [6, 11], [15, 10], [15, 11]] as const) c.put(x, y, 'k');
      // Eyes shut, a white muzzle and a pink nose.
      c.curve(7, 15, 8, 16, 9.5, 15, 'c');
      c.curve(12.5, 15, 14, 16, 15, 15, 'c');
      c.blob(11, 18.5, 2.8, 1.5, 'w', undefined, undefined, 269, 0);
      c.put(11, 17, 'k');
      // The tail wraps round the front, its tip dark, a white paw tucked in.
      c.curve(35, 21, 30, 27, 17, 23.5, 'o', 3.6, 2.6);
      c.curve(19, 24, 17, 23.5, 15, 22.5, 'n', 2.4, 1.6);
      c.blob(20, 22.5, 2, 1.1, 'w', undefined, undefined, 270, 0);
    },
  },
  {
    title: 'Rabbit in a meadow',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1461, strength: 1.5 },
    draw: (c) => {
      c.bands(0, 22, 's', 280);
      cloud(c, 30, 5, 12, 281);
      cloud(c, 8, 9, 8, 282);
      land(c, 15, 1.5, 'd', 283, 3, 5);
      land(c, 19, 2.5, 'gd', 284, 5, 7);
      c.speckle('d', 'g', 0.06, 285);
      // The rabbit, sitting, facing left.
      c.blob(22, 21, 6, 5, 'e', 'c', 'w', 286, 0.1);
      c.blob(15.5, 16, 3.6, 3.2, 'e', 'c', 'w', 287, 0.05);
      c.curve(16, 13, 15, 8, 17, 4, 'e', 2.4, 1.8);
      c.curve(18, 13, 19, 9, 22, 6, 'e', 2.4, 1.8);
      c.curve(16, 12, 15.5, 9, 16.6, 6, 'k', 0.8);
      c.curve(18.6, 12, 19.4, 9.5, 21.2, 7.6, 'k', 0.8);
      c.blob(28, 21, 1.6, 1.6, 'w', undefined, undefined, 288, 0);
      c.put(14, 15, 'c');
      c.put(12, 17, 'k');
      c.blob(17, 25, 3, 1.2, 'e', 'c', 'w', 289, 0.1);
      // Flowers in the grass.
      for (const [x, y, col] of [[4, 22, 'r'], [8, 26, 'y'], [31, 26, 'p'], [35, 21, 'r'], [3, 28, 'y'], [36, 27, 'w']] as const) c.flower(x, y, col, col === 'y' ? 'o' : 'y');
      c.scatter('ypw', 10, 18, 29, 'gd');
    },
  },
  {
    title: 'Cherry blossom tree',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1383, strength: 2 },
    draw: (c) => {
      c.bands(0, 24, 'bs', 20, 1.2);
      c.blob(33, 5, 2.6, 2.6, 'y', 'o', 'w', 21, 0.1);
      land(c, 19, 1.5, 'e', 33, 2, 6);
      land(c, 22, 2, 'gd', 22, 3);
      c.curve(19, 29, 17, 22, 20, 14, 'n', 4, 2.5);
      c.curve(18, 24, 19, 22, 18, 20, 'c', 1.2, 0.8);
      c.curve(19, 17, 14, 14, 9, 13, 'n', 2, 1);
      c.curve(20, 15, 25, 12, 30, 12, 'n', 2, 1);
      c.curve(20, 15, 20, 10, 21, 7, 'n', 1.6, 0.8);
      // The crown fills the top: clumps out to the sides and up to the edge, sky only between them.
      c.blob(9, 8, 8, 5, 'k', 'p', 'w', 23, 0.35);
      c.blob(31, 7, 8.5, 5.5, 'k', 'p', 'w', 24, 0.35);
      c.blob(20, 3, 9, 5, 'k', 'p', 'w', 25, 0.35);
      c.blob(2, 2, 4, 3, 'k', 'p', 'w', 31, 0.35);
      c.blob(38, 1, 4, 3, 'k', 'p', 'w', 32, 0.35);
      c.blob(15, 12, 5, 3, 'k', 'p', undefined, 26, 0.35);
      c.blob(26, 12, 5, 3, 'k', 'p', undefined, 27, 0.35);
      c.speckle('w', 'k', 0.08, 28);
      c.speckle('n', 'p', 0.06, 29);
      c.scatter('kw', 14, 15, 29, 'bsgd');
      c.speckle('k', 'gd', 0.04, 30);
    },
  },
  {
    title: 'Penguin on an ice floe',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1472, strength: 1.75 },
    draw: (c) => {
      c.bands(0, 20, 'bs', 60, 2.5, 9);
      c.blob(32, 5, 2.4, 2.4, 'y', undefined, 'w', 61, 0);
      cloud(c, 9, 4, 9, 71, 's');
      // A far iceberg, then the sea.
      c.poly([2, 20, 5, 13, 8, 15, 11, 11, 14, 20], 's');
      c.poly([6, 20, 8, 15, 11, 11, 10, 20], 'w');
      land(c, 19, 1, 'bbc', 62, 4, 6);
      ripples(c, 21, 29, 's', 'bc', 22, 64);
      ripples(c, 21, 24, 'w', 'b', 6, 65);
      // The floe: a grey side under a white top, and a sky crack.
      c.blob(21, 25.5, 12, 3, 'e', undefined, undefined, 69, 0.35);
      c.blob(20.5, 23, 13, 2.6, 'w', undefined, undefined, 70, 0.35);
      c.curve(15, 22, 18, 23, 21, 22, 's');
      c.curve(27, 26, 26, 27, 28, 28, 's');
      // The penguin, facing right.
      c.blob(20, 15, 5, 7, 'c', undefined, undefined, 66, 0.05);
      c.blob(21.5, 16.5, 3.4, 5.5, 'w', 'e', undefined, 67, 0.08);
      c.blob(20.5, 6.5, 3.6, 3.4, 'c', undefined, undefined, 68, 0.05);
      c.curve(18, 9, 19, 10, 21, 11, 'y', 1.5, 1);
      c.poly([23, 6, 27, 7, 23, 8], 'o');
      c.put(22, 5, 'w');
      c.curve(16, 12, 14, 16, 15, 19, 'c', 2, 1);
      c.curve(19, 22, 19, 23, 17, 22, 'o', 1.5);
      c.curve(22, 22, 23, 23, 25, 22, 'o', 1.5);
    },
  },
  {
    title: 'Volcano island',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1472, strength: 1.75 },
    draw: (c) => {
      c.bands(0, 20, 'bs', 220, 2.5, 9);
      // Smoke billowing over the whole top, sky only in the gaps.
      for (const [x, y, rx, ry, s] of [[20, 5, 6, 4, 221], [12, 2, 6, 3, 222], [29, 3, 7, 3.5, 223], [37, 1, 5, 2.5, 235], [4, 4, 5, 3, 236]] as const)
        c.blob(x, y, rx, ry, 'e', 'c', 'w', s, 0.4);
      // The cone: lit and shaded flanks, each laid in wavy strata of the other's colour.
      c.fill((x, y) => {
        const slope = 7 + Math.abs(x - 20) ** 1.15 * 0.85 + (c.noise(x, 0, 3, 224) - 0.5) * 3;
        if (y < slope || y >= 26) return undefined;
        const shaded = x > 20 + (c.noise(x, y, 3, 225) - 0.5) * 4;
        const p = y + (c.noise(x, 0, 5, 237) - 0.5) * 3 + Math.abs(x - 20) * 0.3;
        const stratum = p - Math.floor(p / 3.5) * 3.5 < 1;
        return shaded !== stratum ? 'c' : 'n';
      });
      // The crater and branching rivers of lava.
      c.blob(20, 7.5, 3.5, 1.2, 'r', undefined, 'y', 226, 0);
      c.curve(19, 8, 16, 14, 12, 23, 'r', 1.8, 1.2);
      c.curve(16, 14, 18, 18, 17, 24, 'r', 1.4, 1);
      c.curve(21, 8, 25, 14, 28, 23, 'o', 1.6, 1.2);
      c.curve(25, 15, 23, 19, 24, 24, 'o', 1.2, 1);
      c.curve(19, 9, 17, 13, 15, 17, 'y');
      c.curve(21, 9, 23, 12, 25, 15, 'y');
      c.blob(20, 5.5, 2, 1.4, 'o', undefined, 'y', 227, 0.2);
      for (const [x, y] of [[16, 5], [24, 4], [18, 3], [23, 6]] as const) c.put(x, y, x % 2 ? 'o' : 'y');
      // The beach, the sea, and a palm at each side.
      land(c, 25, 1, 'bs', 228, 3, 6);
      c.fill((x, y) => {
        const top = 24.5 + (c.noise(x, 0, 5, 229) - 0.5) * 2 + (c.noise(x, 0, 2, 233) - 0.5) * 1.5;
        return y >= top && y < top + 1.6 && Math.abs(x - 20) < 17 + (c.noise(x, 9, 4, 230) - 0.5) * 4 ? 'y' : undefined;
      });
      ripples(c, 26, 29, 'w', 'bs', 12, 231);
      for (const [x, lean, s] of [[4, 2, 232], [36, -2, 238]] as const) {
        c.curve(x, 26, x - lean / 2, 21, x + lean, 17, 'n', 1.4, 1);
        c.blob(x + lean, 16.5, 4, 1.3, 'd', undefined, 'g', s, 0.3);
        c.curve(x + lean, 17, x + lean - 3, 17, x + lean - 4, 20, 'g');
        c.curve(x + lean, 17, x + lean + 3, 17, x + lean + 4, 20, 'd');
      }
    },
  },
  {
    title: 'Chameleon on a branch',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1382, strength: 2 },
    draw: (c) => {
      // Sky behind a canopy of single leaves, each a light leaf with a dark midrib, on dark clumps.
      c.bands(0, 29, 's', 300);
      for (const [x, y, rx, ry, s] of [[5, 3, 8, 5, 301], [33, 2, 9, 5, 302], [20, 0, 6, 3, 308], [3, 27, 6, 4, 309], [37, 27, 5, 4, 310]] as const)
        c.blob(x, y, rx, ry, 'd', undefined, undefined, s, 0.4);
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(hash(i, 1, 311) * 40);
        const y = Math.floor(hash(i, 2, 311) * 30);
        const lean = hash(i, 3, 311) < 0.5 ? -1 : 1;
        c.blob(x, y, 2.2, 1.3, 'g', undefined, undefined, 312 + i, 0.1);
        c.curve(x - 2 * lean, y + 1, x, y, x + 2 * lean, y - 1, 'd');
      }
      c.flower(36, 9, 'k', 'y');
      // The branch, from the lower left up to the right.
      c.curve(0, 27, 20, 25, 40, 20, 'n', 3.5, 3);
      c.curve(0, 28.5, 20, 26.5, 40, 21.5, 'c');
      // The chameleon, big: a long body, a curled tail at the left edge, a crested head.
      c.blob(20, 16, 14, 7, 'o', 'r', undefined, 304, 0.08);
      c.fill((x, y, now) => (now === 'o' && Math.abs(y - (16 + Math.sin(x / 1.6) * 0.9)) < 0.7 ? 'y' : undefined));
      c.blob(33, 14, 6, 4.5, 'o', 'r', undefined, 305, 0.05);
      c.poly([27, 12, 31, 4, 35, 11], 'r');
      c.curve(10, 10.5, 20, 9, 29, 10.5, 'r', 1.4);
      c.blob(34, 14, 2.3, 2.3, 'y', undefined, undefined, 306, 0);
      c.put(34, 14, 'c');
      c.put(35, 14, 'c');
      c.curve(36, 17, 38, 18, 39, 17, 'c');
      for (const x of [12, 25]) c.curve(x, 20, x + 1, 23, x + 3, 24, 'o', 2, 1.4);
      c.speckle('y', 'o', 0.06, 307);
      rim(c, 'oyr', 'dgs', 'c', 6, 3, 39, 26);
      // The curled tail over its rim, which would have eaten it.
      c.curve(8, 18, 0, 19, 1, 11, 'o', 3, 2);
      c.curve(1, 11, 1, 6, 6, 6, 'o', 2, 1.4);
      c.curve(6, 6, 7, 9, 4, 10, 'r', 1.2);
    },
  },
  {
    title: 'Hedgehog with an apple',
    ...LARGE,
    deal: { sceneSeed: 2, buckets: 5, seed: 2583, strength: 2 },
    draw: (c) => {
      c.bands(0, 17, 'bs', 1, 1.5);
      cloud(c, 8, 4, 11, 2);
      cloud(c, 33, 3, 8, 3);
      // Bushes behind at both sides, then the meadow.
      c.blob(3, 14, 7, 6, 'd', undefined, 'g', 6, 0.35);
      c.blob(37, 13, 6, 6, 'd', undefined, 'g', 7, 0.35);
      land(c, 18, 2, 'gd', 4, 6);
      c.speckle('y', 'g', 0.02, 5);
      // The spiny back: a big dome whose rim is a row of saw teeth sweeping back, tips dark.
      c.fill((x, y) => {
        const u = (x - 17) / 14;
        const v = (y - 22) / 11;
        if (v > 0.5) return undefined;
        const r = Math.hypot(u, v);
        const t = ((Math.atan2(-v, u) * 8) / Math.PI + 8) % 1;
        const rim = 0.8 + (v < 0.3 ? 0.22 * t : 0);
        if (r > rim) return undefined;
        return r > 0.78 ? 'c' : 'n';
      });
      // Spines inside, slanting back.
      for (let i = 0; i < 70; i++) {
        const x = 6 + Math.floor(hash(i, 1, 13) * 22);
        const y = 12 + Math.floor(hash(i, 2, 13) * 14);
        if (c.at(x, y) === 'n' && c.at(x - 1, y - 1) === 'n') {
          c.put(x, y, 'c');
          c.put(x - 1, y - 1, 'c');
        }
      }
      // The face, pink, with a long snout to the right.
      c.blob(31, 23.5, 5.5, 4, 'k', undefined, 'w', 9, 0.1);
      c.curve(35, 23, 37, 24, 39, 24.5, 'k', 2.6, 1.5);
      c.put(39, 24, 'c');
      c.put(32, 22, 'c');
      c.put(30, 20, 'n');
      c.put(29, 20, 'n');
      c.blob(24, 28, 2, 1.1, 'c', undefined, undefined, 10, 0);
      c.blob(11, 28, 2, 1.1, 'c', undefined, undefined, 11, 0);
      // An apple caught on the spines.
      c.blob(16, 12, 3.8, 3.3, 'r', 'c', 'w', 12, 0.1);
      c.curve(16, 9, 16, 8, 17, 7, 'n');
      c.curve(17, 8, 19, 7, 20, 8, 'g', 1.5, 0.8);
      c.scatter('kw', 6, 26, 29, 'gd');
    },
  },
  {
    title: 'Flamingo in the shallows',
    ...LARGE,
    deal: { sceneSeed: 2, buckets: 3, seed: 2307, strength: 1.75 },
    draw: (c) => {
      c.bands(0, 17, 'bs', 180, 1.5);
      c.blob(5, 4, 3, 3, 'y', undefined, undefined, 181, 0);
      cloud(c, 32, 5, 10, 188);
      land(c, 16, 2, 'gd', 182, 2, 6);
      land(c, 18, 0.8, 'b', 183, 5, 7);
      // Reflections in wavy light streaks, ripples, and reeds at both sides cutting sky and water.
      streaks(c, 's', 'b', 19, 29, 3, 189, 1, 0.4);
      ripples(c, 19, 29, 'w', 'sb', 14, 185);
      for (const [x, h, col] of [[1, 6, 'd'], [3, 9, 'g'], [5, 12, 'd'], [35, 10, 'd'], [37, 7, 'g'], [39, 11, 'd']] as const) {
        c.curve(x, 29, x + (x > 20 ? -1 : 1), (29 + h) / 2, x, h, col);
        if (col === 'd') c.blob(x, h + 1, 0.8, 1.8, 'n', undefined, undefined, 190 + x, 0);
      }
      // Legs, thin and a little bent, the near one raised.
      c.curve(24, 17, 24, 23, 23, 29, 'k', 1.4);
      c.curve(26, 17, 30, 20, 27, 23, 'k', 1.2);
      c.curve(27, 23, 25, 24, 24, 23, 'k');
      // A big body, the neck an S, the head bent down at the top.
      c.blob(24, 13, 9, 5, 'k', 'p', 'w', 186, 0.15);
      c.curve(32, 12, 36, 11, 35, 16, 'p', 2, 1.4);
      c.curve(18, 15, 25, 18.5, 31, 15, 'p', 1.6);
      c.curve(19, 13, 25, 16, 32, 13, 'r', 1.4);
      c.curve(16, 12, 9, 10, 10, 4, 'k', 3, 2.6);
      c.curve(10, 4, 11, 0.5, 15, 1, 'k', 2.6, 2.4);
      c.blob(15.5, 1.8, 2.4, 1.8, 'k', undefined, undefined, 187, 0);
      c.curve(17, 2, 19.5, 3, 19.5, 6, 'w', 1.8, 1.2);
      c.put(19, 6, 'n');
      c.put(19, 7, 'n');
      c.put(15, 1, 'n');
      c.scatter('w', 4, 0, 14, 'bs');
    },
  },
  {
    title: 'Jellyfish in the deep',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1381, strength: 2 },
    draw: (c) => {
      c.bands(0, 29, 'sbbp', 120, 2, 8);
      c.speckle('s', 'b', 0.04, 121);
      c.speckle('b', 'p', 0.05, 122);
      // Tentacles first, wavy, down to the bottom edge, then the bell over them.
      for (let i = 0; i < 9; i++) {
        const x = 9 + i * 2.7;
        const sway = i % 2 ? 3 : -3;
        c.curve(x, 12, x + sway, 20, x - sway / 2 + 1, 30, i % 3 === 1 ? 'w' : 'k', 1.4, 1);
      }
      c.curve(17, 12, 14, 19, 18, 26, 'k', 2.6, 1.2);
      c.curve(23, 12, 27, 18, 23, 25, 'k', 2.6, 1.2);
      // The bell: a big dome up to the top edge with a scalloped skirt, lit from the upper left, its top
      // rimmed in purple so the pink inside is not open to the water.
      c.fill((x, y) => {
        const u = (x - 20) / 14;
        const v = (y - 9.5) / 9.5;
        const skirt = 0.28 + 0.14 * Math.sin(x * 1.3);
        if (Math.abs(u) > 1 || (v <= 0 ? u * u + v * v > 1 : v > skirt)) return undefined;
        if (v <= 0 && u * u + v * v > 0.8) return 'p';
        if (v > 0 && v > skirt - 0.15) return 'p';
        return u > 0.5 ? 'p' : u < -0.3 && v < -0.4 ? 'w' : 'k';
      });
      c.speckle('w', 'k', 0.05, 125);
      // A few small fish and bubbles.
      for (const [x, y] of [[5, 6], [7, 8], [4, 10], [33, 22], [35, 24]] as const) {
        c.put(x, y, 'y');
        c.put(x + 1, y, 'o');
      }
      for (const [x, y] of [[32, 4], [33, 2], [31, 7], [8, 22], [9, 19]] as const) c.put(x, y, 'w');
      c.curve(36, 29, 38, 24, 36, 18, 'g', 1.5, 1);
      c.curve(2, 29, 1, 25, 3, 21, 'g', 1.5, 1);
    },
  },
  {
    title: 'Whale in the deep sea',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1382, strength: 2 },
    draw: (c) => {
      c.bands(0, 29, 'sbbp', 40, 2, 8);
      // Light falls in slanting shafts from the surface.
      c.fill((x, y, now) => (now === 'b' && c.noise(x + y * 0.5, 0, 4, 41) > 0.66 && hash(x, y, 42) < 0.75 ? 's' : undefined));
      land(c, 26, 1.5, 'yo', 43, 3, 6);
      c.curve(4, 29, 2, 24, 4, 19, 'd', 1.6, 1);
      c.curve(7, 29, 9, 25, 7, 21, 'g', 1.6, 1);
      c.curve(35, 29, 37, 24, 35, 20, 'd', 1.6, 1);
      // The whale swims to the left, its tail rising behind it.
      c.blob(19, 14, 12, 5.5, 'c', undefined, undefined, 44, 0.25);
      c.blob(17, 16.5, 10, 3, 'e', undefined, undefined, 45, 0.25);
      c.curve(29, 14, 33, 12, 35, 8, 'c', 3.5, 1.5);
      c.poly([33, 9, 38, 5, 37, 8, 36, 10, 38, 12, 35, 11], 'c');
      c.curve(15, 18, 13, 22, 10, 22, 'c', 2.5, 1.5);
      for (let i = 0; i < 5; i++) c.line(9 + 3 * i, 16 + (i % 2), 11 + 3 * i, 18 + (i % 2), 'w');
      c.put(11, 13, 'w');
      c.put(11, 12, 'c');
      c.put(10, 13, 'e');
      for (const [x, y] of [[6, 9], [5, 6], [7, 4], [6, 1], [24, 6], [25, 3]] as const) c.put(x, y, 'w');
      for (const [x, y] of [[29, 22], [31, 23], [33, 22], [30, 24], [32, 25]] as const) {
        c.put(x, y, 'o');
        c.put(x + 1, y, 'y');
      }
      c.scatter('w', 8, 0, 25, 'sbp');
    },
  },
  {
    title: 'Frog on a lily pad',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1432, strength: 0.75 },
    draw: (c) => {
      c.bands(0, 29, 'sb', 80, 1.6, 6);
      ripples(c, 0, 29, 'w', 'sb', 26, 81);
      // Reeds at the left.
      c.curve(2, 29, 3, 15, 1, 4, 'd', 1.5, 1);
      c.curve(4, 29, 4, 18, 6, 8, 'g', 1.5, 1);
      c.blob(1.5, 9, 0.9, 2.5, 'n', undefined, undefined, 82, 0);
      c.blob(6, 12, 0.9, 2.5, 'n', undefined, undefined, 83, 0);
      // A lotus on its own pad at the right.
      c.blob(34, 24, 5, 2.2, 'd', undefined, 'g', 84, 0.2);
      c.poly([31, 22, 32, 18, 34, 21, 36, 18, 37, 22], 'k');
      c.poly([33, 22, 34, 17, 35, 22], 'w');
      c.put(34, 21, 'y');
      // The big pad with its notch, and the frog on it.
      c.blob(18, 22, 13, 5, 'd', undefined, 'g', 85, 0.15);
      c.poly([18, 22, 22, 28, 25, 28], 'b');
      c.curve(10, 22, 14, 23, 18, 22, 'g');
      c.curve(18, 22, 22, 21, 27, 19, 'g');
      c.blob(18, 17, 7, 5, 'g', 'd', 'y', 86, 0.1);
      c.blob(19, 19.5, 4, 2.4, 'y', undefined, 'w', 87, 0.1);
      c.blob(14, 11.5, 2.4, 2.2, 'g', 'd', undefined, 88, 0);
      c.blob(22, 11.5, 2.4, 2.2, 'g', 'd', undefined, 89, 0);
      c.blob(14, 11.5, 1.3, 1.3, 'w', undefined, undefined, 90, 0);
      c.blob(22, 11.5, 1.3, 1.3, 'w', undefined, undefined, 91, 0);
      c.put(14, 12, 'c');
      c.put(22, 12, 'c');
      c.curve(15, 15, 18, 16.5, 21, 15, 'c');
      c.curve(12, 19, 9, 22, 11, 23, 'g', 2, 1.2);
      c.curve(24, 19, 27, 22, 25, 23, 'g', 2, 1.2);
      c.speckle('d', 'g', 0.05, 92);
      c.put(17, 14, 'r');
    },
  },
  {
    title: 'Fox asleep in the snow',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1371, strength: 1.75 },
    draw: (c: Canvas) => {
      // Dusk: blue sky over a pink glow; firs, the far ones charcoal, the near ones dark green, snow on each tier.
      c.bands(0, 17, 'bbbpk', 640, 1.5, 8);
      for (const [x, top, bot, w] of [[30, 5, 15, 3], [25, 8, 15, 2.5]] as const) pine(c, x, top, bot, w, 'c');
      for (const [x, top, bot, w] of [[2, 3, 17, 4.2], [36, 1, 18, 5.5]] as const) pine(c, x, top, bot, w, 'd');
      c.fill((x, y, now) => ('cd'.includes(now) && y < 18 && 'bpk'.includes(c.at(x, y - 1) ?? 'b') && hash(x, y, 648) < 0.75 ? (now === 'd' ? 'w' : 'e') : undefined));
      // Snow, with blue and grey shadows.
      land(c, 15, 1.2, 'w', 642, 99, 8);
      c.fill((x, y, now) => (now === 'w' && y > 14 && c.noise(x, y, 4, 643) > 0.64 ? 's' : undefined));
      c.fill((x, y, now) => (now === 'w' && y > 14 && c.noise(x, y, 3, 644) < 0.22 ? 'e' : undefined));
      c.blob(21, 21, 20, 9, 's', 'e', undefined, 645, 0.2);
      c.blob(11, 19, 9, 4.5, 's', undefined, undefined, 649, 0.2);
      // The fox, curled up: the body behind, the tail wrapped round the front, and the face turned to us,
      // eyes shut, the chin resting on the tail.
      c.blob(10, 26.5, 10, 3.2, 's', undefined, undefined, 650, 0.2);
      c.blob(26, 17, 12, 7, 'r', undefined, undefined, 646, 0.15);
      c.fill((x, y, now) => (now === 'r' && y > 18 && x > 30 + (c.noise(x, y, 3, 651) - 0.5) * 4 ? 'n' : undefined));
      c.curve(29, 11.5, 32.5, 16.5, 30.5, 22, 'n', 1);
      c.curve(37, 21, 34, 29.5, 17, 26, 'r', 6.2, 5);
      c.curve(36.5, 20.5, 33.5, 28, 17, 25.2, 'o', 4.6, 3.8);
      c.curve(36.5, 18.5, 33, 26.5, 17, 23.2, 'n', 1, 1);
      c.curve(18, 25.3, 11, 26.6, 6, 25, 'r', 4.8, 3.8);
      c.curve(18, 24.8, 11, 26, 6, 24.6, 'o', 3.8, 3);
      c.blob(4, 24.6, 2.6, 2, 'w', undefined, undefined, 652, 0.2);
      sprite(c, 6, 9, [
        '.c...........c.',
        '.cc.........cc.',
        '.cwo.......owc.',
        '.owoo.....oowo.',
        '.ooooooooooooo.',
        'ooooooooooooooo',
        'ooocoooooooocoo',
        'ooooccoooccoooo',
        '.wwwooooooowww.',
        '..wwwwooowwww..',
        '...wwwwcwwww...',
        '.....wwwww.....',
      ]);
      // Falling snow, and a few flakes settled on the fur.
      c.scatter('w', 25, 0, 16, 'bpk');
      c.speckle('w', 'or', 0.025, 647);
    },
  },
  {
    title: 'Fireworks over a harbour',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1452, strength: 1.25 },
    overrides: { c: 'v' },
    draw: (c: Canvas) => {
      c.fill((x, y) => (c.noise(x, y, 7, 1) + y / 40 > 0.72 ? 'b' : 'c'));
      c.fill((x, y) => (y >= 15 + (c.noise(x, 0, 6, 31) - 0.5) * 4 + c.wobble(x, y, 32) ? 'b' : undefined));
      // Drifting smoke from earlier bursts.
      c.fill((x, y) => (y < 20 && c.noise(x, y, 5, 30) > 0.68 ? 'e' : undefined));
      const bursts: [number, number, number, string, string, string, number][] = [
        [11, 9, 9.5, 'y', 'o', 'p', 13],
        [29, 7, 8, 'k', 'r', 'p', 11],
        [32, 17, 5, 'g', 'y', 'd', 9],
        [5, 19, 4, 'o', 'r', 'n', 7],
      ];
      for (const [bx, by, R, ray, tip, glow, nR] of bursts)
        c.fill((x, y) => {
          const d = Math.hypot(x - bx, y - by);
          if (d > R + 1.6) return undefined;
          const th = (Math.atan2(y - by, x - bx) * nR) / (2 * Math.PI) + 0.13 * bx;
          const off = Math.abs(th - Math.round(th)) * ((2 * Math.PI) / nR) * d;
          if (d < 1.3) return 'w';
          if (off < 0.62 && d <= R * 0.6) return ray;
          if (off < 0.62 && d <= R + 0.5) return tip;
          if (off < 0.55) return hash(x, y, bx) < 0.6 ? 'w' : undefined;
          return d < R * 0.55 + (c.noise(x, y, 2, bx) - 0.5) * 2 ? glow : undefined;
        });
      // Stray sparks anywhere in the night.
      c.speckle('w', 'cb', 0.02, 20);
      c.speckle('y', 'cb', 0.012, 21);
      c.speckle('k', 'cb', 0.008, 22);
      // A rocket trail rising.
      for (let y = 22; y >= 13; y--) if (hash(20, y, 23) < 0.65) c.put(20 + Math.round((22 - y) * 0.2), y, 'o');
      // The town along the quay, lit windows, a spire.
      const tops = [21, 19, 20, 17, 19, 21, 18, 20, 16, 19, 20, 18, 21, 19];
      c.fill((x, y) => {
        const top = tops[Math.floor(x / 3)]! + (x % 3 === 0 && hash(x, 0, 24) < 0.4 ? 1 : 0);
        if (y < top || y > 23) return undefined;
        return y > top && hash(x, y, 25) < 0.2 ? (hash(x, y, 26) < 0.5 ? 'y' : 'o') : 'c';
      });
      c.curve(26, 16, 26, 15, 26, 13, 'c', 1);
      c.put(26, 12, 'r');
      // Harbour water with the bursts mirrored as broken streaks; a sailing boat.
      c.fill((x, y) => (y >= 24 + c.wobble(x, y, 27) * 0.6 ? (c.noise(x, y, 4, 28) > 0.45 ? 'b' : 'c') : undefined));
      c.fill((x, y, now) => {
        if (y < 25 || !'bc'.includes(now)) return undefined;
        const h = hash(x, y, 29);
        if (Math.abs(x - 11) < 4 && h < 0.4) return h < 0.2 ? 'y' : 'o';
        if (Math.abs(x - 29) < 3 && h < 0.35) return 'k';
        return undefined;
      });
      c.poly([14, 25, 22, 25, 21, 27, 15, 27], 'n');
      c.curve(18, 24, 18, 21, 18, 18, 'e', 1);
      c.poly([18.5, 18, 22, 24, 18.5, 24], 'w');
    },
  },
  {
    title: 'Snow monkey in a hot spring',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1362, strength: 1.5 },
    draw: (c: Canvas) => {
      // Dark pines with snow on the boughs; snow falling; snowy rocks at the water.
      c.fill((x, y) => (c.noise(x, y, 5, 1) > 0.6 ? 'g' : 'd'));
      streaks(c, 'w', 'dg', 0, 16, 4, 2, 1, 0.55);
      c.speckle('w', 'dg', 0.04, 5);
      c.blob(3, 22, 7, 5, 'c', undefined, 'e', 3, 0.3);
      c.blob(3, 17.5, 6, 2, 'w', undefined, undefined, 30, 0.35);
      c.blob(37, 21, 7, 6, 'c', undefined, 'e', 4, 0.3);
      c.blob(37, 15.8, 6, 2, 'w', undefined, undefined, 31, 0.35);
      // The monkey: shoulders out of the water, head with a cap of snow.
      c.blob(20, 23, 15, 7, 'e', 'n', undefined, 6, 0.2);
      c.blob(20, 12, 9.5, 8.5, 'e', undefined, undefined, 7, 0.2);
      c.blob(19.5, 4.6, 5, 1.8, 'w', undefined, undefined, 8, 0.35);
      c.speckle('w', 'e', 0.05, 9);
      sprite(c, 15, 9, [
        '..kkkkkkk..',
        '.kkkkkkkkk.',
        'krrrrkrrrrk',
        'kkcckkkcckk',
        'kkkkkkkkkkk',
        '.kkkkrkkkk.',
        '.kkkrkrkkk.',
        '..kkkkkkk..',
        '..krrrrrk..',
        '...kkkkk...',
      ]);
      // Hot water over the chest, steaming.
      c.fill((x, y) => (y >= 23 + c.wobble(x, y, 11) + (c.noise(x, 0, 6, 12) - 0.5) * 2 ? (c.noise(x, y, 4, 13) > 0.55 ? 'b' : 's') : undefined));
      ripples(c, 25, 29, 'w', 'sb', 7, 14);
      streaks(c, 'w', 'sbc', 20, 24, 3, 15, 1, 0.6);
    },
  },
  {
    title: 'Octopus in a rock pool',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1381, strength: 2 },
    draw: (c: Canvas) => {
      // The pool: deep blue, shallow sky blue, pale sand on its floor.
      c.fill((x, y) => {
        const n = c.noise(x, y, 6, 791) + (c.noise(x, y, 2.5, 792) - 0.5) * 0.3;
        return n < 0.42 ? 'b' : n < 0.7 ? 's' : c.noise(x, y, 3, 793) > 0.5 ? 'e' : 's';
      });
      ripples(c, 0, 29, 'w', 'bs', 14, 794);
      // Rocks round the rim, with seaweed, an anemone and a starfish.
      for (const [x, y, rx, ry, s] of [[1, 2, 6, 5, 800], [39, 3, 5, 6, 801], [2, 28, 7, 4, 802], [38, 28, 6, 4, 803], [21, -1, 5, 2.2, 804]] as const)
        c.blob(x, y, rx, ry, 'e', 'c', 'w', s, 0.35);
      c.curve(6, 26, 8, 22, 6, 19, 'd', 1.6, 0.8);
      c.curve(8, 26, 11, 23, 10, 20, 'g', 1.4, 0.8);
      c.curve(35, 4, 33, 7, 34, 10, 'd', 1.4, 0.8);
      c.blob(35, 22, 2.4, 2, 'k', 'p', undefined, 805, 0.4);
      c.put(35, 22, 'p');
      spriteFlip(c, ['..p..', 'ppppp', '.ppp.', 'p...p'], 2, 12);
      // The octopus: eight arms curling out from under the head, red with orange edges and pink suckers.
      const arms = [
        [17, 13, 9, 4, 4, 6, 1, 9, 4, 11],
        [16, 15, 7, 13, 2, 17, 0, 21, 4, 21],
        [17, 17, 12, 24, 6, 27, 2, 29, 2, 25],
        [19, 18, 18, 25, 14, 30, 14, 30, 14, 30],
        [21, 18, 23, 25, 27, 28, 31, 29, 30, 25],
        [23, 17, 30, 22, 34, 19, 38, 17, 35, 15],
        [24, 15, 32, 13, 36, 8, 38, 4, 35, 5],
        [23, 12, 29, 6, 29, 2, 28, -1, 26, 1],
      ] as const;
      for (const [x0, y0, bx, by, x1, y1, cx, cy, x2, y2] of arms) {
        c.curve(x0, y0, bx, by, x1, y1, 'r', 4, 2.2);
        c.curve(x1, y1, cx, cy, x2, y2, 'r', 2.2, 1);
      }
      // Pale undersides on one edge of each arm, in broken runs, and pink suckers.
      const edge: [number, number][] = [];
      c.fill((x, y, now) => {
        if (now === 'r' && 'bsewk'.includes(c.at(x + 1, y + 1) ?? 'b') && c.noise(x, y, 2, 806) > 0.35) edge.push([x, y]);
        return undefined;
      });
      for (const [x, y] of edge) c.put(x, y, 'o');
      c.speckle('k', 'r', 0.1, 806);
      c.blob(20, 13.5, 5, 3.5, 'r', undefined, undefined, 807, 0.15);
      c.blob(20, 8.5, 6.5, 6.2, 'r', 'n', 'o', 808, 0.15);
      c.fill((x, y, now) => (now === 'r' && c.noise(x, y, 1.8, 809) > 0.74 ? 'n' : undefined));
      c.fill((x, y, now) => (now === 'n' && y < 15 && c.noise(x, y, 1.5, 810) > 0.7 ? 'o' : undefined));
      const eye = ['.yy', 'yyy', 'ccy'];
      spriteFlip(c, eye, 15, 11);
      spriteFlip(c, eye, 22, 11, true);
      c.put(16, 11, 'w');
      c.put(23, 11, 'w');
    },
  },
  {
    title: 'Nebula pillars in infrared',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1432, strength: 0.75 },
    draw: (c) => {
      // Towers of cold dust rising from the bottom into glowing gas, in an infrared telescope's false
      // colours: the gas in clouds of sky and blue with purple rifts and a gold haze, the pillars
      // brown with charcoal cores and a lit orange skin, red where their tips boil away. Young stars glow
      // red inside the dust, and stars of every colour lie over the gas.
      c.fill((x, y) => {
        const n = c.noise(x, y, 7, 420) + (c.noise(x, y, 3, 421) - 0.5) * 0.5 + c.wobble(x, y, 422) * 0.08;
        if (n >= 0.76) return c.noise(x, y, 2, 423) > 0.6 ? 'w' : 'y';
        return n < 0.34 ? 'p' : n < 0.54 ? 'b' : 's';
      });
      // Three pillars, each a chain of rough blobs that narrows to its tip.
      const pillars = [
        [7, 30, 12, 14, 15, 3, 5.5, 1.8],
        [22, 30, 21, 20, 24, 11, 4.5, 1.6],
        [35, 30, 33, 23, 31, 17, 3.5, 1.4],
      ] as const;
      pillars.forEach(([x0, y0, bx, by, x1, y1, w0, w1], p) => {
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          const px = (1 - t) ** 2 * x0 + 2 * (1 - t) * t * bx + t * t * x1;
          const py = (1 - t) ** 2 * y0 + 2 * (1 - t) * t * by + t * t * y1;
          const r = w0 + (w1 - w0) * t;
          c.blob(px, py, r, r * 1.2, 'n', undefined, undefined, 430 + 10 * p + i, 0.45);
        }
      });
      // Dark cores in the dust, the lit skin round it, red where the tips boil away in wisps, and embedded
      // young stars.
      c.fill((x, y, now) => (now === 'n' && c.noise(x, y, 2.8, 470) > 0.62 ? 'c' : undefined));
      rim(c, 'nc', 'pbsy', 'o', 0, 0, 39, 29);
      pillars.forEach(([, , , , x1, y1, , w1], p) => {
        c.fill((x, y, now) => ((now === 'o' || now === 'n') && Math.abs(x - x1) <= w1 + 3 && y <= y1 + 1 + hash(x, y, 476 + p) * 2 ? 'r' : undefined));
        c.put(x1 + 1, y1 - 1, 'k');
        c.put(x1 + 1, y1 - 2, 'r');
      });
      c.speckle('k', 'r', 0.2, 477);
      c.speckle('r', 'nc', 0.05, 471);
      c.speckle('k', 'o', 0.08, 472);
      // Stars over the gas.
      c.speckle('w', 'pb', 0.04, 473);
      c.speckle('y', 'pb', 0.02, 474);
      c.speckle('o', 's', 0.02, 475);
      for (const [x, y] of [[33, 5], [4, 20], [28, 25], [18, 4]] as const) starCross(c, x, y, 'w', 'k');
    },
  },
  {
    title: 'Toucan in the rainforest',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1362, strength: 1.5 },
    draw: (c: Canvas) => {
      // Rainforest: big leaves in two greens, gold light between them, a hanging vine.
      c.fill((x, y) => {
        const n = c.noise(x, y, 5, 811);
        return n < 0.28 ? 's' : c.noise(x, y, 3, 812) > 0.5 ? 'g' : 'd';
      });
      leaf(c, 6, 19, 6, 2.6, 0.7, 'g', 'd');
      leaf(c, 13, 17, 5, 2, -0.5, 'd', 'g');
      leaf(c, 36, 6, 5, 2.4, 2.2, 'g', 'd');
      leaf(c, 3, 3, 5, 2.2, 0.3, 'd', 'g');
      leaf(c, 37, 15, 4, 1.8, 1.4, 'd', 'g');
      c.curve(17, -1, 15, 8, 19, 17, 'n', 1, 1);
      // The branch, lit on top and dark underneath, with moss.
      c.curve(-1, 25, 20, 21, 41, 24, 'n', 4, 3.4);
      c.fill((x, y, now) => (now === 'n' && y > 16 && c.at(x, y + 1) !== 'n' ? 'c' : undefined));
      c.fill((x, y, now) => (now === 'n' && y > 16 && c.at(x, y - 1) !== 'n' && c.noise(x, y, 2, 813) > 0.45 ? 'g' : undefined));
      // The toucan perched on it: a black body and tail, a red patch under the tail, a white bib.
      c.curve(32, 21, 35, 26, 36, 31, 'c', 4.6, 3.6);
      c.blob(29.5, 15.5, 8, 10, 'c', undefined, undefined, 814, 0.15);
      // A faint sheen on the folded wing.
      c.curve(33, 9, 36, 14, 34, 21, 'e', 1, 1);
      c.blob(30.5, 23, 2.5, 1.5, 'r', undefined, undefined, 815, 0.1);
      c.blob(27.5, 6.5, 5, 4.4, 'c', undefined, undefined, 816, 0.1);
      c.blob(25.5, 12, 3.4, 4, 'w', 'y', undefined, 817, 0.1);
      for (const x of [27, 29, 30]) c.put(x, 23, 'e');
      // Its eye in a patch of blue skin, and the great orange beak with a gold ridge, a red edge and a dark tip.
      spriteFlip(c, ['.bbb', 'bocb', '.bbb'], 26, 5);
      // The beak: a ridge arching from the forehead down to the tip, a nearly straight underside.
      c.fill((x, y) => {
        if (x < 2 || x > 23) return undefined;
        const t = (x + 0.5 - 2) / 21.5;
        const top = 11.9 - 7.8 * (0.65 * t + 0.35 * Math.sin((t * Math.PI) / 2));
        const bottom = 12 + 0.6 * t;
        if (y + 0.5 < top || y + 0.5 > bottom) return undefined;
        const depth = (y + 0.5 - top) / (bottom - top);
        if (x < 5 && depth < 0.85) return 'c';
        if (Math.abs(depth - 0.72 - (c.noise(x, y, 3, 818) - 0.5) * 0.1) < 0.09 && x > 3) return 'r';
        if (depth < 0.2 && x > 6) return 'y';
        return 'o';
      });
    },
  },
  {
    // Level 50's picture, mirrored.
    title: 'Rabbit in a meadow',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1371, strength: 1.75 },
    mirror: true,
    draw: (c) => (SCENES[49] as Scene).draw(c),
  },
  {
    title: 'Mushroom house at night',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1382, strength: 2 },
    draw: (c: Canvas) => {
      // Night sky, charcoal above, blue lower, a purple glow at the hills; stars and a moon.
      c.bands(0, 26, 'cbbbp', 630, 1.8, 7);
      c.scatter('w', 14, 0, 16, 'cb');
      c.scatter('y', 5, 0, 16, 'cbp');
      c.blob(5, 4, 3.3, 3, 'y', 'o', 'w', 631, 0.08);
      // Grass in the dark, in two greens.
      land(c, 24.5, 1.2, 'dgd', 633, 2.2, 7);
      // The stem, grey, lit white by the moon on the left and charcoal in the shade on the right.
      c.poly([10.5, 29.5, 11.5, 23, 13.2, 15.5, 26.8, 15.5, 28.5, 23, 29.5, 29.5], 'e');
      c.fill((x, y, now) => (now === 'e' && y >= 15 && x < 14.8 + (c.noise(x, y, 3, 635) - 0.5) * 3 ? 'w' : undefined));
      c.fill((x, y, now) => (now === 'e' && y >= 15 && x > 26.3 + (c.noise(x, y, 3, 636) - 0.5) * 2.5 ? 'c' : undefined));
      // The cap: a red dome whose lip droops at the sides, dark gills under it.
      c.fill((x, y) => {
        const u = (x - 20) / 19.6;
        const v = (y - 14.5) / 12.5;
        const n = c.noise(x, y, 3, 637) - 0.5;
        const lip = 13.2 + 2.6 * u * u + c.wobble(x, 0, 638) * 0.5;
        if (u * u + v * v > 1 + n * 0.25 || y > lip + 1.6) return undefined;
        if (y > lip) return Math.abs(u) < 0.9 ? 'c' : undefined;
        if (y > lip - 1.2 + n) return 'n';
        const t = 0.75 * u - (0.55 * (14.5 - y)) / 12.5 + n * 0.6;
        if (t > 0.3) return 'n';
        if (t < -0.75) return 'k';
        return 'r';
      });
      for (const [x, y, r] of [[9, 9, 1.8], [15, 5, 1.5], [22, 4, 1.2], [27, 8, 1.9], [33, 11, 1.4], [18, 10, 1.1], [5, 12.5, 1], [12, 13, 0.8], [25, 12.5, 0.9]] as const)
        c.fill((px, py, now) => ('rnk'.includes(now) && (px - x) ** 2 + (py - y) ** 2 <= r * r + (c.noise(px, py, 1.5, 639) - 0.5) * 1.5 ? (now === 'n' ? 'e' : 'w') : undefined));
      // A chimney with a wisp of smoke.
      c.poly([31.5, 7, 34.8, 6.5, 34.3, 2.3, 31.8, 2.6], 'n');
      c.put(33, 3, 'c');
      c.curve(33, 1.6, 35, 0, 39, 0.5, 'e', 1.6, 1.2);
      // Two round lit windows and a door.
      for (const [x, y] of [[15, 19], [25, 18]] as const) {
        c.blob(x, y, 2.5, 2.5, 'n', undefined, undefined, 640, 0.05);
        c.blob(x, y, 1.5, 1.5, 'y', undefined, undefined, 641, 0);
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]] as const) c.put(x + dx, y + dy, 'o');
      }
      c.fill((x, y) => (x >= 18 && x <= 22 && y >= 21.5 + (x - 20) ** 2 * 0.35 && y <= 28 ? 'n' : undefined));
      c.put(21, 25, 'o');
      c.poly([17.5, 28.5, 22.5, 28.5, 23.5, 29.5, 16.5, 29.5], 'c');
      // Fireflies.
      c.speckle('y', 'dg', 0.04, 642);
    },
  },
  {
    title: 'Lion resting at dusk',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1342, strength: 1 },
    draw: (c: Canvas) => {
      c.bands(0, 17, 'bpk', 1, 1.6, 8);
      c.blob(32, 6, 3.6, 3.6, 'y', undefined, 'w', 2, 0.1);
      land(c, 16, 1.5, 'cd', 3, 6, 7);
      c.blob(37, 11, 5, 1.3, 'c', undefined, undefined, 4, 0.3);
      c.curve(37, 16, 37, 14, 36, 12, 'c', 1);
      c.blob(20, 30, 24, 6, 'e', 'c', undefined, 5, 0.25);
      // Body lying to the right, haunch, forelegs stretched left, tail.
      c.blob(24, 19.5, 12, 5, 'o', 'n', 'y', 6, 0.15);
      c.blob(32, 18.5, 5.5, 5.5, 'o', 'n', 'y', 7, 0.15);
      c.blob(8, 24, 7, 2.2, 'o', 'n', 'y', 8, 0.15);
      c.curve(37, 21, 39, 25, 34, 26, 'o', 1);
      c.put(33, 26, 'c');
      c.put(33, 25, 'c');
      c.put(32, 26, 'c');
      // Head: a big mane and a face looking at us.
      c.blob(10, 13, 7.5, 8, 'n', undefined, 'o', 9, 0.3);
      c.speckle('r', 'n', 0.06, 11);
      sprite(c, 4, 5, ['.oo', 'onn', '.o.']);
      sprite(c, 13, 5, ['oo.', 'nno', '.o.']);
      sprite(c, 6, 8, [
        '..ooooo..',
        '.oyyoyyo.',
        'oyyyoyyyo',
        'ocyyyyyco',
        'oyyyoyyyo',
        '.oyywyyo.',
        '.oywkwyo.',
        '.owwcwwo.',
        '..owwwo..',
        '...ooo...',
      ]);
      c.speckle('y', 'cd', 0.03, 10);
    },
  },
  {
    title: 'Owl in a hollow by day',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1372, strength: 1.75 },
    draw: (c: Canvas) => {
      // Leaves and sky round a broad trunk.
      c.fill((x, y) => (c.noise(x, y, 4, 670) > 0.5 ? 'g' : c.noise(x, y, 3, 671) > 0.6 ? 'd' : undefined));
      c.fill((x, y) => {
        const l = 4 + (c.noise(0, y, 6, 672) - 0.5) * 3 + c.wobble(0, y, 673) * 0.6;
        const r = 35.5 + (c.noise(9, y, 6, 674) - 0.5) * 3 + c.wobble(9, y, 675) * 0.6;
        return x >= l && x <= r ? 'n' : undefined;
      });
      c.fill((x, y, now) => (now === 'n' && c.noise(x * 2.2, y * 0.35, 2, 676) > 0.64 ? 'c' : undefined));
      c.fill((x, y, now) => ('nc'.includes(now) && y > 23 && c.noise(x, y, 3, 677) > 0.6 ? 'g' : undefined));
      // The hollow: a lip of bare wood, dark inside.
      c.blob(20, 15, 12.2, 14, 'e', 'c', 'w', 678, 0.1);
      c.blob(20, 15, 10.8, 12.8, 'c', undefined, undefined, 679, 0.1);
      // A barn owl dozing in it: golden back and wings, white breast with dark dots, a heart-shaped face.
      c.blob(20, 22.5, 9.2, 7, 'o', 'n', 'y', 680, 0.1);
      c.blob(20, 22.5, 6, 6.2, 'w', undefined, undefined, 681, 0.1);
      c.fill((x, y, now) => (now === 'w' && y > 17 && hash(x, y, 682) < 0.07 ? 'n' : undefined));
      c.fill((x, y, now) => (now === 'o' && y > 16 && hash(x, y, 683) < 0.08 ? 'w' : undefined));
      c.blob(20, 10.5, 9.5, 7.3, 'o', 'n', 'y', 684, 0.08);
      const heart = (x: number, y: number, g: number): boolean =>
        (x - 16.6) ** 2 + (y - 10.5) ** 2 <= (4.2 + g) ** 2 || (x - 23.4) ** 2 + (y - 10.5) ** 2 <= (4.2 + g) ** 2 || (y >= 10.5 && y <= 18.5 + g - 1.35 * Math.abs(x - 20));
      c.fill((x, y) => (heart(x, y, 1) ? 'n' : undefined));
      c.fill((x, y) => (heart(x, y, 0) ? 'w' : undefined));
      for (const [x, y] of [[15, 11], [16, 12], [17, 12], [18, 11], [22, 11], [23, 12], [24, 12], [25, 11]] as const) c.put(x, y, 'c');
      c.put(20, 14, 'e');
      c.put(20, 15, 'e');
      for (const x of [16, 17, 23, 24]) c.put(x, 28, 'k');
      // A leafy twig over the corner, and a ladybird on the bark.
      c.curve(39, 1, 34, 1.5, 28, 4, 'n', 1.5, 1);
      c.blob(31, 2, 3, 1.6, 'g', 'd', undefined, 685, 0.3);
      c.blob(36, 3.5, 2.6, 1.6, 'g', 'd', undefined, 686, 0.3);
      sprite(c, 6, 20, ['rc', 'rr']);
    },
  },
  {
    title: 'Spiral galaxy in infrared',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 3, seed: 3381, strength: 2 },
    overrides: { c: 'v' },
    draw: (c) => {
      // A spiral galaxy seen nearly face on, in the false colours of an infrared telescope: a white core in
      // a yellow and orange bulge, two arms of glowing red dust with brown lanes on their inner side and
      // pink knots where stars are born, a purple and blue haze between the arms, and deep space round it
      // in charcoal (painted navy), the same dark that opens holes in the haze. Stars of every colour lie anywhere, in front
      // of the galaxy and behind it.
      const cx = 20;
      const cy = 15;
      const tilt = 0.35;
      const R = 21;
      c.fill((x, y) => {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const u = dx * Math.cos(tilt) + dy * Math.sin(tilt);
        const v = (-dx * Math.sin(tilt) + dy * Math.cos(tilt)) * 1.35;
        const r = Math.hypot(u, v);
        const n = c.noise(x, y, 4, 401) - 0.5;
        // Deep space, with clouds of faint brown dust: the colour of the lanes deep in the arms.
        if (r > R * (1 + 0.25 * n) + c.wobble(x, y, 402)) return c.noise(x, y, 2.6, 403) > 0.62 ? 'n' : 'c';
        if (r < 1.6) return 'w';
        if (r < 3.2 + n * 1.5) return 'y';
        if (r < 4.8 + n * 2) return 'o';
        const phase = Math.atan2(v, u) - Math.log(r + 1) * 3.2 + n * 1.4;
        // The arm glows red, with a thin bright filament of orange along its crest.
        if (Math.cos(2 * phase) > 0.55) return r < 8 || (Math.cos(2 * phase) > 0.93 && r < 17) ? 'o' : 'r';
        if (Math.cos(2 * phase + 0.9) > 0.75) return 'n';
        // Between the arms a haze, purple near the bulge and blue further out, opened by dark holes.
        if (c.noise(x, y, 3, 409) > 0.66) return 'c';
        if (r < 9 + n * 3) return 'p';
        return r < 13 + n * 4 || c.noise(x, y, 2.5, 410) > 0.6 ? 'b' : 'c';
      });
      // Knots of young stars along the arms, and blue stars in the haze.
      c.speckle('k', 'r', 0.12, 404);
      c.speckle('s', 'pb', 0.07, 405);
      // Stars and far galaxies in deep space: single squares, and a few small red smudges.
      c.speckle('w', 'c', 0.05, 406);
      c.speckle('s', 'c', 0.03, 407);
      c.speckle('y', 'c', 0.02, 408);
      for (const [x, y] of [[3, 25], [35, 3], [37, 21], [6, 4]] as const) {
        c.put(x, y, 'r');
        c.put(x + 1, y, 'o');
      }
      // Bright stars in front, each with the cross of light a telescope's mirror gives it.
      for (const [x, y] of [[8, 9], [31, 24], [27, 5], [14, 23]] as const) starCross(c, x, y, 'w', 's');
    },
  },
  {
    // Level 58's picture, mirrored.
    title: 'Whale in the deep sea',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1362, strength: 1.5 },
    mirror: true,
    draw: (c) => (SCENES[57] as Scene).draw(c),
  },
  {
    title: 'Goldfish pond from above',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 5, seed: 1572, strength: 1.75 },
    draw: (c: Canvas) => {
      // Grass in the corners, a ring of stones, the water inside.
      c.bands(0, 29, 'gdg', 640, 2, 5);
      c.blob(20, 15, 22.5, 16.5, 'e', undefined, undefined, 641, 0.12);
      c.fill((x, y, now) => (now === 'e' ? (c.noise(x, y, 1.6, 642) < 0.4 ? 'c' : c.noise(x, y, 1.6, 643) > 0.65 ? 'w' : undefined) : undefined));
      c.blob(20, 15, 20.5, 14.6, 'b', undefined, undefined, 644, 0.12);
      c.fill((x, y, now) => (now === 'b' && c.noise(x, y, 4, 645) > 0.57 ? 's' : undefined));
      // Lily pads, each with its notch, and two flowers.
      for (const [x, y, r, a, s] of [[7, 6, 5.2, 0.7, 646], [33, 24, 5, 3.6, 647], [16, 4, 2.4, 2.2, 649], [6, 23, 2.8, 5.2, 648], [4.5, 15, 2.6, 0.2, 657], [36.5, 16.5, 2.8, 4, 658]] as const) {
        c.blob(x, y, r, r * 0.85, 'g', 'd', undefined, s, 0.1);
        c.fill((px, py, now) => {
          if (!'gd'.includes(now) || Math.hypot((px + 0.5 - x) / r, (py + 0.5 - y) / (r * 0.85)) > 1.3) return undefined;
          const ang = Math.atan2(py + 0.5 - y, px + 0.5 - x) - a;
          const d = Math.atan2(Math.sin(ang), Math.cos(ang));
          return Math.abs(d) < 0.3 && Math.hypot(px + 0.5 - x, py + 0.5 - y) > 0.8 ? 'b' : undefined;
        });
      }
      c.blob(7.5, 5.5, 1.9, 1.7, 'k', 'p', undefined, 651, 0);
      c.put(7, 5, 'y');
      c.blob(33.5, 23.5, 1.9, 1.7, 'w', 'e', undefined, 652, 0);
      c.put(33, 23, 'y');
      // Three fish: a big goldfish across the pond, a red and white koi, a little gold one.
      const fish: [number, number, number, number, number, number, string, string, string, string, number][] = [
        [19.5, 15, -0.3, 16.5, 4.2, -0.04, 'o', 'r', 'y', 'y', 653],
        [24, 24.5, Math.PI - 0.15, 9, 2.6, -0.05, 'w', 'r', 'w', 'r', 654],
        [31, 6.5, -2.6, 7, 2.1, 0.05, 'y', 'o', 'o', 'o', 655],
      ];
      for (const [x, y, a, l, w, b, body, patch, fin, spine, s] of fish) {
        const part = fishPart(x, y, a, l, w, b);
        c.fill((px, py) => {
          const p = part(px, py);
          if (!p) return undefined;
          if (p === 'fin' || p === 'tail') return fin;
          if (p === 'spine') return spine;
          return c.noise(px, py, 2.2, s) > 0.64 ? patch : body;
        });
        for (const side of [-1, 1]) {
          const t = 0.55 * l;
          const v = side * (w * 0.66 + 0.2);
          c.put(Math.floor(x + t * Math.cos(a) - v * Math.sin(a)), Math.floor(y + t * Math.sin(a) + v * Math.cos(a)), 'c');
        }
      }
      ripples(c, 2, 20, 'w', 'bs', 4, 656);
    },
  },
  {
    title: "Bird's nest with eggs",
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1361, strength: 1.5 },
    draw: (c: Canvas) => {
      // Leaves of a tree in two greens, and sky between them, blue and pale.
      c.fill((x, y) => {
        const n = c.noise(x, y, 5, 781);
        if (n < 0.26) return c.noise(x, y, 3, 784) > 0.6 ? 'w' : 's';
        return c.noise(x, y, 3, 782) > 0.55 ? 'g' : 'd';
      });
      leaf(c, 6, 5, 4, 1.8, 0.5, 'g', 'd');
      leaf(c, 33, 6, 4, 1.8, 2.5, 'g', 'd');
      leaf(c, 36, 14, 3.5, 1.6, 0.2, 'd', 'g');
      // The branch the nest sits in.
      c.curve(-2, 27, 18, 22, 42, 28, 'n', 4, 3);
      c.curve(28, 25, 33, 21, 37, 20, 'n', 1.6, 1);
      c.fill((x, y, now) => (now === 'n' && c.at(x, y + 1) !== 'n' && c.at(x, y + 2) !== 'n' ? 'c' : undefined));
      // The nest: twigs woven round the bowl in strands of brown, gold, orange, grey and charcoal.
      const nx = 20;
      const ny = 19.5;
      c.fill((x, y) => {
        const u = (x + 0.5 - nx) / 17;
        const v = (y + 0.5 - ny) / 8.5;
        const rr = Math.hypot(u, v);
        if (rr > 1 + (c.noise(x, y, 3, 785) - 0.5) * 0.25 + (hash(x, y, 786) - 0.5) * 0.1) return undefined;
        const th = Math.atan2(v, u);
        const strand = Math.floor(rr * 9 + (c.noise(x, y, 4, 783) - 0.5) * 2.5 + Math.sin(th * 7) * 0.4);
        const seg = Math.floor(th * 5 + hash(strand, 0, 784) * 6.28);
        // The rim round the cup is woven of lighter, drier twigs; the bowl below is darker.
        const lip = Math.hypot((x + 0.5 - 20) / 14.5, (y + 0.5 - 15.5) / 6.6) < 1;
        return (lip ? 'yyoonyoe' : 'nnnncnoe')[Math.floor(hash(strand, seg, 787) * 8)];
      });
      // The cup: dark inside, lined with soft brown, and four blue eggs in it.
      c.blob(20, 15.5, 11.5, 4.8, 'n', undefined, undefined, 788, 0.15);
      c.blob(20, 15, 9, 3.2, 'c', undefined, undefined, 789, 0.3);
      c.blob(14, 15, 3.1, 2.3, 's', 'b', 'w', 790, 0.05);
      c.blob(20.5, 14, 3.1, 2.3, 's', 'b', 'w', 791, 0.05);
      c.blob(26.5, 15.2, 3.1, 2.3, 's', 'b', 'w', 792, 0.05);
      c.blob(19.5, 18, 3, 2.1, 's', 'b', 'w', 793, 0.05);
      c.fill((x, y, now) => (now === 's' && y > 10 && y < 22 && x > 9 && x < 31 && hash(x, y, 794) < 0.07 ? 'n' : undefined));
      // Twigs over the rim and sticking out.
      c.curve(7, 14, 12, 11.5, 18, 12, 'y', 1, 1);
      c.curve(33, 15, 29, 11.5, 23, 11.5, 'o', 1, 1);
      c.curve(4, 19, 1, 17, -1, 15, 'n', 1, 1);
      c.curve(36, 21, 39, 19, 41, 20, 'y', 1, 1);
      c.curve(10, 26, 8, 28, 6, 30, 'n', 1, 1);
    },
  },
  {
    title: 'Fawn in spring flowers',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1342, strength: 1 },
    draw: (c: Canvas) => {
      cloud(c, 23, 3, 9, 652);
      land(c, 12.5, 1.3, 'd', 653, 99, 6);
      land(c, 15.5, 1, 'g', 654, 99, 7);
      c.fill((x, y, now) => (now === 'g' && c.noise(x, y, 4, 655) > 0.6 ? 'd' : undefined));
      // A blossom tree on the right.
      c.curve(36, 17, 35.5, 11, 33, 5, 'n', 2.6, 1.4);
      c.curve(35, 9, 37, 6, 39, 4, 'n', 1.3, 1);
      c.blob(32, 3, 7, 4, 'k', 'p', 'w', 656, 0.3);
      c.blob(38, 6, 4, 3.2, 'k', 'p', 'w', 657, 0.3);
      // The fawn lies in the grass, head up: body, haunch, neck, folded front leg, white spots.
      c.blob(26, 22.5, 12.5, 5.6, 'o', 'n', undefined, 658, 0.12);
      c.blob(33, 22, 5.5, 4.6, 'o', 'n', undefined, 659, 0.1);
      c.curve(29, 18.5, 27.5, 23, 30, 27, 'n', 1);
      c.curve(11.5, 11, 12, 16, 17, 19.5, 'o', 5, 7);
      c.curve(8.5, 13, 10, 16.5, 13.5, 20, 'w', 1.3, 1.6);
      c.curve(17, 26.5, 12, 28, 7, 27.5, 'o', 2.4, 1.8);
      c.put(6, 27, 'c');
      c.put(6, 28, 'c');
      for (let i = 0; i < 12; i++) {
        const x = Math.round(17 + i * 1.8 + hash(i, 1, 660) * 1.5);
        const y = Math.round(18.5 + hash(i, 2, 660) * 4);
        c.putOn(x, y, 'w', 'o');
      }
      c.put(38, 18, 'w');
      c.put(39, 18, 'w');
      sprite(c, 2, 1, [
        '.......n.....n.',
        '......nkn...nko',
        '......nkkn.nkko',
        '.......nkkonkko',
        '......oooooookn',
        '....ooooooooon.',
        '...occooooooon.',
        '..oocwooooooon.',
        '.ooooooooooon..',
        'cooooooooooon..',
        '.wwwoooooonn...',
        '..wwwoooooo....',
      ]);
      // Flowers in the grass, a few blades in front of the fawn, and a butterfly by its nose.
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(hash(i, 1, 661) * 40);
        const y = 15 + Math.floor(hash(i, 2, 661) * 15);
        const petal = 'ywkpr'[Math.floor(hash(i, 3, 661) * 5)] as string;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) c.putOn(x + dx, y + dy, petal, 'gd');
        c.putOn(x, y, petal === 'y' ? 'o' : 'y', 'gd');
      }
      for (const [x, h] of [[20, 3], [24, 2.5], [29, 3.5], [15, 2]] as const) c.curve(x, 29.5, x + 0.5, 29.5 - h / 2, x + 1.2, 29.5 - h, 'd', 1);
      c.put(21, 26, 'y');
      c.put(30, 26, 'w');
      sprite(c, 1, 14, ['b.b', 'bcb']);
    },
  },
  {
    // Level 49's picture, mirrored.
    title: 'Sleeping cat',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 5, seed: 1551, strength: 1.25 },
    mirror: true,
    draw: (c) => (SCENES[48] as Scene).draw(c),
  },
  {
    title: 'Mandarin fish on a reef',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 4, seed: 3483, strength: 2 },
    draw: (c: Canvas) => {
      // Dusk on the reef: dim water, rocks and corals below.
      c.fill((x, y) => (c.noise(x, y, 7, 1) + y / 50 > 0.62 ? 'p' : 'c'));
      land(c, 24, 2, 'en', 2, 3, 6);
      c.blob(5, 25, 6, 3.5, 'k', 'p', 'w', 3, 0.35);
      c.blob(34, 25.5, 6, 3.5, 'y', 'o', undefined, 4, 0.3);
      c.curve(24, 29, 24, 26, 22, 23, 'r', 1);
      c.curve(24, 27, 26, 25, 28, 23, 'r', 1);
      c.curve(1, 22, 2, 18, 0, 14, 'd', 1.2);
      c.curve(38, 21, 37, 17, 39, 13, 'd', 1.2);
      c.speckle('w', 'cp', 0.02, 5);
      // The fish facing left: tail, fins, body.
      c.blob(34, 14, 3.8, 5.8, 'o', undefined, undefined, 6, 0.25);
      c.blob(21, 7, 7, 3, 'b', undefined, undefined, 7, 0.3);
      c.blob(20, 21.5, 6, 2.3, 'b', undefined, undefined, 8, 0.3);
      c.blob(18, 14.5, 12.5, 6.8, 'b', undefined, undefined, 9, 0.15);
      // Wavy orange stripes, thicker on the face; blue bars on the tail.
      c.fill((x, y, now) => {
        if (now !== 'b' && now !== 'o') return undefined;
        const p = (y + (c.noise(x, y, 5, 10) - 0.5) * 6 + 0.8 * Math.sin(x / 2.2)) / 2.8;
        if (now === 'o') return x > 31 && frac((x + c.noise(x, y, 3, 11) * 2) / 2.6) < 0.35 ? 'b' : undefined;
        return frac(p) < (x < 11 ? 0.6 : 0.36) ? 'o' : x < 12 && c.noise(x, y, 3, 12) > 0.65 ? 'g' : undefined;
      });
      rim(c, 'bog', 'cpkne', 'y', 0, 0, 39, 29);
      sprite(c, 6, 10, ['.rrr.', 'rrccr', 'rcwcr', 'rrccr', '.rrr.']);
      c.put(4, 15, 'r');
      c.put(5, 15, 'r');
    },
  },
  {
    title: 'Crab on the beach',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1461, strength: 1.5 },
    draw: (c: Canvas) => {
      // Sand in two tones, wet and darker near the sea; the sea at the top with a wandering line of foam.
      c.fill((x, y) => (c.noise(x, y, 4, 820) > 0.68 ? 'o' : 'y'));
      c.fill((x, y) => {
        const shore = 5 + (c.noise(x, 0, 7, 821) - 0.5) * 4 + c.wobble(x, y, 822) * 0.5;
        if (y < shore - 2.5) return y < shore - 5 ? 'b' : 's';
        if (y < shore) return 'w';
        return undefined;
      });
      ripples(c, 0, 3, 's', 'b', 6, 823);
      // Shells, pebbles and a strand of seaweed.
      spriteFlip(c, ['.w.', 'wkw'], 3, 25);
      spriteFlip(c, ['kw', 'ww'], 35, 27);
      for (const [x, y] of [[8, 9], [30, 7], [37, 20], [2, 18], [24, 28]] as const) c.blob(x, y, 1.1, 0.8, 'e', 'c', undefined, x * 7 + y, 0.3);
      c.curve(1, 9, 4, 11, 3, 14, 'd', 1, 1);
      // The crab: legs bent out on both sides, raised claws, eyes on stalks, a broad red shell.
      for (const s of [-1, 1])
        for (let k = 0; k < 4; k++) {
          const kx = 20 + s * (13 + k * 1.2);
          const ky = 15.5 + k * 2.6;
          const tx = 20 + s * (16 + k * 1.1);
          const ty = 21 + k * 2.4;
          c.curve(20 + s * 8, 18 + k * 1.4, 20 + s * (11 + k), 15.5 + k * 2.4, kx, ky, 'r', 2, 1.6);
          c.curve(kx, ky, kx + s * 2, ky + 1.5, tx, ty, 'r', 1.6, 1);
          c.put(Math.round(tx), Math.round(ty), 'n');
        }
      // The claws: an arm up from each side of the shell to a big pincer held open over the sea.
      const claw = [
        '.c....c..',
        '.rr...rr.',
        'orr...rrn',
        'orr..rrrn',
        'orrrrrrrn',
        '.orrrrrnn',
        '.rrrrrnn.',
        '..rrrnn..',
      ];
      c.curve(13, 15, 9, 15, 8.5, 8, 'r', 2.8, 2.4);
      c.curve(27, 15, 31, 15, 31.5, 8, 'r', 2.8, 2.4);
      spriteFlip(c, claw, 4, 1);
      spriteFlip(c, claw, 27, 1, true);
      // The shell, lit at the upper left, with a dark lower rim; eyes on stalks; the mouth.
      c.blob(20, 18.5, 11, 6.5, 'r', undefined, 'o', 832, 0.12);
      c.fill((x, y, now) => (now === 'r' && y > 18 && c.at(x, y + 1) !== 'r' && c.at(x, y + 1) !== 'o' ? 'n' : undefined));
      c.speckle('k', 'r', 0.04, 833);
      c.curve(17, 14, 17, 12, 16.5, 10, 'r', 1, 1);
      c.curve(23, 14, 23, 12, 23.5, 10, 'r', 1, 1);
      spriteFlip(c, ['cw', 'cc'], 16, 8);
      spriteFlip(c, ['wc', 'cc'], 23, 8);
      spriteFlip(c, ['.n.', 'nnn'], 19, 13);
    },
  },
  {
    title: 'Treehouse in autumn at dusk',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1462, strength: 1.5 },
    draw: (c: Canvas) => {
      // Dusk sky: blue with the first stars, purple, pink, streaked with thin cloud.
      c.bands(0, 27, 'bpk', 720, 2, 8);
      streaks(c, 'k', 'p', 8, 20, 4, 721, 1, 0.4);
      streaks(c, 'p', 'k', 19, 27, 4, 736, 1, 0.5);
      c.speckle('w', 'b', 0.05, 737);
      // Ground under fallen leaves, orange and brown, a little green left.
      land(c, 26, 1.2, 'on', 723, 2, 6);
      c.speckle('g', 'on', 0.06, 724);
      // The trunk and its arms.
      c.curve(20, 29, 18, 22, 20, 13, 'n', 6, 4);
      c.curve(18, 28, 17, 22, 18, 15, 'c', 1.2);
      c.curve(20, 15, 12, 13, 7, 9, 'n', 2.5, 1.2);
      c.curve(21, 14, 28, 12, 33, 8, 'n', 2.5, 1.2);
      // The crown in autumn: orange clumps shaded red, lit yellow, with brown dead leaves and a few green ones.
      for (const [x, y, rx, ry, s, col, shade, light] of [[8, 7, 7, 5, 725, 'o', 'r', 'y'], [32, 6, 8, 5, 726, 'r', 'n', 'o'], [20, 5, 10, 5, 727, 'o', 'r', 'y'], [13, 11, 5, 3, 728, 'y', 'o', undefined], [28, 11, 5, 3, 729, 'o', 'n', 'y']] as const)
        c.blob(x, y, rx, ry, col, shade, light, s, 0.4);
      c.speckle('n', 'or', 0.05, 730);
      c.speckle('g', 'o', 0.025, 731);
      // The house, painted green planks, a slate roof, windows lit warm, a lantern by the door.
      c.poly([11, 17, 29, 16, 29, 24, 11, 24], 'g');
      c.fill((x, y, now) => (now === 'g' && x > 10 && x < 30 && y > 15 && y < 25 && Math.floor(y + (13 - x) / 14) % 2 === 0 && hash(x, y, 732) < 0.85 ? 'd' : undefined));
      c.poly([8, 17.5, 20, 9.5, 32, 16.5], 'c');
      c.fill((x, y, now) => (now === 'c' && y > 9 && y < 18 && x > 7 && x < 33 && c.noise(x, y, 2, 733) > 0.6 ? 'e' : undefined));
      c.curve(8, 17.5, 20, 10, 32, 16.5, 'n');
      c.blob(16, 20.5, 2.2, 2.2, 'y', 'o', undefined, 734, 0);
      c.put(16, 20, 'n');
      c.put(15, 20, 'n');
      c.put(16, 21, 'n');
      c.poly([22.5, 18.5, 26.5, 18.5, 26.5, 24, 22.5, 24], 'n');
      c.put(25, 21, 'y');
      c.put(28, 19, 'y');
      c.put(28, 18, 'c');
      // A rope ladder down to the leaves.
      c.curve(15, 23, 14, 26, 15, 28, 'w');
      c.curve(18, 23, 17, 26, 18, 28, 'w');
      for (const y of [24, 26, 28]) c.curve(14.5, y, 16, y + 0.3, 17.5, y, 'w');
      // Leaves falling.
      for (const [x, y, col] of [[3, 14, 'o'], [36, 13, 'r'], [30, 20, 'y'], [8, 23, 'r'], [34, 24, 'o'], [5, 16, 'y'], [38, 19, 'o']] as const) c.put(x, y, col);
    },
  },
  {
    // Level 46's picture, mirrored.
    title: 'Sea turtle',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1471, strength: 1.75 },
    mirror: true,
    draw: (c) => (SCENES[45] as Scene).draw(c),
  },
  {
    title: 'Dragon asleep on its gold',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1361, strength: 1.5 },
    draw: (c: Canvas) => {
      // A cave: rock walls in brown and grey, the deep dark charcoal with a purple glow.
      c.fill(() => 'n');
      c.fill((x, y) => {
        const u = (x - 21) / 19;
        const v = (y - 11) / 13;
        return u * u + v * v < 1 + (c.noise(x, y, 3, 680) - 0.5) * 0.5 ? 'c' : undefined;
      });
      c.fill((x, y, now) => (now === 'n' && c.noise(x, y, 2.5, 681) > 0.62 ? 'e' : undefined));
      c.fill((x, y, now) => (now === 'c' && c.noise(x, y, 5, 682) > 0.62 ? 'p' : undefined));
      // The heap of gold, with glints and gems.
      c.fill((x, y) => {
        const top = 18.5 + ((x - 20) / 20) ** 2 * 7 + (c.noise(x, 0, 4, 683) - 0.5) * 2.5 + c.wobble(x, 0, 684) * 0.5;
        if (y < top) return undefined;
        return c.noise(x, y, 2.5, 685) > 0.6 ? 'o' : 'y';
      });
      c.speckle('w', 'y', 0.04, 686);
      c.speckle('r', 'yo', 0.015, 687);
      c.speckle('b', 'yo', 0.012, 688);
      // The dragon, coiled asleep on top: body, folded wing, spikes, tail round the front, head on the gold.
      // A dark green body lit lighter on top, red spikes along the back.
      c.blob(26, 15, 12, 6.8, 'd', undefined, undefined, 689, 0.12);
      c.speckle('g', 'd', 0.06, 693);
      for (let x = 15; x <= 37; x += 3) {
        const top = 15 - 6.8 * Math.sqrt(Math.max(0, 1 - ((x - 26) / 12) ** 2));
        c.poly([x - 1, top + 0.8, x + 1, top + 0.8, x + 0.4, top - 1.8], 'r');
      }
      // The folded wing, light against the body: a dark bony edge up to the wrist, fingers down to scallops.
      c.poly([19, 14, 25, 3.5, 36, 9, 34.5, 13, 31, 11.5, 28.5, 14, 25.5, 12.5, 22.5, 15], 'g');
      c.curve(19, 14, 21, 8, 25, 3.5, 'd', 1.6, 1.2);
      c.curve(25, 3.5, 31, 5, 36, 9, 'd', 1.3, 1);
      c.curve(25, 4, 27, 8, 28.5, 13, 'd', 1);
      c.curve(25, 4, 30, 7.5, 33.5, 12, 'd', 1);
      c.put(25, 2, 'w');
      // The tail round the front, ending in a spade.
      c.curve(36, 18, 40, 26, 27, 26.5, 'd', 4, 1.8);
      c.curve(37, 19.5, 38.5, 24.5, 28, 25.3, 'g', 1, 1);
      c.poly([28, 24.6, 28.5, 28.8, 24.5, 26.8], 'r');
      // The neck down to the head, which rests on the gold beside a paw, eyes shut, smoke curling from the nostril.
      c.curve(19, 23, 15.5, 17.5, 18, 12.5, 'd', 5, 5.5);
      for (const [x, y] of [[15.5, 16.5], [16.5, 13]] as const) c.poly([x - 1.2, y + 0.5, x + 0.8, y + 0.5, x - 1.4, y - 2], 'r');
      c.blob(23, 25, 3.5, 1.6, 'd', undefined, 'g', 691, 0.1);
      for (const x of [20, 22, 24]) c.put(x, 26, 'w');
      sprite(c, 0, 15, [
        '.............eeew...',
        '............ee......',
        '..dd.......ddd......',
        '.dggdddddddgggdd....',
        'dgggggggggggcccggd..',
        'dcggggggggggggggggd.',
        'dggggggggggggggggggd',
        '.dddwdddwddddgggggd.',
        '..dggggggggggggggd..',
        '...ddddddddddddd....',
      ]);
      c.curve(1, 19, -1, 14, 2, 10, 'w', 1.4, 1);
      c.blob(4, 9, 2.2, 1.3, 'w', undefined, undefined, 692, 0.3);
    },
  },
  {
    title: 'Zebra at a waterhole',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1452, strength: 1.25 },
    draw: (c: Canvas) => {
      // Afternoon sky in two blues, bush on the far bank, dry grass, the waterhole across the front.
      c.bands(0, 12, 'bs', 1, 1.8, 8);
      land(c, 11, 1.2, 'yoy', 3, 3, 8);
      c.blob(2, 11, 5, 1.5, 'd', 'g', undefined, 6, 0.3);
      c.blob(37, 10.5, 4.5, 1.8, 'd', 'g', undefined, 7, 0.3);
      c.speckle('o', 'y', 0.05, 8);
      c.speckle('n', 'o', 0.06, 9);
      c.fill((x, y) => (y >= 21 + c.wobble(x, y, 10) * 0.6 + (c.noise(x, 0, 6, 11) - 0.5) * 2 ? (c.noise(x, y, 4, 12) > 0.55 ? 's' : 'b') : undefined));
      // The zebra, white first, standing in the shallows, head up and turned left.
      c.blob(25, 13, 10, 5.2, 'w', 'e', undefined, 12, 0.12);
      c.blob(32, 12.5, 5, 5.3, 'w', 'e', undefined, 13, 0.12);
      c.blob(18.5, 13.5, 4.6, 4.6, 'w', 'e', undefined, 14, 0.12);
      c.curve(18.5, 16, 18.5, 20, 18, 23, 'w', 3, 2);
      c.curve(22, 16, 22, 20, 22.5, 23, 'w', 2.8, 2);
      c.curve(29, 15, 30, 19, 29.5, 23, 'w', 3.2, 2);
      c.curve(33, 15, 34, 19, 33.5, 23, 'w', 3, 2);
      c.curve(19, 11, 16, 7, 13, 4.5, 'w', 6, 3.8);
      c.curve(13.5, 4, 10, 6.5, 6.5, 10, 'w', 4, 2.4);
      c.curve(35.5, 10, 37.5, 13, 37, 18, 'w', 1, 1);
      // Stripes: across the legs, down the body, slanting on the rump, round the neck, across the face.
      c.fill((x, y, now) => {
        if (!'we'.includes(now) || y > 23) return undefined;
        const n = c.noise(x, y, 4, 31) * 1.4;
        const s = (x - 19) * -0.707 + (y - 11) * -0.707;
        let ph: number;
        if (y >= 17 && x >= 16) ph = (y + n) / 2.4;
        else if (x > 29) ph = (y * 0.8 + (x - 29) * 0.6 + n) / 2.8;
        else if (x >= 18 && y >= 8) ph = (x + 0.3 * (y - 12) + n) / 3;
        else if (s > 8.2) ph = (-0.81 * x + 0.58 * y + n * 0.4) / 2;
        else ph = (s + n) / 2.6;
        return frac(ph) < 0.4 ? 'c' : undefined;
      });
      // Mane, muzzle, ears, eye, tail tuft.
      c.curve(21, 9, 18, 5.5, 15.5, 2.5, 'c', 1.3, 1);
      sprite(c, 5, 9, ['.cc', 'ccc', 'cc.']);
      sprite(c, 13, 1, ['.w.w', 'wcwc']);
      sprite(c, 10, 5, ['ww', 'wc']);
      c.put(37, 18, 'c');
      c.put(37, 19, 'c');
      c.put(36, 19, 'c');
      // Mirrored in the water below its legs, broken by ripples.
      c.fill((x, y, now) => {
        if (!'bs'.includes(now) || y < 24 || x < 14) return undefined;
        const src = c.at(x, 2 * 23 - y);
        if (src === 'c' && hash(x, y, 40) < 0.75) return 'c';
        if ((src === 'w' || src === 'e') && hash(x, y, 41) < 0.75) return 'e';
        return undefined;
      });
      ripples(c, 24, 29, 'w', 'bs', 6, 42);
    },
  },
  {
    title: 'Peacock feather close-up',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 5, seed: 1562, strength: 1.5 },
    overrides: { s: 't' },
    draw: (c: Canvas) => {
      c.fill((x, y) => (c.noise(x, y, 6, 1) > 0.58 ? 'p' : 'c'));
      // One feather eye: nested rings, barbs fanning out round it, the shaft below.
      const eye = (cx: number, cy: number, k: number, salt: number) =>
        c.fill((x, y) => {
          const dx = (x - cx) / k;
          const dy = (y - cy) / k;
          const q = Math.hypot(dx, dy / 1.25) + (c.noise(x, y, 2.5, salt) - 0.5) * 0.9;
          const heart = Math.hypot(dx, (dy - 0.8 + 0.25 * Math.abs(dx)) / 1.15);
          if (heart < 2.4) return 'b';
          if (q < 4.2) return 's';
          if (q < 5.8) return 'n';
          if (q < 7.2) return 'o';
          if (q < 8.6) return 'y';
          if (q < 10) return 'g';
          if (q > 15 + (c.noise(x, y, 3, salt + 1) - 0.5) * 3) return undefined;
          const th = Math.atan2(dy, dx);
          const strand = frac((th * 26) / (2 * Math.PI) + q * 0.04);
          if (q > 12.5 && strand > 0.55) return undefined;
          return strand < 0.5 ? 'd' : 'g';
        });
      eye(-1, 27, 0.6, 7);
      eye(41, 1, 0.55, 8);
      eye(20, 12, 1, 3);
      c.curve(21, 29, 20.5, 26, 20, 21.5, 'w', 1.4, 1);
      c.fill((x, y, now) => (now === 'w' && x > 20 && y > 24 ? 'e' : undefined));
      c.speckle('y', 'dg', 0.03, 9);
    },
  },
  {
    title: 'Volcano erupting at night',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1472, strength: 1.75 },
    draw: (c: Canvas) => {
      // Night sky: charcoal above, blue, purple where the glow reaches; a few stars.
      c.bands(0, 26, 'cbp', 660, 2.5, 8);
      c.speckle('w', 'cb', 0.03, 661);
      // The ash plume: billows of charcoal and grey over the crater, lit red and orange from beneath.
      for (const [x, y, rx, ry, s] of [[20, 4, 8, 4, 662], [10, 3, 7, 3.4, 663], [30, 3, 8, 3.4, 664], [25, 8, 4.5, 2.6, 665], [15, 8, 4.5, 2.6, 666], [38, 6, 4, 2.4, 667], [2, 7, 4, 2.2, 683]] as const)
        c.blob(x, y, rx, ry, 'e', 'c', undefined, s, 0.4);
      c.fill((x, y, now) => ('ce'.includes(now) && y < 11 && y > 4.5 + Math.abs(x - 20) * 0.25 + (c.noise(x, y, 2.5, 668) - 0.5) * 3 ? (Math.abs(x - 20) < 4 + c.noise(x, y, 2, 669) * 3 ? 'o' : 'r') : undefined));
      // Lightning in the ash.
      c.curve(9, 0, 11, 2, 9, 4, 'y');
      c.curve(9, 4, 8, 5, 10, 7, 'w');
      c.curve(31, 1, 29, 3, 32, 5, 'w');
      // The cone, as on the island by day: two flanks laid in wavy strata of each other's colour.
      c.fill((x, y) => {
        const slope = 8 + Math.abs(x - 20) ** 1.15 * 0.7 + (c.noise(x, 0, 3, 670) - 0.5) * 3;
        if (y < slope || y >= 27) return undefined;
        const shaded = x > 20 + (c.noise(x, y, 5, 671) - 0.5) * 4;
        const p = y + (c.noise(x, 0, 5, 672) - 0.5) * 3 + Math.abs(x - 20) * 0.3;
        const stratum = p - Math.floor(p / 3.5) * 3.5 < 1;
        return shaded !== stratum ? 'c' : 'n';
      });
      // The fountain of lava out of the crater, and bombs flying.
      c.blob(20, 8, 3.5, 1.3, 'r', undefined, 'y', 673, 0);
      c.blob(20, 5.5, 2.2, 2.2, 'y', 'o', 'w', 674, 0.25);
      c.curve(19, 6, 16, 0, 12, 5, 'o');
      c.curve(21, 6, 25, 0, 28, 5, 'o');
      c.curve(20, 5, 19, 1, 17, 2, 'y');
      for (const [x, y] of [[14, 9], [26, 8], [11, 8], [29, 9], [23, 2], [16, 3]] as const) c.put(x, y, x % 2 ? 'o' : 'y');
      // Rivers of lava down the flanks.
      c.curve(19, 9, 16, 15, 12, 24, 'r', 1.8, 1.2);
      c.curve(16, 15, 18, 19, 17, 25, 'r', 1.4, 1);
      c.curve(21, 9, 25, 15, 28, 24, 'o', 1.6, 1.2);
      c.curve(25, 16, 23, 20, 24, 25, 'o', 1.2, 1);
      c.curve(19, 10, 17, 14, 15, 18, 'y');
      c.curve(21, 10, 23, 13, 25, 16, 'y');
      // The sea, dark, with the glow broken in it; steam where the lava meets the water.
      land(c, 26, 1, 'bc', 675, 2, 6);
      c.fill((x, y, now) => {
        if (!'bc'.includes(now) || y < 25 || Math.abs(x - 20) > 9 + c.noise(x, y, 3, 676) * 4) return undefined;
        const p = y + (c.noise(x, 0, 3, 677) - 0.5) * 2;
        return p - Math.floor(p / 2) * 2 < 0.8 && c.noise(x, y, 2, 678) > 0.35 ? (Math.abs(x - 20) < 5 ? 'o' : 'r') : undefined;
      });
      c.blob(11, 24.5, 3, 1.6, 'w', 'e', undefined, 679, 0.3);
      c.blob(29, 24.5, 3, 1.6, 'w', 'e', undefined, 680, 0.3);
    },
  },
  {
    title: 'Koi pond in autumn',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1482, strength: 2 },
    draw: (c: Canvas) => {
      c.fill(() => 'b');
      c.fill((x, y) => (c.noise(x, y, 6, 661) < 0.36 ? 's' : undefined));
      c.blob(36, 4, 4.5, 3.2, 'g', 'd', 'y', 663, 0.15);
      c.fill((x, y, now) => ('gdy'.includes(now) && y > 4 && Math.abs(x - 36) < 1 + (y - 4) * 0.6 && x > 34 ? 'b' : undefined));
      c.blob(4, 26, 4, 3, 'g', 'd', 'y', 664, 0.15);
      ripples(c, 0, 29, 'w', 'bs', 10, 662);
      const a = koi(c, [7, 7, 30, 0.5, 33, 17], 4.2, 'w', 'e');
      for (const [x, y, t] of a.cells) if ((t > 0.03 && t < 0.11) || (t > 0.28 && t < 0.8 && c.noise(x, y, 4, 667) > 0.5)) c.put(x, y, 'r');
      a.eyes();
      const b = koi(c, [33, 23, 10, 29.5, 7, 13], 4.2, 'o', 'w');
      for (const [x, y, t] of b.cells) if (t > 0.12 && t < 0.85 && c.noise(x, y, 4, 668) > 0.6) c.put(x, y, 'y');
      for (const [x, y, t] of b.cells) if (t > 0.15 && t < 0.8 && hash(x, y, 669) < 0.05) c.put(x, y, 'c');
      b.eyes();
      // Fallen leaves afloat.
      const leaves = [['.x.x.', 'xxxxx', '.xxx.', '..n..'], ['.x.', 'xxx', 'xx.', '..n'], ['x.x', 'xxx', '.n.']];
      for (const [x, y, k, col] of [[1, 1, 0, 'r'], [15, 3, 1, 'y'], [18, 13, 0, 'r'], [22, 17, 2, 'o'], [12, 19, 1, 'y'], [36, 12, 1, 'r'], [27, 25, 2, 'y'], [36, 25, 0, 'o']] as const)
        (leaves[k] as string[]).forEach((row, dy) => [...row].forEach((ch, dx) => ch !== '.' && c.putOn(x + dx, y + dy, ch === 'x' ? col : 'n', 'bs')));
      c.speckle('n', 'bs', 0.012, 670);
    },
  },
  {
    title: 'Pizza from above',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 5, seed: 1572, strength: 1.75 },
    draw: (c: Canvas) => {
      // A wooden board with grain and knots, flour and a stray basil leaf on it.
      c.fill(() => 'n');
      streaks(c, 'c', 'n', -2, 31, 3, 775, 1, 0.4);
      c.blob(3, 26, 1.6, 1.2, 'c', undefined, undefined, 776, 0.2);
      c.blob(37, 3, 1.4, 1, 'c', undefined, undefined, 777, 0.2);
      // A blue and white tea towel under the board's corners.
      c.fill((x, y) => {
        const d = x + y * 1.2 + (c.noise(x, y, 4, 783) - 0.5) * 4;
        const e = 39 - x + (29 - y) * 1.2 + (c.noise(x, y, 4, 784) - 0.5) * 4;
        if (d < 11) return Math.floor((x - y + 60 + c.wobble(x, y, 785) * 0.4) / 2) % 2 ? 'w' : 'b';
        if (e < 11) return Math.floor((x - y + 60 + c.wobble(x, y, 786) * 0.4) / 2) % 2 ? 'w' : 'b';
        return undefined;
      });
      const cx = 20;
      const cy = 15;
      const R = 14.2;
      const peps = [[14, 9], [24, 7.5], [27.5, 16], [16.5, 19.5], [10.5, 15], [22.5, 23], [30.5, 10]] as const;
      const olives = [[19, 12], [13, 22], [28, 21], [20, 5], [8, 10]] as const;
      const greens = [[21, 17.5, 0.6], [15, 13, 2.2], [25, 12, 1.1], [32, 18, 2.6]] as const;
      const pz = (x: number, y: number): string | undefined => {
        const dx = x + 0.5 - cx;
        const dy = y + 0.5 - cy;
        const r = Math.hypot(dx, dy);
        const edge = R + (c.noise(x, y, 3, 771) - 0.5) * 1.4;
        if (r > edge) return undefined;
        if (r > edge - 2.6) {
          if (c.noise(x, y, 2.2, 772) > 0.68) return 'n';
          if (r < edge - 1.6 && dx + dy < -4 && c.noise(x, y, 2, 778) > 0.45) return 'y';
          return 'o';
        }
        if (r > edge - 3.2 && c.noise(x, y, 2.5, 779) > 0.4) return 'r';
        for (const [px, py] of peps) {
          const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
          if (d < 2.1) return d > 1.4 && hash(x, y, 780) < 0.4 ? 'n' : hash(x, y, 781) < 0.08 ? 'k' : 'r';
        }
        for (const [px, py] of olives) {
          const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
          if (d < 1.55 && d > 0.6) return 'c';
        }
        for (const [px, py, a] of greens) {
          const u = (x + 0.5 - px) * Math.cos(a) + (y + 0.5 - py) * Math.sin(a);
          const v = -(x + 0.5 - px) * Math.sin(a) + (y + 0.5 - py) * Math.cos(a);
          if ((u / 2.2) ** 2 + (v / 1.1) ** 2 < 1) return 'd';
        }
        if (c.noise(x, y, 2.5, 773) > 0.7) return 'w';
        if (c.noise(x, y, 1.8, 774) > 0.82) return 'o';
        return 'y';
      };
      // One slice is pulled out a little to the upper right; the others are left whole.
      const a0 = -0.95;
      const a1 = 0.1;
      const inSlice = (x: number, y: number): boolean => {
        const a = Math.atan2(y + 0.5 - cy, x + 0.5 - cx);
        return a > a0 && a < a1;
      };
      c.fill((x, y) => (inSlice(x - 3, y + 2) ? pz(x - 3, y + 2) : inSlice(x, y) ? undefined : pz(x, y)));
      // Flour on the board, and a basil leaf.
      c.speckle('w', 'n', 0.03, 782);
      leaf(c, 4, 4, 2.6, 1.3, 0.6, 'd', 'g');
      leaf(c, 36, 26, 2.6, 1.3, 2.2, 'd', 'g');
    },
  },
  {
    title: 'Stained glass rose window',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1373, strength: 1.75 },
    draw: (c: Canvas) => {
      const cx = 19.5;
      const cy = 14.5;
      // Stone wall in warm patches.
      c.fill((x, y) => (c.noise(x, y, 4, 1) > 0.55 ? 'o' : 'n'));
      c.speckle('e', 'n', 0.03, 2);
      c.fill((x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const d = Math.hypot(dx, dy) + (c.noise(x, y, 2, 3) - 0.5) * 0.25;
        if (d > 15.2) return undefined;
        if (d > 13.7) return dx + dy < -4 ? 'w' : 'e';
        const th = Math.atan2(dy, dx);
        const ring = (R: number) => Math.abs(d - R) < 0.5;
        const spoke = (n: number, off: number) => {
          const a = frac((th / (2 * Math.PI)) * n + off);
          return Math.min(a, 1 - a) * ((2 * Math.PI) / n) * d < 0.5;
        };
        const sector = (n: number, off: number) => Math.floor(frac(th / (2 * Math.PI) + 1 + off / n) * n);
        if (ring(3) || ring(7.8) || ring(13.2)) return 'c';
        if (d < 3) return d < 1.2 ? 'r' : 'y';
        if (d < 7.8) {
          if (spoke(8, 0.5)) return 'c';
          const s = sector(8, 0.5);
          return s % 2 ? (d < 5 ? 'k' : 'r') : d < 5 ? 's' : 'b';
        }
        if (spoke(12, 0)) return 'c';
        const s = sector(12, 0);
        // A roundel in each pane.
        const mid = ((s + 0.5) / 12) * 2 * Math.PI;
        const rd = Math.hypot(x - (cx + 10.5 * Math.cos(mid)), y - (cy + 10.5 * Math.sin(mid)));
        if (rd < 1.5) return s % 2 ? 'y' : 'k';
        return s % 3 === 0 ? 'b' : s % 3 === 1 ? 'g' : 'p';
      });
    },
  },
  {
    title: 'Kingfisher diving',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1381, strength: 2 },
    draw: (c: Canvas) => {
      // Riverbank greens with sunlit spots; a branch; the river below.
      c.fill((x, y) => (c.noise(x, y, 5, 1) > 0.5 ? 'g' : 'd'));
      c.speckle('y', 'g', 0.05, 2);
      c.fill((x, y) => (y >= 26 + c.wobble(x, y, 3) * 0.7 ? (c.noise(x, y, 4, 4) > 0.5 ? 's' : 'b') : undefined));
      ripples(c, 27, 29, 'w', 'sb', 6, 5);
      // The bird seen from above and behind, plunging head first, wings swept up in a V. Drawn for one half
      // (m = squares out from the middle) and mirrored, so both wings match.
      c.fill((x, y) => {
        const m = x < 20 ? 19 - x : x - 20;
        const a = m + 0.5;
        const n = (c.noise(m, y, 2.5, 6) - 0.5) * 1.2;
        if (y <= 27 && y >= 25 && a < 1.3 - (y - 25) * 0.25) return 'c';
        if (((y - 20.5) / 4.6) ** 2 + (a / 5.2) ** 2 < 1 + n * 0.3) {
          if (m === 2 && (y === 21 || y === 22)) return 'c';
          if (m === 3 && y === 21) return 'c';
          if (a > 1.8 && y >= 20 && y <= 23) return 'o';
          if (a > 2.4 && y < 20) return 'w';
          return hash(m, y, 8) < 0.25 ? 's' : 'b';
        }
        if (((y - 10) / 8.5) ** 2 + (a / 5.2) ** 2 < 1 + n * 0.3) return a < 1.5 ? 's' : y > 11 && a > 3.4 ? 'o' : 'b';
        if (y < 4 && a < 2.2) return y < 1 ? 'c' : 'b';
        const lead = 16 - (a - 3) * 0.65 + n;
        const width = 10 - (a - 3) * 0.35;
        if (a > 3 && a < 19.8 && y <= lead && y > lead - width) {
          if (a > 17) return 'c';
          if (y > lead - 1) return 's';
          if (y < lead - width * 0.5) return frac(a / 2.2) < 0.35 ? 'c' : 'b';
          return hash(m, y, 9) < 0.3 ? 's' : 'b';
        }
        return undefined;
      });
      // Splash where the beak meets the water.
      c.blob(19.5, 27.6, 5, 1.5, 'w', 's', undefined, 10, 0.4);
      for (const [x, y] of [[13, 25], [26, 25], [14, 24], [25, 23], [16, 25], [23, 24]] as const) c.put(x, y, 'w');
    },
  },
  {
    // Level 55's picture, mirrored.
    title: 'Hedgehog with an apple',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1372, strength: 1.75 },
    mirror: true,
    draw: (c) => (SCENES[54] as Scene).draw(c),
  },
  {
    title: 'Rocket on the pad at night',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1371, strength: 1.75 },
    draw: (c: Canvas) => {
      // Night sky: blue with dark drifts of charcoal cloud, and a purple glow over the pad from the floodlights.
      c.bands(0, 27, 'bbbp', 600, 2, 7);
      c.fill((x, y, now) => (now === 'b' && c.noise(x, y, 3, 616) > 0.7 ? 'c' : undefined));
      // Two searchlight beams sweep up from the ground, in broken pale streaks.
      const beam = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) => {
        const t = (y - y0) / (y1 - y0);
        return Math.abs(x + 0.5 - (x0 + (x1 - x0) * t)) < 0.4 + t * 0.7 + (c.noise(x, y, 2, 608) - 0.5) * 0.8;
      };
      c.fill((x, y, now) => ('cbp'.includes(now) && y > 1 + c.noise(x, 0, 3, 609) * 4 && (beam(x, y, 6, 28, 15, 0) || beam(x, y, 35, 28, 26, 0)) ? 's' : undefined));
      c.speckle('w', 'cb', 0.035, 601);
      c.speckle('y', 'c', 0.015, 602);
      c.blob(5, 4, 2.6, 2.4, 'w', 'e', undefined, 603, 0.1);
      // The launch tower at the right, a red lattice with sky in every bay, two grey arms to the rocket.
      // The tower tapers: its legs lean in towards the top.
      const L = (y: number) => 30.6 + ((28 - y) / 24) * 2.6;
      const R = (y: number) => 38.4 - ((28 - y) / 24) * 2.6;
      c.curve(L(28), 28, L(16) + 0.3, 16, L(4), 4, 'r', 1.2);
      c.curve(R(28), 28, R(16) - 0.3, 16, R(4), 4, 'r', 1.2);
      for (let y = 4, k = 0; y < 26; y += 5, k++) {
        c.curve(L(y), y, 34.5, y + 0.3, R(y), y, 'r');
        if (k % 2) c.curve(L(y), y, 34.5, y + 2.5, R(y + 5), y + 5, 'r');
        else c.curve(R(y), y, 34.5, y + 2.5, L(y + 5), y + 5, 'r');
      }
      c.curve(30.5, 3.5, 34.5, 3.1, 38.5, 3.5, 'e', 1.3);
      c.put(34, 1, 'r');
      c.put(34, 2, 'c');
      c.curve(25, 9, 28.5, 9.4, 32, 9, 'e', 1.4);
      c.curve(28, 17, 30, 17.4, 32, 17, 'e', 1.4);
      for (const [x, y] of [[33, 11], [36, 15], [33, 21], [36, 25]] as const) c.put(x, y, 'y');
      // The pad, a charcoal platform with grey slabs.
      land(c, 26.5, 0.5, 'ce', 604, 2, 6);
      // The rocket: a white core with a red nose, shaded grey on its right, a charcoal collar,
      // a porthole, a red belt; two white boosters with red noses and red fins.
      const cx = 20.5;
      c.fill((x, y) => {
        if (y < 0 || y > 26) return undefined;
        const dx = x + 0.5 - cx;
        const hw = (y < 8 ? 4.3 * Math.sqrt(Math.max(0, (y + 0.3) / 8.3)) : 4.3) + (c.noise(x < 20 ? 0 : 50, y, 2, 605) - 0.5) * 1.3;
        if (Math.abs(dx) > hw) return undefined;
        const lean = (c.noise(x, y, 2.5, 606) - 0.5) * 2;
        if (y < 6 + lean * 0.5) return dx > 1 + lean ? 'n' : 'r';
        if (Math.abs(y - 7.5 - lean * 0.5) < 0.8) return 'c';
        if (Math.abs(y - 20 - lean * 0.6) < 0.9) return dx > 1.6 + lean ? 'n' : 'r';
        return dx > 2 + lean * 1.2 ? 'e' : 'w';
      });
      c.blob(20, 13, 1.8, 1.8, 'c', undefined, undefined, 607, 0);
      sprite(c, 19, 12, ['ws', 'ss']);
      for (const bx of [14.5, 26.5]) {
        c.fill((x, y) => {
          if (y < 11 || y > 26) return undefined;
          const dx = x + 0.5 - bx;
          const hw = (y < 15 ? 1.6 * Math.sqrt((y - 10.6) / 4.4) : 1.6) + (c.noise(x, y, 2, 610) - 0.5) * 0.5;
          if (Math.abs(dx) > hw) return undefined;
          if (y < 14 + (c.noise(x, y, 2, 614) - 0.5)) return 'r';
          return dx > 0.4 + (c.noise(x, y, 2, 617) - 0.5) * 1.6 ? 'e' : 'w';
        });
      }
      c.poly([13.2, 20, 9.5, 27, 13.5, 26.5], 'r');
      c.poly([27.8, 20, 31.5, 27, 27.5, 26.5], 'r');
      for (const x of [14, 20, 26]) c.blob(x + 0.5, 26.6, x === 20 ? 2 : 1.2, 0.9, 'c', undefined, undefined, 615 + x, 0);
      // Steam rolls off the pad on both sides.
      c.blob(6, 27.5, 7.5, 2.6, 'w', 'e', undefined, 611, 0.35);
      c.blob(34, 28, 6.5, 2.4, 'w', 'e', undefined, 612, 0.35);
      c.blob(20.5, 28.8, 3.5, 1.2, 'e', undefined, 'w', 613, 0.3);
      for (const [x, y] of [[1, 29], [12, 29], [29, 29], [39, 27]] as const) c.put(x, y, 'y');
    },
  },
  {
    title: 'Bees on a honeycomb',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1381, strength: 2 },
    draw: (c: Canvas) => {
      // The comb: cells round jittered centres in staggered rows, walls of brown wax where two cells meet.
      // Most cells hold honey with a glint, some are capped, some empty and dark, a few hold red pollen.
      const cells: [number, number, number][] = [];
      for (let j = -1; j <= 9; j++)
        for (let i = -1; i <= 10; i++)
          cells.push([i * 4.3 + (j & 1 ? 2.15 : 0) + (hash(i, j, 761) - 0.5) * 1.5, j * 3.7 + 1 + (hash(i, j, 762) - 0.5) * 1.3, hash(i, j, 763)]);
      c.fill((x, y) => {
        const px = x + 0.5;
        const py = y + 0.5;
        let d1 = 1e9;
        let d2 = 1e9;
        let best = cells[0] as [number, number, number];
        for (const cell of cells) {
          const d = Math.hypot(px - cell[0], (py - cell[1]) * 1.1);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            best = cell;
          } else if (d < d2) d2 = d;
        }
        if (d2 - d1 < 0.95 + c.wobble(x, y, 764) * 0.15) return 'y';
        const [cx, cy, k] = best;
        const glint = x === Math.floor(cx) - 1 && y === Math.floor(cy) - 1;
        if (k < 0.62) return glint ? 'y' : 'o';
        if (k < 0.8) return 'n';
        if (k < 0.92) return glint ? 'w' : 'e';
        return 'r';
      });
      // The comb is torn at the lower left, and the dark hive shows through.
      c.fill((x, y) => (x + (29 - y) * 1.3 + (c.noise(x, y, 4, 766) - 0.5) * 6 + c.wobble(x, y, 767) < 13 ? (c.noise(x, y, 3, 768) > 0.6 ? 'n' : 'c') : undefined));
      // A big bee in the middle, seen from above with its head to the left and its wings spread; two small
      // ones crawling at the edges. Each body is ringed dark against the comb; the antennae ('a') come after.
      const big = [
        '..........swwwws........',
        '........swwwwwwwwws.....',
        '.......swwwwwwwwwwws....',
        'a......swwwwwwwwwws.....',
        '.a......sswwwwwss.......',
        '..a....onnn..yccyyccy...',
        '...cc.oonnnnyyccyyccyyc.',
        '..cwcconnnnnyyccyyccyycc',
        '..ccccnnnnnnyyccyyccyycc',
        '..ccccnnnnnnyyccyyccyycc',
        '...cc.nnnnnnyyccyyccyyc.',
        '..a....nnnn..yccyyccy...',
        '.a......sswwwwwss.......',
        'a......swwwwwwwwws......',
        '.......swwwwwwwwwws.....',
        '........swwwwwwwws......',
        '..........swwwws........',
      ];
      const small = [
        '.....sww....',
        '....swwws...',
        'a...sswws...',
        '.a.nnn.ycyc.',
        '.ccnnnyycycc',
        '.ccnnnyycycc',
        '.a.nnn.ycyc.',
        'a...sswws...',
        '....swwws...',
        '.....sww....',
      ];
      const beeAt = (rows: string[], x0: number, y0: number, flip: boolean): void => {
        outlined(c, 'c', () => spriteFlip(c, rows.map((r) => r.replace(/a/g, '.')), x0, y0, flip));
        spriteFlip(c, rows.map((r) => r.replace(/[^a]/g, '.').replace(/a/g, 'c')), x0, y0, flip);
      };
      beeAt(big, 7, 6, false);
      beeAt(small, 27, 0, true);
      beeAt(small, 28, 19, false);
    },
  },
  {
    title: 'Toucan on a mossy branch',
    ...LARGE,
    deal: { sceneSeed: 2, buckets: 4, seed: 2441, strength: 1 },
    draw(c) {
      // The rainforest: big overlapping leaves in green and dark green, sky showing through the gaps.
      c.fill((x, y) => {
        const open = c.noise(x, y, 4, 201) + (x > 24 && y < 9 ? 0.32 : 0) + (x > 3 && x < 20 && y > 11 && y < 21 ? 0.01 : 0);
        return open > 0.8 ? 's' : 'd';
      });
      for (let i = 0; i < 24; i++) {
        const cx = hash(i, 1, 212) * 44 - 2;
        const cy = hash(i, 2, 212) * 34 - 2;
        if (hash(i, 5, 212) < 0.6 && ((cx > 24 && cy < 9) || (cx > 4 && cx < 19 && cy > 12 && cy < 20))) continue;
        const len = 6 + hash(i, 3, 212) * 3.5;
        const ang = hash(i, 4, 212) * Math.PI;
        const col = i % 3 === 2 ? 'd' : 'g';
        leaf(c, cx, cy, len, len * 0.36, ang, col, col === 'g' ? 'd' : 'g');
      }
      // A brown vine hanging from the top, a little left of the middle.
      c.curve(16, -1, 13, 10, 17, 22, 'n', 1.2, 1);
      // The branch, from edge to edge: lit on top, dark underneath, moss on it.
      const top = (x: number): number => 21.6 + Math.sin(x / 9) * 0.8 + (x - 20) * 0.04 + (c.noise(x, 0, 2.5, 220) - 0.5) * 0.8;
      c.fill((x, y) => {
        const t = top(x);
        const w = c.wobble(x, y, 224) * 0.5;
        if (y + 0.5 < t || y + 0.5 > t + 4.2 + w) return undefined;
        if (y + 0.5 < t + 1 && hash(x, y, 221) < 0.45) return 'o';
        if (y + 0.5 > t + 3.2 + w) return 'c';
        return 'n';
      });
      c.fill((x, y) => {
        const t = top(x);
        if (y + 0.5 < t || y + 0.5 > t + 1.6 + c.noise(x, y, 2, 223) || c.noise(x, 3, 2.4, 222) < 0.6) return undefined;
        return 'g';
      });
      // The toucan: an upright body, the head at the top right, a long tail hanging to the bottom right edge.
      c.poly([29, 21, 34, 20, 38.6, 30, 33.4, 30], 'c');
      c.blob(31.5, 13.8, 5.8, 8.2, 'c', undefined, undefined, 230, 0.12);
      c.blob(31, 6.6, 5.2, 4.6, 'c', undefined, undefined, 231, 0.1);
      // A faint grey sheen down the folded wing.
      for (let y = 9; y <= 22; y++) {
        const x = Math.round(34 + (y - 9) * 0.15 + Math.sin(y / 2) * 0.6);
        if (y % 2 === 0 || hash(x, y, 232) < 0.35) c.put(x, y, 'e');
      }
      // The red patch under the tail, just above the branch.
      c.rect(31, 20, 33, 20, 'r');
      c.put(32, 19, 'r');
      // Feet gripping the branch.
      for (const x of [29, 30, 33, 34]) c.put(x, 21, 'e');
      // The white bib under the beak, a little yellow at its lower edge.
      c.blob(28.4, 11.6, 2.5, 2.3, 'w', undefined, undefined, 233, 0.15);
      c.fill((x, y) => (c.at(x, y) === 'w' && y >= 12 && c.at(x, y + 1) !== 'w' ? 'y' : undefined));
      // The eye high on the head: blue bare skin, an orange ring, a dark pupil.
      c.blob(32, 5, 2.2, 1.9, 'b', undefined, undefined, 234, 0.1);
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) c.put(32 + dx, 5 + dy, 'o');
      c.put(32, 5, 'c');
      // The great beak, reaching far to the left: a yellow ridge arching to the tip, a red stripe under, a dark tip.
      const x0 = 3;
      const x1 = 28;
      c.fill((x, y) => {
        if (x < x0 || x > x1) return undefined;
        const t = (x - x0) / (x1 - x0);
        const ridge = 9.4 - 6.4 * Math.sin((Math.PI / 2) * t) ** 0.6;
        const under = 9.7 + 1.7 * t ** 1.6 + Math.sin(t * 9) * 0.25;
        if (y + 0.5 < ridge || y + 0.5 > under + 0.5) return undefined;
        if (x < x0 + 3) return 'c';
        if (y + 0.5 < ridge + 1.2 + t * 0.5) return 'y';
        if (y + 0.5 > under - 0.5) return 'r';
        return 'o';
      });
    },
  },
  {
    title: 'Starfish in a rock pool',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 3, seed: 3347, strength: 1 },
    draw: (c: Canvas) => {
      // Clear shallow water over a bed of pebbles: sky blue water, deeper blue hollows.
      c.fill((x, y) => {
        const n = c.noise(x, y, 7, 951) + (c.noise(x, y, 2.5, 952) - 0.5) * 0.35;
        return n < 0.38 ? 'b' : 's';
      });
      // Pebbles of several colours, each a small rough blob, scattered over the whole floor.
      const pebbleCols = 'enwen';
      for (let i = 0; i < 150; i++) {
        const x = hash(i, 1, 953) * 42 - 1;
        const y = hash(i, 2, 953) * 32 - 1;
        const rx = 0.8 + hash(i, 3, 953) * 1.1;
        const ry = 0.6 + hash(i, 4, 953) * 0.8;
        const col = pebbleCols[Math.floor(hash(i, 5, 953) * pebbleCols.length)] as string;
        const shade = col === 'w' ? 'e' : undefined;
        c.blob(x, y, rx, ry, col, rx > 1.6 ? shade : undefined, undefined, 954 + i, 0.35);
      }
      // Sunlight ripples over the water between the pebbles.
      ripples(c, 0, 29, 'w', 'sb', 26, 955);
      // Seaweed fronds in two greens from the lower left and upper right.
      c.curve(2, 30, 5, 24, 3, 17, 'd', 1.8, 0.8);
      c.curve(5, 30, 9, 25, 8, 19, 'g', 1.6, 0.8);
      c.curve(0, 26, 2, 22, 0, 18, 'g', 1.4, 0.8);
      c.curve(38, -1, 34, 4, 36, 9, 'd', 1.6, 0.8);
      c.curve(40, 3, 37, 7, 39, 12, 'g', 1.4, 0.8);
      for (const [x, y, a, col] of [[5, 22, -0.6, 'g'], [8, 20, 0.8, 'd'], [35, 6, 2.4, 'g'], [37, 10, -2.3, 'd']] as const)
        leaf(c, x, y, 2.2, 0.9, a, col);
      // Sea urchins: purple with charcoal spines, a glint of white.
      for (const [ux, uy, R, s] of [[33, 23, 2.2, 960], [7, 6, 1.9, 961], [35, 4, 1.4, 962]] as const) {
        for (let k = 0; k < 12; k++) {
          const a = (k / 12) * Math.PI * 2 + hash(k, 0, s) * 0.3;
          const L = R + 0.8 + hash(k, 1, s) * 1.0;
          c.curve(ux, uy, ux + Math.cos(a) * L * 0.5, uy + Math.sin(a) * L * 0.5, ux + Math.cos(a) * L, uy + Math.sin(a) * L, 'c', 1);
        }
        c.blob(ux, uy, R, R * 0.9, 'p', undefined, undefined, s, 0.2);
        c.fill((x, y, now) => (now === 'p' && Math.hypot(x + 0.5 - ux, y + 0.5 - uy) < R - 0.6 && hash(x, y, s + 1) < 0.22 ? 'c' : undefined));
        c.put(Math.floor(ux - R * 0.4), Math.floor(uy - R * 0.4), 'w');
      }
      // Small shells: pink fans with white ribs, and a white cone.
      sprite(c, 28, 9, ['.kkk.', 'kwkwk', 'kwkwk', '.kwk.', '..k..']);
      sprite(c, 3, 14, ['.kk', 'kwk', 'kk.']);
      sprite(c, 13, 25, ['.w..', 'wkw.', '.wkw', '..ww']);
      // The starfish: orange, a red rim on its shaded side, red and yellow tubercles in rows along each arm.
      const cx = 20;
      const cy = 15.8;
      const turn = -Math.PI / 2 + 0.15;
      c.fill((x, y) => {
        const { r, reach } = starAt(cx, cy, 4.4, 15, turn, x, y);
        const wob = (c.noise(x, y, 2.2, 957) - 0.5) * 1.2;
        return r < reach + wob ? 'o' : undefined;
      });
      // Rim: squares of the star on its lower right edge turn red, as does the tip of each arm.
      const marks: [number, number][] = [];
      c.fill((x, y, now) => {
        if (now !== 'o') return undefined;
        const out = ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).filter(([dx, dy]) => c.at(x + dx, y + dy) !== 'o' && c.at(x + dx, y + dy) !== undefined);
        if (out.length === 0) return undefined;
        const lit = out.some(([dx, dy]) => dx < 0 || dy < 0) && !out.some(([dx, dy]) => dx > 0 || dy > 0);
        if (!lit && hash(x, y, 958) < 0.85) marks.push([x, y]);
        return undefined;
      });
      for (const [x, y] of marks) c.put(x, y, 'r');
      // Tubercles: along each arm's spine a row of yellow, beside it red dots.
      c.fill((x, y, now) => {
        if (now !== 'o') return undefined;
        const { r, arm, reach } = starAt(cx, cy, 4.4, 15, turn, x, y);
        if (r < 1.2) return 'y';
        if (r < 2.4) return hash(x, y, 959) < 0.5 ? 'r' : undefined;
        if (arm > 0.93 && r < reach - 1 && Math.floor(r) % 2 === 0) return 'y';
        if (arm > 0.55 && arm < 0.85 && hash(x, y, 960) < 0.3) return 'r';
        return hash(x, y, 961) < 0.08 ? 'y' : undefined;
      });
    },
  },
  {
    title: 'Dove in stained glass',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 5, seed: 1581, strength: 2 },
    draw: (c: Canvas) => {
      const cx = 19.5;
      // Stone wall: irregular stones round jittered points, brown and orange, grey mortar between them.
      const pts: [number, number, number][] = [];
      for (let j = -1; j < 9; j++)
        for (let i = -1; i < 10; i++) pts.push([i * 4.7 + (j % 2) * 2.3 + hash(i, j, 11) * 2.2, j * 3.8 + hash(i, j, 12) * 1.8, hash(i, j, 13)]);
      c.fill((x, y) => {
        let d1 = 1e9;
        let d2 = 1e9;
        let k = 0;
        for (const [px, py, h] of pts) {
          const d = Math.hypot((x + 0.5 - px) / 1.3, y + 0.5 - py);
          if (d < d1) {
            d2 = d1;
            d1 = d;
            k = h;
          } else if (d < d2) d2 = d;
        }
        if (d2 - d1 < 0.5) return 'e';
        return k < 0.5 ? 'n' : 'o';
      });
      c.speckle('e', 'no', 0.03, 14);
      // The lancet: straight sides, a pointed arch of two arcs, a sill below.
      const hw = 12.5;
      const R = 17;
      const off = R - hw;
      const spring = 16.2;
      const yb = 26.4;
      const inset = (x: number, y: number): number => {
        let d = Math.min(hw - Math.abs(x - cx), yb - y);
        if (y < spring) d = Math.min(d, R - Math.hypot(x - (x < cx ? cx + off : cx - off), y - spring));
        return d;
      };
      // Perimeter position, for the border of small panes.
      const along = (x: number, y: number): number => {
        if (y >= yb - 3) return x;
        if (y >= spring) return y;
        const ax = x < cx ? cx + off : cx - off;
        return Math.atan2(y - spring, x - ax) * R * (x < cx ? -1 : 1);
      };
      c.fill((x, y) => {
        const d = inset(x, y);
        if (d < -1.5) return undefined;
        if (d < 0) return frac(along(x, y) / 3.4 + 0.3) < 0.2 || (d < -1 && x > cx + 4 && hash(x, y, 16) < 0.5) ? 'e' : 'w';
        if (d < 0.9) return 'c';
        if (d < 2.6) {
          const p = along(x, y);
          if (frac(p / 4) < 0.25) return 'c';
          return Math.floor(p / 4) % 2 ? 'y' : 'r';
        }
        if (d < 3.4) return 'c';
        // Diamond quarries, lead on both diagonals.
        const u = x + y;
        const v = x - y;
        if (((u % 7) + 7) % 7 === 0 || (((v - 4) % 7) + 7) % 7 === 0) return 'c';
        const i = Math.floor(u / 7);
        const j = Math.floor((v - 4) / 7);
        const pal = (i - j) * 3.5 > 19 ? 'gdy' : 'bsp';
        return pal[(((i + 2 * j) % 3) + 3) % 3];
      });
      // The sill.
      c.fill((x, y) => (y >= 26 && y <= 27 && Math.abs(x - cx) < hw + 2.4 - (hash(x, y, 15) < 0.3 ? 1 : 0) ? (y === 26 ? 'w' : 'e') : undefined));
      // The dove, wings raised, in a halo of gold glass, leaded in.
      const DOVE = [
        'w..............w',
        'ww............ww',
        'eww..........wwe',
        'wwww..wwww..wwww',
        '.wewwwwwwwwwwew.',
        '.wwwwwcwwcwwwww.',
        '..wwwwwoowwwww..',
        '..ewwwwwwwwwwe..',
        '...ee.wwww.ee...',
        '......wwww......',
        '......wwww......',
        '.....wwwwww.....',
        '....wwewweww....',
        '....w.w..w.w....',
      ];
      c.fill((x, y) => {
        const h = Math.hypot(x - cx, y - 10.5);
        return h < 4.3 && y < 12 ? (h > 3.3 ? 'c' : h > 2.3 ? 'y' : 'c') : undefined;
      });
      sprite(c, 12, 6, DOVE);
    },
  },
  {
    title: 'Butterfly wing close-up',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1322, strength: 0.5 },
    draw: (c: Canvas) => {
      // A leaf behind: green with darker shade and its veins, sunlit specks.
      c.fill((x, y) => (c.noise(x, y, 5, 21) > 0.55 ? 'd' : 'g'));
      c.curve(39, 1, 29, 14, 36, 30, 'y', 1.6);
      for (const [x0, y0, x1, y1] of [[34, 5, 40, 8], [32, 13, 40, 16], [33, 22, 40, 24]] as const) c.curve(x0, y0, (x0 + x1) / 2, y0 + 1, x1, y1, 'd', 1.5);
      c.speckle('y', 'g', 0.03, 22);
      // The wing, seen from its root at the left edge: a forewing above, a hindwing below, black veins
      // fanning out between orange cells, a black margin with white spots, scalloped between the veins.
      const bx = 0.5;
      const by = 13.2;
      const N = 0.27;
      const split = 0.35;
      c.fill((x, y) => {
        const dx = x + 0.5 - bx;
        const dy = y + 0.5 - by;
        const r = Math.hypot(dx, dy);
        // The wing is tipped a little clockwise, so its leading edge runs down to the right.
        const th = Math.atan2(dy, dx) - 0.14;
        if (th < -1.52 || th > 1.52) return undefined;
        const fore = th < split;
        const rx = fore ? 38 : 23;
        const ry = fore ? 13.4 : 14;
        // The veins sweep gently forward as they run out, so none lies flat.
        const tw = th - 0.006 * r;
        const k = frac((tw - split) / N);
        // A pointed forewing, a rounder hindwing.
        const pw = fore ? 1.7 : 2.2;
        const edge = (a: number, kk: number) =>
          1 / ((Math.abs(Math.cos(a)) / rx) ** pw + (Math.abs(Math.sin(a)) / ry) ** pw) ** (1 / pw) - 1.1 * (1 - Math.sin(Math.PI * kk));
        const rm = edge(th, k) + (c.noise(x, y, 2, 23) - 0.5) * 0.5;
        if (r > rm) return undefined;
        if (r < 5 + (c.noise(x, y, 2, 24) - 0.5) * 2) return hash(x, y, 24) < 0.2 ? 'e' : 'n';
        if (Math.abs(th - split) * r < 0.75) return 'c';
        const band = rm - r;
        const mid = Math.abs(k - 0.5) < 0.17;
        if (band < 3.1) {
          // A white spot in the margin at the end of each cell; where the margin is long, two spots to a cell.
          const M = edge(th, 0.5) > 22 ? N / 2 : N;
          const ac = split + (Math.floor((tw - split) / M) + 0.5) * M + 0.006 * r;
          const rc = edge(ac, 0.5) - 1.6;
          if (Math.hypot(dx - rc * Math.cos(ac + 0.14), dy - rc * Math.sin(ac + 0.14)) < 0.95) return 'w';
          return 'c';
        }
        const idx = Math.round((tw - split) / N);
        if (Math.min(k, 1 - k) * N * r < 0.62 && (r > 10.5 || idx % 2 === 0)) return 'c';
        if (Math.abs(r - 10.5) < 0.6 && th > -0.95 && th < 1.0) return 'c';
        if (r < 10.5) return 'r';
        if (mid && band > 4.3 && band < 6.9) return 'y';
        return 'o';
      });
      // Eyespots: rings inside each other.
      const eyespot = (ex: number, ey: number, s: number) =>
        c.fill((x, y) => {
          const q = Math.hypot(x + 0.5 - ex, (y + 0.5 - ey) * 1.1) / s;
          if (q > 1) return undefined;
          if (q < 0.3) return Math.hypot(x + 0.5 - ex + 0.5, y + 0.5 - ey + 0.5) < 0.75 ? 'w' : 'c';
          if (q < 0.56) return 'b';
          if (q < 0.8) return 'c';
          return 'y';
        });
      eyespot(23.5, 9.6, 4.6);
      eyespot(10.3, 22.6, 3.8);
      // Keep the leaf's dark shade off the wing's black margin.
      c.fill((x, y, now) => (now === 'd' && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => c.at(x + a!, y + b!) === 'c') ? 'g' : undefined));
      // The body's furry edge at the left.
      c.fill((x, y) => (x + (c.noise(x, y, 2, 26) - 0.5) * 2 < 1.2 ? (hash(x, y, 27) < 0.3 ? 'e' : 'n') : undefined));
    },
  },
  {
    title: 'Coral snake among leaves',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 3, seed: 3345, strength: 1 },
    draw: (c: Canvas) => {
      // The snake: one S from the tail at the lower left to the head, raised, at the upper right.
      const path = spline([
        [1, 27],
        [13, 27.5],
        [26, 25.5],
        [32.5, 20.5],
        [28, 15],
        [17, 14],
        [8.5, 11],
        [9, 5.5],
        [17, 3.5],
        [26, 5],
      ]);
      const total = path[path.length - 1]!.s;
      const nearest = (x: number, y: number): { d: number; s: number; dx: number; dy: number } => {
        let best = Infinity;
        let bi = 0;
        for (let i = 0; i < path.length; i++) {
          const d = (path[i]!.x - x) ** 2 + (path[i]!.y - y) ** 2;
          if (d < best) {
            best = d;
            bi = i;
          }
        }
        const p = path[bi]!;
        return { d: Math.sqrt(best), s: p.s, dx: x - p.x, dy: y - p.y };
      };
      // Thin at the tail, full along the body, the head a little broader.
      const half = (s: number): number => {
        const t = s / total;
        const h = total - s;
        if (t < 0.18) return 1.0 + (t / 0.18) * 1.1;
        if (h < 3) return 2.4;
        if (h < 4.6) return 1.9;
        return 2.1;
      };
      // The forest floor: dark moss showing only in chinks between fallen leaves, laid in two staggered
      // layers, each leaf pointed and veined and of another colour than the leaves it lies on. The leaves
      // the snake lies among are the dull ones, so its bright bands stand out.
      c.fill(() => 'd');
      const vein: Record<string, string> = { o: 'n', y: 'o', r: 'n', n: 'o', p: 'n', g: 'd' };
      let i = 0;
      for (const [ox, oy] of [[0, 0], [3.2, 2.8]] as const)
        for (let gy = -1; gy < 6; gy++)
          for (let gx = -1; gx < 7; gx++, i++) {
            const x = 2 + ox + gx * 6.4 + (hash(i, 1, 921) - 0.5) * 2.4;
            const y = 2 + oy + gy * 5.6 + (hash(i, 2, 921) - 0.5) * 2.2;
            // Leaves lie roughly along or across the slope: a vein at forty-five degrees would step like a checkerboard.
            const ang = Math.floor(hash(i, 6, 921) * 4) * (Math.PI / 2) + (hash(i, 7, 921) - 0.5) * 0.8;
            const len = 3.4 + hash(i, 4, 921) * 1.2;
            const near = nearest(x, y);
            const palette = near.d < half(near.s) + 3.5 ? 'onopgn' : 'oonrnopgoyn';
            const seen = [0, 1, -1].map((t) => {
              const px = Math.round(x + Math.cos(ang) * len * t * 0.8);
              const py = Math.round(y + Math.sin(ang) * len * t * 0.8);
              return c.at(Math.max(0, Math.min(39, px)), Math.max(0, Math.min(29, py)));
            });
            let k = Math.floor(hash(i, 3, 921) * palette.length);
            for (let tries = 0; tries < palette.length && seen.includes(palette[k]!); tries++) k = (k + 1) % palette.length;
            const col = palette[k]!;
            leaf(c, x, y, len, 1.8 + hash(i, 5, 921) * 0.5, ang, col, vein[col]);
          }
      const body: boolean[] = [];
      for (let y = 0; y < 30; y++)
        for (let x = 0; x < 40; x++) {
          const n = nearest(x + 0.5, y + 0.5);
          body.push(n.d <= half(n.s));
        }
      const on = (x: number, y: number): boolean => x >= 0 && x < 40 && y >= 0 && y < 30 && body[y * 40 + x]!;
      // A thin shadow under the body, down and to the right; under the raised head a square more.
      c.fill((x, y) => {
        if (on(x, y)) return undefined;
        if (on(x - 1, y - 1) || on(x, y - 1)) return 'n';
        const n = nearest(x - 1.5, y - 1.5);
        return total - n.s < 3.5 && n.d <= half(n.s) ? 'n' : undefined;
      });
      // Bands from the head back: a black snout with the eyes, a yellow head band, then black, yellow, red,
      // yellow, repeating, each wide band lit on its upper left.
      const period = 8;
      c.fill((x, y) => {
        if (!on(x, y)) return undefined;
        const n = nearest(x + 0.5, y + 0.5);
        const h = total - n.s + (hash(x, y, 915) - 0.5) * 0.4;
        const lit = (-0.6 * n.dx - 0.8 * n.dy) / half(n.s) > 0.4 && hash(x, y, 916) < 0.6;
        if (h < 2.2) return 'c';
        if (h < 4) return 'y';
        const ph = (h - 4) % period;
        if (ph < 2.5) return 'c';
        if (ph < 4) return 'y';
        if (ph < 6.5) return lit ? 'o' : 'r';
        return 'y';
      });
      // Where the body meets a warm leaf, the leaf's edge lies in its shade: a one-square brown rim.
      c.fill((x, y, now) => {
        if (on(x, y) || !'ryo'.includes(now)) return undefined;
        return ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dy]) => on(x + dx, y + dy)) ? 'n' : undefined;
      });
      // The eyes, either side of the snout, and a forked red tongue flicking ahead.
      c.put(25, 3, 'w');
      c.put(25, 6, 'w');
      c.fill((x, y) => (!on(x, y) && (x - 30.5) ** 2 + (y - 5) ** 2 < 6 ? 'n' : undefined));
      c.put(29, 5, 'r');
      c.put(30, 5, 'r');
      c.put(31, 4, 'r');
      c.put(31, 6, 'r');
    },
  },
  {
    title: 'Harbour fireworks',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1362, strength: 1.5 },
    overrides: { c: 'v' },
    draw(c) {
      // The night, with drifting smoke catching the light in blue, and stray grey smoke at the top left and right edge.
      c.fill((x, y) => (c.noise(x, y, 6, 101) + c.wobble(x, y, 102) * 0.08 > 0.68 ? 'b' : 'c'));
      c.fill((x, y) => {
        const tl = Math.hypot((x - 2) / 6, (y - 0.5) / 2.2) + (c.noise(x, y, 2.5, 103) - 0.5) * 0.7;
        const re = Math.hypot((x - 40) / 2, (y - 5) / 3.5) + (c.noise(x, y, 2.5, 104) - 0.5) * 0.7;
        return tl < 1 || re < 1 ? 'e' : undefined;
      });
      // Single sparks scattered over the whole sky.
      c.fill((x, y) => (y < 19 && hash(x, y, 105) < 0.06 ? 'yorw'[Math.floor(hash(x, y, 106) * 4)] : undefined));
      // The bursts: the big yellow one, the pink one, the green one below it, and a small red-and-orange one low on the left.
      burst(c, 30, 6.5, 6.6, 'w', 'k', 'r', 'p', 120, 'p', 'b');
      burst(c, 33.5, 14.5, 3.8, 'w', 'g', 'g', 'w', 130);
      burst(c, 5, 15, 3.2, 'o', 'r', 'o', 'y', 140);
      burst(c, 14, 7, 9, 'w', 'y', 'o', 'p', 110, undefined, 'b');
      // The town on the quay: grey houses of uneven height across the middle, a spire, a few lit windows.
      c.fill((x, y) => {
        if (x < 5 || x > 35) return undefined;
        const house = Math.floor((x + 1 + hash(Math.floor(x / 3), 0, 160) * 1.5) / 3);
        const top = x < 7 || x > 33 ? 19 : 19 - Math.floor(hash(house, 1, 161) * 3);
        return y >= top && y < 21 ? 'e' : undefined;
      });
      c.poly([21.5, 12, 23.5, 12, 24, 18, 21, 18], 'e');
      c.put(22, 11, 'e');
      c.put(22, 10, 'e');
      for (const [x, y] of [[8, 19], [12, 18], [15, 19], [19, 19], [22, 15], [26, 19], [29, 18], [32, 19]] as const) c.put(x, y, 'y');
      // A rocket trail rising from the lower middle towards the bursts.
      for (let y = 17; y >= 10; y--) if (hash(2, y, 150) > 0.25) c.put(Math.round(19 - (17 - y) * 0.4), y, 'w');
      // The harbour water: navy and blue in broken bands, the bursts mirrored as short broken streaks.
      c.fill((x, y) => {
        if (y < 21) return undefined;
        const p = y + (c.noise(x, 0, 5, 170) - 0.5) * 2 + Math.sin(x / 3 + y) * 0.6;
        const inner = x > 1 + hash(0, y, 172) * 2 && x < 38 - hash(1, y, 172) * 2;
        return inner && (Math.floor(p / 1.5) % 2 === 0 || c.noise(x, y * 3, 3, 171) > 0.62) ? 'c' : 'b';
      });
      const mirror = (x0: number, x1: number, col: string, salt: number, share: number): void => {
        for (let y = 21; y < 30; y++)
          for (let x = x0; x <= x1; x++) if (hash(Math.floor((x + y * 5) / 3), y, salt) < share - (y - 21) * 0.02) c.put(x, y, col);
      };
      mirror(9, 18, 'o', 181, 0.3);
      mirror(10, 17, 'y', 180, 0.28);
      mirror(27, 33, 'k', 182, 0.32);
      mirror(3, 7, 'r', 183, 0.25);
      // The boat: a brown hull and a white sail.
      c.poly([16.5, 25.4, 24.5, 25.4, 23, 27.4, 18, 27.4], 'n');
      c.poly([20.5, 20.5, 20.5, 25, 24, 25], 'w');
      c.line(20, 20, 20, 25, 'n');
    },
  },
  {
    title: 'Leopard on a branch at dusk',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1382, strength: 2 },
    draw: (c: Canvas) => {
      // Dusk sky, deep blue through purple to pink; the sun, ringed in orange, in open sky above the leopard.
      c.bands(0, 28, 'bbpppk', 21, 1.2, 8);
      c.blob(20.5, 4.2, 3.5, 3.3, 'o', undefined, undefined, 27, 0.12);
      c.blob(20.5, 4.2, 2.3, 2.2, 'y', undefined, 'w', 22, 0.1);
      land(c, 27.5, 0.8, 'dc', 24, 3, 7);
      // The tree: a trunk on the left and a thick limb reaching right under the whole leopard, lit orange on top,
      // brown with charcoal bark, dark below.
      c.fill((x, y) => {
        const mid = 4.4 + Math.sin(y / 4.5) * 0.9 + (c.noise(0, y, 4, 40) - 0.5) * 1.6;
        const half = 2.1 + (y > 23 ? (y - 23) * 0.3 : 0) + (hash(x, y, 41) - 0.5) * 0.9;
        return Math.abs(x + 0.5 - mid) < half ? 'n' : undefined;
      });
      c.curve(4, 18.5, 20, 19.5, 40, 17.5, 'n', 5.4, 4.2);
      c.fill((x, y, now) => (now === 'n' && x > 6 && c.at(x, y + 1) !== 'n' && c.at(x, y + 1) !== undefined ? 'c' : undefined));
      c.fill((x, y, now) => (now === 'n' && x > 6 && c.at(x, y + 1) === 'c' && hash(x, y, 27) < 0.35 ? 'c' : undefined));
      const top: [number, number][] = [];
      c.fill((x, y, now) => (now === 'n' && x > 6 && c.at(x, y - 1) !== 'n' && hash(x, y, 28) < 0.85 && void top.push([x, y])) || undefined);
      for (const [x, y] of top) c.put(x, y, 'o');
      c.fill((x, y, now) => (now === 'n' && c.noise(x, y, 1.6, 26) > 0.8 ? 'c' : undefined));
      // Grass in front of the foot of the trunk.
      c.fill((x, y) => (y >= 28.3 + (c.noise(x, 0, 3, 28) - 0.5) * 1.5 ? (hash(x, y, 29) < 0.2 ? 'c' : 'd') : undefined));
      // Leaves: a canopy over the top of the trunk, one leaf over the edge of the sun, a spray under the limb's end.
      const leaves = [
        [1, 1, 0.4, 'g'], [5, 0, 2.2, 'd'], [9, 2, -0.2, 'g'], [13, 1, 0.5, 'd'], [1, 6, 2.7, 'd'], [7, 5, -0.6, 'g'],
        [11, 6, 0.4, 'd'], [4, 2, 1.2, 'g'], [16.5, 3, -0.4, 'g'], [16, 6.5, 0.6, 'd'], [38, 22.5, 1.0, 'd'], [35.5, 23, 2.1, 'g'],
        [1, 22, 0.9, 'd'],
      ] as const;
      for (const [x, y, a, col] of leaves) leaf(c, x, y, 2.6, 1.1, a, col, col === 'g' ? 'd' : 'g');
      // The leopard lies ON the limb, head to the right on its paws, legs and tail hanging below; a dark outline
      // sets it off the sky.
      const body = (x: number, y: number) => {
        const t = Math.max(0, Math.min(1, (x + 0.5 - 12) / 16));
        const d = Math.hypot(x + 0.5 - (12 + 16 * t), y + 0.5 - (13.2 - 0.4 * t - Math.sin(Math.PI * t) * 0.7));
        return d < 3.5 + Math.sin(Math.PI * t * 1.6) * 0.5 + (c.noise(x, y, 2, 30) - 0.5) * 1.2;
      };
      const before = Array.from({ length: 30 }, (_, y) => Array.from({ length: 40 }, (_, x) => c.at(x, y) ?? '-').join(''));
      outlined(c, 'c', () => {
        c.curve(10, 14, 7, 21, 9, 25, 'y', 2.2, 1.8);
        c.curve(9, 25, 9.5, 27, 12, 26.5, 'y', 1.8, 1.4);
        c.curve(15, 15, 14.5, 20, 15, 25, 'y', 2.5, 2);
        c.curve(26, 15, 26.5, 20, 26, 25, 'y', 2.5, 2);
        c.fill((x, y) => (body(x, y) ? 'y' : undefined));
        sprite(c, 29, 7, [
          '.yy...yy.',
          'ykyyyyyky',
          'yyycycyyy',
          'yggyyyggy',
          'ycgyyygcy',
          'yyyywyyyy',
          'oyywkwyyo',
          '.owwcwwo.',
          '..owwwo..',
        ]);
        sprite(c, 28, 16, ['yyoyy.yyoyy']);
      });
      // The outline stays off the limb: the leopard lies on its lit top and the legs hang in front of it.
      c.fill((x, y, now) => (now === 'c' && y >= 15 && y <= 23 && x > 6 && 'no'.includes(before[y]![x]!) ? before[y]![x] : undefined));
      const legs: [number, number, number, number][] = [[5, 17, 17, 28], [24, 17, 28, 26]];
      const onLeg = (x: number, y: number) => legs.some(([x0, y0, x1, y1]) => x >= x0 && x <= x1 && y >= y0 && y <= y1);
      // Shade on the far side of the hanging legs and tail, and along the belly.
      c.fill((x, y, now) => (now === 'y' && onLeg(x, y) && c.at(x + 1, y) === 'c' ? 'o' : undefined));
      // Rosettes, small and scattered: little charcoal rings round an orange centre, and a few solid spots.
      const rings = [['.c.', 'c.c', '.c.'], ['cc.', 'c.c', '.c.'], ['.c.', 'c.c', '.cc']];
      const free = (x: number, y: number) => body(x, y) && c.at(x, y) === 'y';
      let n = 0;
      for (let i = 0; i < 400 && n < 11; i++) {
        const x = 7 + Math.floor(hash(i, 1, 36) * 22);
        const y = 8 + Math.floor(hash(i, 2, 36) * 7);
        const rows = rings[n % rings.length]!;
        let ok = true;
        for (let dy = -1; dy <= 3 && ok; dy++)
          for (let dx = -1; dx <= 3 && ok; dx++)
            if (c.at(x + dx, y + dy) === 'c' && dx >= 0 && dx <= 2 && dy >= 0 && dy <= 2) ok = false;
            else if (dx >= 0 && dx <= 2 && dy >= 0 && dy <= 2 && !free(x + dx, y + dy)) ok = false;
            else if (c.at(x + dx, y + dy) === 'c' && body(x + dx, y + dy)) ok = false;
        if (!ok) continue;
        rows.forEach((row, dy) => [...row].forEach((k, dx) => k === 'c' && c.put(x + dx, y + dy, 'c')));
        c.put(x + 1, y + 1, 'o');
        n++;
      }
      c.fill((x, y, now) => (now === 'y' && free(x, y) && x < 29 && hash(x, y, 37) < 0.07 && !([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dy]) => c.at(x + dx, y + dy) === 'c') ? 'c' : undefined));
      // Small solid spots on the legs, rings round the tail.
      c.fill((x, y, now) => (now === 'y' && onLeg(x, y) && x > 12 && y > 17 && hash(x, y, 33) < 0.16 ? 'c' : undefined));
      c.fill((x, y, now) => ('yo'.includes(now) && x < 13 && y > 18 && (y + (x > 10 ? 1 : 0)) % 3 === 0 ? 'c' : undefined));
    },
  },
  {
    title: 'Bees on the comb',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 5, seed: 1564, strength: 1.5 },
    draw(c) {
      // The comb: staggered cells with jittered centres, brown wax walls where two cells meet.
      const cells: [number, number, string][] = [];
      for (let j = -1; j < 9; j++)
        for (let i = -1; i < 10; i++) {
          const x = i * 5 + (j % 2 === 0 ? 0 : 2.5) + (hash(i, j, 401) - 0.5) * 1.2;
          const y = j * 4.2 + (hash(i, j, 402) - 0.5) * 1;
          const r = hash(i, j, 403);
          const nearBee = (x > 8 && x < 32 && y > 6 && y < 24) || (x > 27 && (y < 9 || y > 20));
          cells.push([x, y, r < 0.5 ? 'o' : r < 0.7 ? 'y' : r < 0.84 ? 'Y' : r < 0.92 && !nearBee ? 'c' : r < 0.92 ? 'o' : 'r']);
        }
      c.fill((x, y) => {
        const d = cells.map(([cx, cy], k) => [Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.15), k] as const).sort((a, b) => a[0] - b[0]);
        const [d0, k] = d[0]!;
        if (d[1]![0] - d0 < 0.85) return 'n';
        const [cx, cy, kind] = cells[k]!;
        const ux = x + 0.5 - cx;
        const uy = y + 0.5 - cy;
        const glint = Math.floor(cx - 1) === x && Math.floor(cy - 1) === y;
        if (kind === 'o') return glint ? 'w' : ux + uy > 1.3 ? 'y' : 'o';
        if (kind === 'y') return glint ? 'w' : ux + uy < -1.3 ? 'o' : 'y';
        if (kind === 'Y') return 'y';
        if (kind === 'c') return 'c';
        return d0 < 1.4 ? 'r' : 'o';
      });
      // Bits of old wax.
      for (let i = 0; i < 9; i++) c.put(Math.floor(hash(i, 1, 410) * 40), Math.floor(hash(i, 2, 410) * 30), 'e');
      // The torn hole at the lower left: the dark hive shows through.
      c.fill((x, y) => {
        const d = Math.hypot((x - 4.5) / 5.5, (y - 25.5) / 4.2) + (c.noise(x, y, 2, 420) - 0.5) * 0.6 + (hash(x, y, 421) - 0.5) * 0.25;
        if (d > 1) return undefined;
        return c.noise(x, y, 2.2, 422) > 0.52 ? 'n' : 'c';
      });
      // The big bee in the middle and two small ones near the right edge, each ringed in charcoal.
      outlined(c, 'c', () => bee(c, 18.5, 15, 3.6, 'n'));
      for (const [x, y] of [[10, 13], [9, 12], [8, 11], [10, 17], [9, 18], [8, 19]] as const) c.put(x, y, 'e');
      const small = ['..swws...', '.swwwws..', 'ccyycyyc.', 'ccyycyyc.', '.swwwws..', '..swws...'];
      outlined(c, 'c', () => sprite(c, 30, 2, small));
      outlined(c, 'c', () => sprite(c, 29, 22, small));
    },
  },
  {
    title: 'Clownfish in an anemone',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1366, strength: 1.5 },
    draw: (c) => {
      // Sunlit reef water: blue, sky where the light falls in from above, with drifting specks.
      c.fill((x, y) => (c.noise(x, y, 6, 9301) + (c.noise(x, y, 2.5, 9302) - 0.5) * 0.3 - y / 40 > 0.42 ? 's' : 'b'));
      c.speckle('w', 'bs', 0.02, 9303);
      // Reef rock below, grey and brown, with a frond of weed and a yellow coral at the sides.
      land(c, 24, 2, 'en', 9304, 3, 6);
      c.curve(2, 29, 0, 22, 3, 15, 'd', 1.6, 1);
      c.curve(37, 29, 39, 23, 36, 17, 'd', 1.6, 1);
      c.blob(35, 26, 4.5, 3, 'y', 'o', undefined, 9305, 0.35);
      // The anemone: a red column on the rock, its tentacles fanned out behind the fish.
      c.blob(20, 25.5, 8, 4.5, 'r', 'n', undefined, 9306, 0.3);
      c.blob(20, 21, 15, 3.5, 'p', undefined, undefined, 9313, 0.35);
      const back = 17;
      for (let i = 0; i < back; i++) {
        const bx = 5 + (30 * i) / (back - 1) + (hash(i, 1, 9307) - 0.5) * 1.5;
        const a = -Math.PI / 2 + ((bx - 20) / 15) * 0.65;
        const [body, tip] = i % 2 ? ['k', 'w'] : ['p', 'k'];
        tentacle(c, bx, 22.5 - Math.abs(bx - 20) * 0.12, a, 11 + hash(i, 2, 9307) * 5, 1.8, hash(i, 3, 9307) * 6, body, tip, 1.6, 1, 0.22);
      }
      // The clownfish, facing left: tail, fins, body, all edged in charcoal.
      const fish = (x0: number, y0: number, s: number, salt: number) =>
        outlined(c, 'c', () => {
          c.blob(x0 + 10.5 * s, y0, 2.4 * s, 3.6 * s, 'o', undefined, undefined, salt, 0.3);
          c.blob(x0 + 1.5 * s, y0 - 4.6 * s, 5.5 * s, 1.9 * s, 'o', undefined, undefined, salt + 1, 0.3);
          c.blob(x0 - 1 * s, y0 + 4.6 * s, 2.6 * s, 1.6 * s, 'o', undefined, undefined, salt + 2, 0.3);
          c.blob(x0, y0, 10.5 * s, 5 * s, 'o', undefined, undefined, salt + 3, 0.12);
          // Three white bands, the head band bowed round the gill and the middle one forward, each edged in charcoal.
          c.fill((x, y, now) => {
            if (now !== 'o') return undefined;
            for (const [bx, hw, bow] of [[-1.4, 0.8, -0.08], [4, 1, 0.08], [8.8, 0.6, 0]] as const) {
              const d = Math.abs(x + 0.5 - (x0 + bx * s) - (bow * (y - y0) ** 2) / s - (c.noise(x, y, 3, salt + 4) - 0.5) * 0.6);
              if (d < hw * s) return 'w';
              if (d < hw * s + 0.7) return 'c';
            }
            return undefined;
          });
        });
      fish(19, 11, 1, 9310);
      // The eye, a bright glint in a dark ring, and the mouth.
      sprite(c, 12, 9, ['ccc', 'cwc', 'ccc']);
      c.put(9, 12, 'c');
      // Tentacles in front, curling up over the fish's belly.
      for (let i = 0; i < 5; i++) {
        const bx = 9 + i * 5.5 + (hash(i, 4, 9311) - 0.5) * 2;
        const a = -Math.PI / 2 + ((bx - 20) / 15) * 0.9;
        const [body, tip] = i % 2 ? ['p', 'k'] : ['k', 'w'];
        tentacle(c, bx, 23, a, 6 + hash(i, 5, 9311) * 2.5, 1.4, hash(i, 6, 9311) * 6, body, tip, 1.5, 1);
      }
    },
  },
  {
    title: 'Ring nebula in infrared',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1371, strength: 1.75 },
    overrides: { c: 'v' },
    draw: (c) => {
      // A planetary nebula seen face on, in the false colours of an infrared telescope: a small white star in
      // a blue and sky cavity, a knotted ring of yellow, orange and red, a halo of purple arcs with pink knots,
      // and deep space round it in charcoal (painted navy) with faint brown dust and stars.
      const cx = 20;
      const cy = 15;
      c.fill((x, y) => {
        const dx = (x + 0.5 - cx) / 17;
        const dy = (y + 0.5 - cy) / 13;
        const th = Math.atan2(dy, dx);
        const n = c.noise(x, y, 4, 9401) - 0.5;
        const r = Math.hypot(dx, dy) * (1 + 0.22 * n) + c.wobble(x, y, 9402) * 0.02;
        // Radial spokes: noise along the angle, so knots and lanes point out from the star.
        const spoke = c.noise(th * 9 + 20, r * 4, 1.6, 9403);
        if (r > 1.02) return c.noise(x, y, 2.2, 9404) + (c.noise(x, y, 6, 9412) - 0.5) * 0.4 > 0.66 ? 'n' : 'c';
        if (r > 0.74) return Math.abs(Math.sin(r * 15 + n * 5)) > 0.4 ? 'p' : 'c';
        if (r > 0.6) return spoke > 0.66 ? 'o' : 'r';
        if (r > 0.44) return spoke > 0.7 ? 'n' : spoke < 0.25 ? 'r' : 'o';
        if (r > 0.3) return spoke > 0.72 ? 'o' : 'y';
        // The cavity: sky round the star, deepening to blue towards the ring.
        return r < 0.16 + (c.noise(x, y, 2.5, 9405) - 0.5) * 0.2 || c.noise(x, y, 2, 9413) > 0.72 ? 's' : 'b';
      });
      c.speckle('k', 'p', 0.07, 9406);
      c.speckle('y', 'r', 0.04, 9407);
      c.speckle('s', 'y', 0.03, 9408);
      // Stars in deep space, and a few bright ones with the telescope's cross.
      c.speckle('w', 'cn', 0.05, 9409);
      c.speckle('s', 'c', 0.03, 9410);
      c.speckle('y', 'c', 0.02, 9411);
      for (const [x, y] of [[3, 4], [36, 26], [35, 3]] as const) starCross(c, x, y, 'w', 's');
      // The central star.
      starCross(c, 20, 15, 'w', 'w');
    },
  },
  {
    title: 'Mandrill close-up',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1332, strength: 0.75 },
    draw: (c) => {
      c.fill(() => 'd');
      for (let i = 0; i < 36; i++) leaf(c, hash(i, 1, 501) * 40, hash(i, 2, 501) * 30, 3, 1.3, hash(i, 3, 501) * Math.PI, i % 5 ? 'g' : 'y', i % 2 ? 'd' : undefined);
      // Fur in streaks that run down the face.
      oval(c, 20, 15, 17, 17, 0, (_u, _v, x, y) => {
        const f = c.noise(x * 1.6, y * 0.5, 1.8, 502);
        return f < 0.34 ? 'c' : f > 0.66 ? 'e' : 'n';
      }, 0.15, 503);
      oval(c, 20, 27, 8, 5, 0, (_u, _v, x, y) => (c.noise(x * 1.5, y * 0.6, 1.6, 504) > 0.55 ? 'o' : 'y'), 0.2, 505);
      // The ridged blue cheeks, ridges curving round the nose.
      for (const side of [-1, 1])
        oval(c, 20 + side * 5.4, 17, 3.6, 6.8, side * 0.12, (_u, v, x) => (Math.floor((Math.abs(x + 0.5 - 20) + v * v * 2.5) / 0.85) % 2 ? 's' : 'b'));
      oval(c, 20, 16, 2.2, 9, 0, 'r');
      oval(c, 20, 24.5, 3.2, 1.8, 0, 'r');
      c.put(19, 24, 'c');
      c.put(21, 24, 'c');
      c.curve(13, 9.5, 16, 7.5, 19, 9, 'c', 1.6);
      c.curve(21, 9, 24, 7.5, 27, 9.5, 'c', 1.6);
      c.put(15, 10, 'o');
      c.put(16, 10, 'c');
      c.put(24, 10, 'c');
      c.put(25, 10, 'o');
      for (let i = 0; i < 6; i++) c.putOn(Math.floor(13 + hash(i, 7, 506) * 14), Math.floor(24 + hash(i, 8, 506) * 6), 'w', 'oy');
    },
  },
  {
    title: 'Tiger in tall grass',
    ...LARGE,
    deal: { sceneSeed: 6, buckets: 4, seed: 64081, strength: 2 },
    draw: (c: Canvas) => {
      // Tall grass behind the tiger: swaying blades of green, dark green and dry gold.
      c.fill((x, y) => {
        const sway = (c.noise(x, y, 8, 750) - 0.5) * 4 + (y / 30) * 2;
        const b = c.noise(x + sway, y * 0.12, 1.3, 751);
        const n = c.noise(x, y, 6, 752);
        return b > 0.68 ? (n > 0.55 ? 'y' : 'g') : b > 0.42 ? 'g' : n > 0.72 ? 'g' : 'd';
      });
      // The shoulders under the head, the ears behind it, and the head, all orange.
      c.blob(20, 31, 17, 7, 'o', 'n', undefined, 753, 0.2);
      c.blob(10.5, 4.5, 3.4, 3, 'c', undefined, undefined, 754, 0.15);
      c.blob(29.5, 4.5, 3.4, 3, 'c', undefined, undefined, 755, 0.15);
      c.blob(11, 5, 1.6, 1.3, 'o', undefined, undefined, 754, 0);
      c.blob(29, 5, 1.6, 1.3, 'o', undefined, undefined, 755, 0);
      c.put(11, 4, 'w');
      c.put(29, 4, 'w');
      c.blob(20, 15, 12.5, 10.5, 'o', undefined, undefined, 756, 0.12);
      // White ruffs flaring at the cheeks, white brows, the white whisker pads and chin.
      c.blob(9.5, 19, 4.5, 4, 'w', 'e', undefined, 757, 0.3);
      c.blob(30.5, 19, 4.5, 4, 'w', 'e', undefined, 758, 0.3);
      c.blob(15, 9.6, 2.6, 1.1, 'w', undefined, undefined, 759, 0);
      c.blob(25, 9.6, 2.6, 1.1, 'w', undefined, undefined, 759, 0);
      c.blob(17.6, 20.4, 3.3, 2.6, 'w', undefined, undefined, 760, 0.1);
      c.blob(22.4, 20.4, 3.3, 2.6, 'w', undefined, undefined, 761, 0.1);
      c.blob(20, 23.5, 2.6, 1.8, 'w', undefined, undefined, 762, 0.1);
      // Stripes, each drawn on both sides of the face.
      const stripes = [
        [20, 4.5, 20.3, 6.5, 19.8, 8.5, 1.3, 0.6],
        [17, 4.5, 17, 6, 18, 7.6, 1.1, 0.6],
        [8, 9.5, 10.5, 9, 12.5, 10, 1.4, 0.6],
        [7.5, 13, 10.5, 12.5, 12.5, 14, 1.5, 0.6],
        [8.5, 16.5, 10.5, 16, 12.5, 17, 1.3, 0.6],
        [5.5, 18, 7.5, 19.5, 9.5, 19, 1.1, 0.6],
        [6, 21.5, 8, 22, 10, 21, 1, 0.6],
        [9, 26, 12, 27, 14, 25.5, 1.4, 0.7],
        [4, 26, 6, 28, 8, 27.5, 1.2, 0.7],
      ] as const;
      for (const [x0, y0, bx, by, x1, y1, w0, w1] of stripes) {
        c.curve(x0, y0, bx, by, x1, y1, 'c', w0, w1);
        c.curve(40 - x0, y0, 40 - bx, by, 40 - x1, y1, 'c', w0, w1);
      }
      // The eyes, the pink nose and the mouth.
      const eye = ['..cccc', '.cyycy', 'cyycyy', '.wyyyw'];
      spriteFlip(c, eye, 13, 10);
      spriteFlip(c, eye, 22, 10, true);
      spriteFlip(c, ['.kkkkk.', 'kkkkkkk', '.kkkkk.', '...c...', '...c...', '.cc.cc.'], 17, 15);
      for (const [x, y] of [[15, 21], [16, 22], [25, 21], [24, 22], [14, 22], [26, 22]] as const) c.put(x, y, 'c');
      // Blades of grass in front, low in the middle so the face shows.
      for (let i = 0; i < 18; i++) {
        const x0 = i * 2.3 + hash(i, 0, 765) * 1.5;
        const mid = Math.abs(x0 - 20) < 7;
        const top = mid ? 25 + hash(i, 1, 765) * 3 : 17 + hash(i, 1, 765) * 7;
        const lean = (hash(i, 2, 765) - 0.5) * 6;
        c.curve(x0, 30, x0 + lean * 0.3, (30 + top) / 2, x0 + lean, top, 'gdyg'[i % 4] as string, 1.6, 0.6);
      }
    },
  },
  {
    title: 'Sunbird at red flowers',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1462, strength: 1.5 },
    draw: (c) => {
      // A soft green background with dark leaves and pale yellow spots of light.
      c.fill((x, y) => {
        const n = c.noise(x, y, 6, 1901);
        return n < 0.36 ? 'd' : n < 0.66 ? 'g' : 's';
      });
      for (let i = 0; i < 6; i++) oval(c, 2 + hash(i, 1, 1902) * 36, 2 + hash(i, 2, 1902) * 26, 1.6, 1.6, 0, 'y');
      c.curve(0, 24, 12, 20.5, 26, 23, 'n', 1.8, 1.3);
      outlined(c, 'c', () => {
        // An aloe spike: a brown stalk hung with red tubes that turn orange at their tips.
        c.curve(34, 29, 35, 20, 33, 6, 'n', 1.6, 1.2);
        for (let i = 0; i < 9; i++) {
          const y = 6 + i * 1.6;
          const sx = 33 + (y - 6) * 0.12;
          const side = i % 2 ? 1 : -1;
          const len = 2.2 + i * 0.15;
          c.curve(sx, y, sx + side * len * 0.7, y + 0.6, sx + side * len, y + 2.2, 'r', 1.2, 1);
          c.put(Math.round(sx + side * len), Math.round(y + 2.4), i < 3 ? 'y' : 'o');
        }
        // The sunbird, perched and facing the flowers: purple head, blue throat, red breast, yellow belly.
        c.curve(10, 18.5, 6, 21, 2, 23.5, 'b', 2.4, 1);
        oval(c, 15, 16, 7, 4.6, -0.45, (_u, v) => (v > 0.4 ? 'y' : 'd'));
        oval(c, 14.5, 14.8, 5.2, 2.5, -0.4, (_u, v) => (v < -0.35 ? 'g' : v > 0.5 ? 'e' : 'd'));
        oval(c, 21.5, 10, 3.4, 3.2, 0, 'p');
        oval(c, 22.2, 12.8, 2.2, 1.4, 0, 'b');
        oval(c, 20.8, 15, 2.4, 1.6, -0.45, 'r');
        c.curve(24.6, 10, 27.5, 10.4, 29.5, 12.8, 'c', 1.2, 1);
        c.line(14, 20, 14, 21, 'c');
        c.line(17, 20, 17, 21, 'c');
        c.put(22, 9, 'c');
        c.put(21, 9, 'w');
      });
    },
  },
  {
    title: 'Seahorse in seagrass',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1352, strength: 1.25 },
    draw: (c) => {
      c.bands(0, 29, 'ssbbb', 901, 1.5);
      c.speckle('w', 's', 0.03, 902);
      land(c, 25, 1.5, 'yn', 903, 2);
      c.speckle('e', 'yn', 0.12, 904);
      for (let i = 0; i < 16; i++) {
        const x = hash(i, 1, 905) * 40;
        const h = 10 + hash(i, 2, 905) * 16;
        c.curve(x, 30, x + (hash(i, 3, 905) - 0.5) * 6, 30 - h / 2, x + (hash(i, 4, 905) - 0.5) * 10, 30 - h, i % 2 ? 'd' : 'g', 1.8, 1);
      }
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(3 + hash(i, 6, 906) * 10);
        const y = Math.floor(3 + hash(i, 7, 906) * 10);
        c.put(x, y, 'p');
        c.put(x + 1, y, 'p');
        c.put(x + 2, y, 'k');
      }
      // The seahorse drawn round (23, 14) and grown by S.
      const S = 1.42;
      const X = (x: number): number => 23 + (x - 23) * S;
      const Y = (y: number): number => 14 + (y - 14) * S;
      outlined(c, 'c', () => {
        c.curve(X(24), Y(19), X(26), Y(25), X(21), Y(26), 'o', 3 * S, 1.5 * S);
        c.curve(X(21), Y(26), X(19), Y(23.5), X(22), Y(23), 'o', 1.5 * S, 1.2 * S);
        c.curve(X(24), Y(8), X(29), Y(13), X(24), Y(19), 'o', 4 * S, 4.5 * S);
        c.curve(X(22), Y(9), X(19.5), Y(14), X(22), Y(19), 'o', 3.5 * S, 3 * S);
        c.curve(X(28), Y(11), X(31), Y(13), X(28), Y(16), 'k', 2 * S, 1.5 * S);
        oval(c, X(22.5), Y(6), 3 * S, 2.5 * S, 0.2, 'o');
        c.curve(X(20), Y(6.5), X(17), Y(7), X(15), Y(7.5), 'o', 1.6 * S, 1.4 * S);
        c.put(Math.round(X(22)), Math.round(Y(3)), 'o');
        c.put(Math.round(X(24)), Math.round(Y(3)), 'o');
      });
      c.fill((x, y, now) => (now === 'o' && y > 5 && Math.floor(y + x * 0.4) % 3 === 0 ? 'y' : now === 'o' && hash(x, y, 907) < 0.12 ? 'n' : undefined));
      c.put(Math.round(X(22)), Math.round(Y(5)), 'w');
      c.put(Math.round(X(23)), Math.round(Y(5)), 'c');
      for (let i = 0; i < 5; i++) c.put(14 + (i % 2), 4 - i, 'w');
    },
  },
  { ...giraffe, deal: { sceneSeed: 6, buckets: 4, seed: 64111, strength: 2.75 } },
  {
    title: 'Comet over a desert arch',
    ...LARGE,
    deal: { sceneSeed: 2, buckets: 3, seed: 2378, strength: 1.75 },
    draw: (c) => {
      c.bands(0, 24, 'ccbp', 1201, 1.5);
      // The Milky Way: a hazy purple and blue band across the sky, from the left down to the right.
      c.fill((x, y, now) => {
        const d = Math.abs(y - 3 - x * 0.45 + (c.noise(x, y, 5, 1211) - 0.5) * 4);
        if (now !== 'c' || d > 3.2) return undefined;
        const n = c.noise(x, y, 2, 1212);
        return n > 0.62 ? 'p' : n > 0.38 || d < 1.2 ? 'b' : undefined;
      });
      c.speckle('w', 'cbp', 0.06, 1202);
      c.speckle('y', 'c', 0.02, 1203);
      c.fill((x, y) => {
        const dx = x + 0.5 - 9;
        const dy = y + 0.5 - 7;
        const along = dx * 0.9 - dy * 0.43;
        const across = Math.abs(dx * 0.43 + dy * 0.9);
        if (along < 0 || along > 25) return undefined;
        const n = (c.noise(x, y, 2.5, 1204) - 0.5) * 1.2;
        if (across < 0.45 + along * 0.05 + n * 0.5) return 'w';
        return across < 0.9 + along * 0.14 + n ? 's' : undefined;
      });
      oval(c, 9, 7, 3, 2.6, 0, 's');
      oval(c, 9, 7, 1.7, 1.5, 0, 'w');
      land(c, 24, 1.5, 'eec', 1205, 2);
      // The sandstone arch in strata, its right side and the inside of the opening in shadow.
      c.fill((x, y) => {
        if (y > 26) return undefined;
        const u = (x + 0.5 - 24) / 14;
        const v = (y + 0.5 - 29) / 18;
        const hu = (x + 0.5 - 24) / 6.5;
        const hv = (y + 0.5 - 28) / 10;
        const n = (c.noise(x, y, 2.2, 1207) - 0.5) * 0.3;
        if (u * u + v * v > 1 + n || hu * hu + hv * hv < 1 - n) return undefined;
        const layer = Math.floor((y + c.noise(x, y, 4, 1208) * 4) / 1.6) % 3;
        if (u > 0.3 + n || (hu * hu + hv * hv < 1.6 && u > 0)) return layer === 0 ? 'r' : 'n';
        if (u < -0.65 - n) return layer === 0 ? 'o' : 'y';
        return ['r', 'o', 'n'][layer];
      });
      land(c, 27, 0.8, 'ec', 1210, 2);
      c.speckle('n', 'e', 0.14, 1206);
      for (const [x, h] of [[4, 5], [36, 4]] as const) {
        c.line(x, 27, x, 27 - h, 'd');
        c.line(x - 1, 25 - h / 2, x - 1, 24 - h / 2, 'd');
        c.line(x + 1, 26 - h / 2, x + 1, 25 - h / 2, 'd');
      }
    },
  },
  {
    title: 'Clockwork robot dog',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1351, strength: 1.25 },
    draw: (c) => {
      // A blue and purple workshop wall over a wooden floor.
      c.fill((x, y) => {
        if (y >= 26 + Math.round((c.noise(x, y, 6, 2401) - 0.5) * 1.2)) return c.noise(x * 0.35, y * 2.2, 3, 2402) > 0.6 ? 'o' : 'n';
        return c.noise(x, y, 5, 2403) > 0.55 ? 'p' : 'b';
      });
      outlined(c, 'c', () => {
        // The tin dog: grey body and head, brass joints, a gear on its side, a wind-up key on its back.
        c.curve(10, 13, 7, 10, 6, 7, 'e', 1.4, 1);
        oval(c, 6, 6.2, 1.2, 1.2, 0, 'r');
        for (const x of [12, 16, 23, 27]) {
          c.rect(x, 18, x + 2, 25, 'e');
          oval(c, x + 1.5, 21.5, 1.3, 1.3, 0, 'y');
          c.rect(x - 1, 25, x + 3, 25, 'y');
        }
        oval(c, 19.5, 15, 10, 5.2, 0, (_u, v) => (v < -0.6 ? 'w' : 'e'));
        for (let x = 12; x <= 27; x += 3) c.put(x, 18, 'w');
        oval(c, 19.5, 15, 3, 3, 0, (u, v) => {
          const r = Math.hypot(u, v);
          if (r < 0.4) return 'y';
          if (r > 0.75) return Math.cos(8 * Math.atan2(v, u)) > 0 ? 'o' : undefined;
          return 'o';
        });
        c.rect(19, 7, 20, 10, 'y');
        oval(c, 19.5, 5.5, 3.2, 1.8, 0, (u, v) => (Math.hypot(u, v) < 0.45 ? 'b' : 'o'));
        c.rect(27, 10, 29, 14, 'y');
        oval(c, 31, 9.5, 4.6, 3.8, 0, (_u, v) => (v < -0.55 ? 'w' : 'e'));
        oval(c, 35, 11.5, 2.6, 1.7, 0, 'e');
        c.poly([28, 7, 30, 1.5, 32, 7], 'e');
        c.poly([29.3, 6, 30.2, 3.5, 31, 6], 'k');
        oval(c, 31.8, 8.8, 1.2, 1.2, 0, 'r');
        c.put(31, 8, 'y');
        c.put(37, 11, 'n');
        c.line(33, 13, 36, 13, 'n');
      });
    },
  },
  {
    title: 'Sushi platter from above',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 3, seed: 3352, strength: 1.25 },
    draw: (c) => {
      // A dark blue table, mottled sky-blue, under a wooden board.
      c.fill((x, y) => (c.noise(x, y, 4, 2801) > 0.62 ? 's' : 'b'));
      // A red lacquer cup at the corner of the table.
      oval(c, 38.5, 28.5, 3, 2.4, 0, 'r');
      outlined(c, 'c', () => {
        c.fill((x, y) => {
          const e = Math.min(x - 3, 36 - x, y - 3, 26 - y) + (c.noise(x, y, 3, 2802) - 0.5);
          if (e < 0) return undefined;
          return c.noise(x * 2.5, y * 0.4, 3, 2803) > 0.6 ? 'o' : 'n';
        });
        // Six rolls: green nori, white rice, a salmon, tuna or cucumber heart.
        for (let i = 0; i < 6; i++)
          oval(c, 8 + i * 4.8, 8.5, 2.3, 2.3, 0, (u, v) => {
            const r = Math.hypot(u, v);
            return r > 0.78 ? 'd' : r > 0.4 ? 'w' : 'org'[i % 3];
          });
        // Four nigiri: rice under a slice of salmon or tuna with pale stripes.
        for (let i = 0; i < 4; i++)
          oval(c, 9 + i * 7, 15.5, 3.2, 1.8, 0, (u, v, x) => (v > 0.55 ? 'w' : i % 2 ? 'r' : (x + Math.round(u * 2)) % 3 === 0 ? 'w' : 'o'));
        oval(c, 9, 21.5, 3, 2.4, 0, (u, v) => (Math.hypot(u, v) > 0.7 ? 'w' : 'c'));
        oval(c, 19, 21.5, 2.6, 1.8, 0, 'k');
        c.fill((x, y, now) => (now === 'k' && (x + y) % 3 === 0 ? 'w' : undefined));
        oval(c, 26.5, 21.5, 1.6, 1.3, 0, 'g');
        c.line(29, 23, 35, 19, 'y');
        c.line(30, 24, 36, 20, 'y');
      });
    },
  },
  { ...monkey, deal: { sceneSeed: 3, buckets: 3, seed: 3382, strength: 2 } },
  {
    title: 'Books and a candle',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 3, seed: 3372, strength: 1.75 },
    draw: (c) => {
      // A dark blue room, lit in rings of purple and pink round the flame; a wooden table below.
      c.fill((x, y) => {
        const d = Math.hypot((x + 0.5 - 20) / 1.3, y + 0.5 - 4) + (c.noise(x, y, 3, 1501) - 0.5) * 3;
        if (y >= 25 + Math.round((c.noise(x, y, 6, 1502) - 0.5) * 1.2)) return c.noise(x * 0.35, y * 2.2, 3, 1503) > 0.6 ? 'o' : 'n';
        return d < 7 ? 'k' : d < 12.5 ? 'p' : 'b';
      });
      c.speckle('s', 'b', 0.03, 1504);
      outlined(c, 'c', () => {
        // Three books lying in a stack, their page edges striped, their spines banded in gold.
        const book = (x0: number, x1: number, y0: number, y1: number, cover: string, band: string, spineLeft: boolean, salt: number): void =>
          c.fill((x, y) => {
            if (x < x0 || x > x1 || y < y0 || y > y1) return undefined;
            const spine = spineLeft ? x <= x0 + 1 : x >= x1 - 1;
            if (spine) return y > y0 && y < y1 && (y - y0) % 2 === 1 ? band : cover;
            if (y === y0 || y === y1 || x === (spineLeft ? x1 : x0)) return cover;
            return hash(x, y, salt) < 0.3 ? 'e' : 'w';
          });
        book(3, 36, 21, 24, 'r', 'y', true, 1505);
        book(6, 33, 17, 20, 'd', 'y', false, 1506);
        book(9, 30, 14, 16, 'o', 'n', true, 1507);
        c.rect(18, 7, 21, 13, 'w');
        c.rect(21, 8, 21, 13, 'e');
        c.put(18, 8, 'e');
        c.put(19, 6, 'n');
        oval(c, 19.5, 3.8, 1.7, 2.4, 0, 'o');
        oval(c, 19.5, 4.4, 0.9, 1.5, 0, 'y');
      });
    },
  },
  { ...crab, deal: { sceneSeed: 1, buckets: 3, seed: 1372, strength: 1.75 } },
  {
    title: 'Canal houses at dusk',
    ...LARGE,
    deal: { sceneSeed: 6, buckets: 3, seed: 63091, strength: 2.25 },
    draw: (c) => {
      c.bands(0, 13, 'bppk', 1101, 1.2);
      c.fill((_x, y) => (y >= 8 && y <= 21 ? 'c' : undefined));
      const houses = [[-1, 6, 'r', 4, 0.15], [5, 11, 'n', 2, -0.12], [11, 17, 'e', 5, 0.1], [17, 23, 'o', 1, -0.15], [23, 29, 'w', 3, 0.12], [29, 35, 'r', 6, -0.1], [35, 41, 'n', 3, 0.14]] as const;
      houses.forEach(([x0, x1, col, top, lean], i) =>
        c.fill((x, y) => {
          if (y > 21) return undefined;
          const sx = x - Math.round((21 - y) * lean);
          if (sx < x0 || sx >= x1) return undefined;
          const ct = (x0 + x1 - 1) / 2;
          if (y < top + 2 * Math.floor(Math.abs(sx - ct) / 1.5)) return undefined;
          const wy = y - top - 3;
          if (wy >= 0 && wy % 3 < 2 && (sx - x0) % 2 === 1) return hash(sx + i * 7, Math.floor(wy / 3), 1102) < 0.55 ? 'y' : 'c';
          return col;
        }),
      );
      c.fill((x, y) => (y === 22 ? (hash(x, y, 1103) < 0.25 ? 'c' : 'e') : undefined));
      for (let y = 23; y < 30; y++)
        for (let x = 0; x < 40; x++) {
          const from = c.at(Math.min(39, Math.max(0, x + Math.round(Math.sin(y * 1.7) * 1.2))), 44 - y) as string;
          c.put(x, y, hash(x, y, 1104) < 0.3 || from === 'e' ? 'b' : from);
        }
      c.fill((x, y) => (y >= 25 && y <= 26 && x >= 7 && x <= 16 - (y - 25) && x >= 7 + (y - 25) ? (y === 25 ? 'r' : 'n') : undefined));
    },
  },
  {
    title: 'Citrus slices',
    ...LARGE,
    deal: { sceneSeed: 2, buckets: 3, seed: 2383, strength: 2 },
    draw: (c) => {
      // A blue cloth with wavy sky-blue stripes and a few mint leaves.
      c.fill((x, y) => ((y + 1.5 * Math.sin(x / 5) + c.noise(x, y, 4, 2101)) % 5 < 1.2 ? 's' : 'b'));
      leaf(c, 3, 26, 3.5, 1.4, -0.6, 'd', 'g');
      leaf(c, 37, 3, 3.5, 1.4, 2.4, 'd', 'g');
      // A slice: rind, a white ring of pith, and segments split by white spokes, with a few seeds or juice dots.
      const slice = (cx: number, cy: number, r: number, rind: string, flesh: string, dot: string, turn: number, salt: number): void =>
        oval(c, cx, cy, r, r, 0, (u, v, x, y) => {
          const d = Math.hypot(u, v);
          if (d > 0.86) return rind;
          if (d > 0.72 || d < 0.16) return 'w';
          const seg = ((Math.atan2(v, u) + turn) / (2 * Math.PI)) * 9;
          if ((Math.abs(seg - Math.round(seg)) * d * r * 2 * Math.PI) / 9 < 0.65) return 'w';
          return hash(x, y, salt) < 0.07 ? dot : flesh;
        });
      outlined(c, 'c', () => {
        slice(19.5, 21, 7.5, 'o', 'k', 'r', 0.2, 2102);
        slice(33, 22, 5.6, 'd', 'g', 'y', 0.5, 2103);
        slice(28.5, 9.5, 7, 'y', 'y', 'o', 0.9, 2104);
        slice(11, 9.5, 7.5, 'o', 'o', 'y', 0, 2105);
      });
    },
  },
  { ...kingfisher, deal: { sceneSeed: 1, buckets: 4, seed: 1482, strength: 2 } },
  {
    title: 'Pagoda in autumn hills',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 4, seed: 34113, strength: 2.75 },
    draw: (c) => {
      c.bands(0, 17, 'sssw', 1001, 1.2);
      cloud(c, 34, 3, 9, 1002);
      c.poly([-2, 17, 9, 7, 12, 6, 15, 7, 28, 17], 'p');
      c.poly([6, 10, 9, 7, 12, 6, 15, 7, 18, 10, 15, 9, 12, 11, 9, 9], 'w');
      land(c, 15, 2.5, 'r', 1003);
      c.fill((x, y, now) => {
        if (now !== 'r') return undefined;
        const k = c.noise(x, y, 2.3, 1004);
        return k < 0.3 ? 'r' : k < 0.48 ? 'o' : k < 0.62 ? 'y' : k < 0.78 ? 'd' : 'n';
      });
      ribbon(c, 'w', 'roydn', 19, 1, 1005, 0.7);
      const cx = 27;
      c.fill((x, y) => (y >= 27 && Math.abs(x - cx) <= 8 + (y - 27) ? 'e' : undefined));
      for (let i = 0; i < 5; i++) {
        const w = 8 - i * 1.3;
        const roof = 24 - i * 4;
        for (let y = roof + 1; y <= roof + 2 + (i === 0 ? 1 : 0); y++)
          for (let x = Math.ceil(cx - w + 2); x <= Math.floor(cx + w - 2); x++) c.put(x, y, Math.abs(x - cx) === Math.floor(w - 2) || x === cx ? 'r' : y === roof + 2 && (x - cx) % 2 ? 'y' : 'w');
        for (let x = Math.ceil(cx - w); x <= Math.floor(cx + w); x++) {
          const t = Math.abs(x - cx) / w;
          const lift = t > 0.92 ? 2 : t > 0.7 ? 1 : 0;
          c.put(x, roof - lift, 'c');
          if (t < 0.9) c.put(x, roof - 1 - lift, 'c');
          if (t < 0.5) c.put(x, roof - 2, 'c');
          if (t < 0.8 && (x - cx + 20) % 3 === 1) c.put(x, roof + 1, 'c');
        }
      }
      for (let y = 1; y < 6; y++) c.put(cx, y, y % 2 ? 'y' : 'o');
    },
  },
  {
    title: 'Longship in a storm',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1351, strength: 1.25 },
    draw: (c) => {
      // A storm sky in grey and purple with a white bolt, and a dark sea of heaving waves.
      c.fill((x, y) => {
        const n = c.noise(x, y, 5, 2601);
        return n > 0.6 ? 'e' : n > 0.4 ? 'p' : 'b';
      });
      path(c, [[4, 0], [6, 3], [3, 6], [6, 9], [5, 12]], 'w');
      outlined(c, 'c', () => {
        // The ship: a curved brown hull of planks, a dragon prow and a curled stern, a striped sail, round shields.
        c.line(20, 1, 20, 17, 'n');
        c.fill((x, y) => {
          if (y < 3 || y > 14) return undefined;
          const bulge = Math.sin(((y - 3) / 11) * Math.PI) * 2;
          if (x < 13 - bulge || x > 27 + bulge) return undefined;
          return Math.floor((x - 13 + bulge) / 2.6) % 2 ? 'w' : 'r';
        });
        c.line(12, 3, 28, 3, 'n');
        c.curve(8, 17, 5, 15, 6, 11, 'n', 2.2, 1.4);
        oval(c, 6.8, 10.5, 1.4, 1.4, 0, 'n');
        c.curve(32, 17, 35, 14, 34, 8, 'n', 2.4, 1.8);
        oval(c, 35.5, 7.5, 2.4, 1.5, 0.3, 'g');
        c.put(36, 7, 'y');
        c.fill((x, y) => {
          if (y < 16 || y > 21) return undefined;
          const half = 13 - (y - 16) * 1.4;
          if (Math.abs(x + 0.5 - 20) > half) return undefined;
          return y === 19 ? 'o' : 'n';
        });
        for (let i = 0; i < 7; i++) oval(c, 10.5 + i * 3.2, 16.8, 1.3, 1.3, 0, (u, v) => (Math.hypot(u, v) < 0.4 ? 'n' : 'yrwy'[i % 4]));
      });
      // Waves in front of the hull: blue swells with sky-blue crests and white foam.
      c.fill((x, y) => {
        const top = 21 + Math.sin(x / 3.2) * 1.6 + (c.noise(x, y, 4, 2602) - 0.5) * 1.5;
        if (y < top) return undefined;
        if (y < top + 1) return hash(x, y, 2603) < 0.5 ? 'w' : 's';
        return c.noise(x, y, 3, 2604) > 0.65 ? 's' : 'b';
      });
    },
  },
  {
    title: 'Highland cow in heather',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1352, strength: 1.25 },
    draw: (c) => {
      c.fill(() => 's');
      cloud(c, 8, 4, 12, 601);
      cloud(c, 31, 3, 10, 602);
      land(c, 9, 2, 'gd', 603, 2, 8);
      land(c, 15, 1.5, 'p', 604);
      c.fill((x, y, now) => (now === 'p' ? (c.noise(x, y, 2.2, 605) > 0.7 ? 'k' : c.noise(x, y, 2.6, 606) > 0.78 ? 'd' : undefined) : undefined));
      const fur = (_u: number, _v: number, x: number, y: number): string => {
        const s = c.noise(x * 0.7 + y * 0.5, y * 1.3, 1.8, 607);
        return s < 0.4 ? 'n' : s > 0.64 ? 'y' : 'o';
      };
      outlined(c, 'c', () => {
        oval(c, 22, 25, 15, 7, 0, fur, 0.2, 608);
        c.curve(15, 11, 8, 11.5, 5, 5, 'w', 2.6, 1);
        c.curve(25, 11, 32, 11.5, 35, 5, 'w', 2.6, 1);
        oval(c, 12.5, 13, 2.6, 1.3, -0.2, 'o');
        oval(c, 27.5, 13, 2.6, 1.3, 0.2, 'o');
        oval(c, 20, 17, 6.5, 8, 0, fur, 0.2, 609);
      });
      c.put(5, 5, 'e');
      c.put(35, 5, 'e');
      for (let k = 0; k < 10; k++) {
        const x = 14.2 + k * 1.3;
        c.curve(x, 9, x + 1.4 * (k % 2 ? 1 : -1), 12, x + 0.6, 15.5, 'yon'[k % 3] as string, 1.2);
      }
      c.put(17, 15, 'c');
      c.put(23, 15, 'c');
      oval(c, 20, 22.5, 3.6, 2.6, 0, 'k');
      c.put(19, 23, 'c');
      c.put(21, 23, 'c');
    },
  },
  {
    title: 'Okapi in the rainforest',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1388, strength: 2 },
    draw: (c) => {
      // Rainforest leaves in two greens with sky-blue gaps, mossy ground.
      c.fill((x, y) => {
        if (y >= 25 + Math.round((c.noise(x, y, 6, 2701) - 0.5) * 1.5)) return hash(x, y, 2702) < 0.12 ? 'y' : 'g';
        const n = c.noise(x, y, 4, 2703);
        return n > 0.66 ? 's' : n > 0.4 ? 'g' : 'd';
      });
      for (let i = 0; i < 10; i++) leaf(c, hash(i, 1, 2704) * 40, hash(i, 2, 2704) * 22, 4, 1.6, hash(i, 3, 2704) * Math.PI, i % 2 ? 'd' : 'g', i % 2 ? 'g' : 'd');
      outlined(c, 'c', () => {
        // The okapi facing left: dark brown body, a striped rump and legs, a pale face and big ears.
        for (const x of [14, 17, 26, 29]) {
          c.rect(x, 17, x + 1, 25, 'w');
          for (let y = 17; y <= 21; y += 2) c.rect(x, y, x + 1, y, 'n');
        }
        c.curve(30, 12, 31.5, 15, 31, 19, 'n', 1.2, 1);
        oval(c, 22, 14, 9, 4.6, 0, (u, v) => (u > 0.45 && Math.floor((v + 1) * 4.5) % 2 === 1 ? 'w' : 'n'));
        c.curve(15, 13, 11.5, 10, 10, 6, 'n', 4, 3);
        oval(c, 8, 7.5, 3.4, 2.3, 0.45, (u) => (u < -0.2 ? 'w' : 'e'));
        oval(c, 9.5, 3.8, 1.4, 2.2, 0.4, 'n');
        oval(c, 12, 4.4, 1.3, 2, -0.3, 'n');
        c.put(8, 6, 'c');
        c.put(5, 9, 'n');
      });
    },
  },
  {
    title: 'Guitar on a rug',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 3, seed: 3351, strength: 1.25 },
    draw: (c) => {
      // Floorboards round a red rug: a blue and yellow border, a lattice of orange diamonds, white fringes.
      c.fill((x, y) => {
        const e = Math.min(x - 3, 36 - x, y - 2, 27 - y) + (c.noise(x, y, 3, 1602) - 0.5) * 1.2;
        if (e < 0) return c.noise(x * 2.5, y * 0.4, 3, 1601) > 0.6 ? 'o' : 'n';
        if (e < 1) return 'b';
        if (e < 2) return 'y';
        if (e < 3) return 'b';
        const sx = (x + (Math.floor(y / 6) % 2) * 4) % 8;
        const d = Math.abs(sx - 4) + Math.abs((y % 6) - 3);
        return d === 0 ? 'y' : d === 1 ? 'o' : 'r';
      });
      for (let y = 4; y < 26; y += 2) {
        if (c.at(3, y) !== 'n' && c.at(3, y) !== 'o') c.put(2, y, 'w');
        if (c.at(36, y) !== 'n' && c.at(36, y) !== 'o') c.put(37, y, 'w');
      }
      // The leaves of a house plant reaching in at the corner.
      leaf(c, 38, 1.5, 4.5, 1.6, 2.6, 'd', 'g');
      leaf(c, 37, 4, 3.5, 1.3, 2.2, 'g', 'd');
      const ang = Math.atan2(16, 22);
      outlined(c, 'c', () => {
        c.curve(15.5, 11.5, 11.5, 8.6, 7.5, 5.7, 'n', 2.2, 2);
        oval(c, 5.6, 4.3, 2.5, 1.5, ang, 'e');
        oval(c, 19.2, 14.2, 5, 4.5, ang, 'o');
        oval(c, 26.5, 19.5, 7, 6, ang, 'o');
        oval(c, 19.2, 14.2, 4, 3.5, ang, 'y');
        oval(c, 26.5, 19.5, 6, 5, ang, 'y');
        oval(c, 22, 16.3, 2.7, 2.7, 0, 'n');
        oval(c, 22, 16.3, 1.8, 1.8, 0, 'c');
        oval(c, 28.6, 21, 0.8, 2.4, ang, 'n');
      });
      for (let i = 1; i < 7; i++) c.put(Math.round(15.5 - (8 * i) / 7), Math.round(11.5 - (5.8 * i) / 7), 'e');
    },
  },
  {
    title: 'Manta ray over a reef',
    ...LARGE,
    deal: { sceneSeed: 2, buckets: 3, seed: 2373, strength: 1.75 },
    draw: (c) => {
      c.fill((x, y) => (hash(x, y, 801) < 0.1 ? 's' : 'b'));
      for (let i = 0; i < 46; i++) {
        const col = 'rokypgdy'[i % 8] as string;
        const shade = { r: 'n', o: 'r', k: 'p', y: 'o', p: 'n', g: 'd', d: 'n' }[col] as string;
        const x = hash(i, 1, 802) * 42 - 1;
        const y = hash(i, 2, 802) * 32 - 1;
        const r = 1.8 + hash(i, 3, 802) * 2.4;
        c.blob(x, y, r, r * 0.8, col, shade, undefined, 803 + i, 0.4);
      }
      c.speckle('w', 'rokp', 0.06, 804);
      for (let i = 0; i < 7; i++) {
        const x = Math.floor(hash(i, 4, 805) * 38);
        const y = Math.floor(hash(i, 5, 805) * 29);
        c.put(x, y, 'y');
        c.put(x + 1, y, 'y');
      }
      // The manta drawn round row 13 and stretched by S down the page.
      const S = 1.3;
      const P = (pts: number[]): number[] => pts.map((v, i) => (i % 2 ? 13 + (v - 13) * S : v));
      c.curve(20, 22, 21, 25, 24, 27, 'c', 1.2, 1);
      c.poly(P([20, 6, 26, 8.5, 32, 9.5, 38, 11.5, 31, 15, 24, 21, 20, 22.5, 16, 21, 9, 15, 2, 11.5, 8, 9.5, 14, 8.5]), 'c');
      c.poly(P([16, 7.5, 17.5, 3.5, 18.5, 7.5]), 'c');
      c.poly(P([21.5, 7.5, 22.5, 3.5, 24, 7.5]), 'c');
      // The white shoulder patches and a grey ridge down the back.
      c.poly(P([13, 11, 18, 10, 17, 13]), 'w');
      c.poly(P([27, 11, 22, 10, 23, 13]), 'w');
      c.line(20, 12, 20, 20, 'e');
      c.curve(9, 12.5, 15, 15, 18, 18, 'e', 1);
      c.curve(31, 12.5, 25, 15, 22, 18, 'e', 1);
    },
  },
  {
    title: 'Farm in tulip fields',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1351, strength: 1.25 },
    draw: (c) => {
      c.fill(() => 's');
      cloud(c, 5, 2, 7, 3201);
      cloud(c, 33, 1, 6, 3202);
      land(c, 13, 1, 'd', 3203, 2);
      // The farm: a red barn with a white door and trim, a grey silo with a white dome, a dark tree.
      outlined(c, 'c', () => {
        c.poly([11, 15, 25, 15, 25, 9, 18, 4.5, 11, 9], 'r');
        c.line(11, 9, 18, 4, 'w');
        c.line(18, 4, 25, 9, 'w');
        c.rect(16, 11, 19, 15, 'w');
        c.line(16, 11, 19, 15, 'r');
        c.rect(27, 5, 30, 15, 'e');
        oval(c, 28.5, 5, 2, 1.6, 0, 'w');
        oval(c, 7, 10, 3.2, 3.6, 0, 'd', 0.3, 3204);
        c.line(7, 13, 7, 15, 'n');
      });
      // Rows of tulips fanning out from the farm, green between them.
      c.fill((x, y) => {
        if (y < 16 + Math.round((c.noise(x, y, 6, 3205) - 0.5) * 1.2)) return undefined;
        const t = (x + 0.5 - 20) / (y - 11) + (c.noise(x, y, 3, 3206) - 0.5) * 0.15;
        const k = Math.floor(t * 4 + 100);
        const f = t * 4 + 100 - k;
        if (f < 0.2) return 'g';
        return 'rykpo'[k % 5];
      });
      c.speckle('d', 'rykpo', 0.05, 3207);
    },
  },
  { ...flamingo, deal: { sceneSeed: 6, buckets: 3, seed: 63101, strength: 2.5 } },
  {
    title: 'Sundae in a tall glass',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 3, seed: 3372, strength: 1.75 },
    draw: (c) => {
      // Pink and purple candy stripes behind a sky-blue counter.
      c.fill((x, y) => {
        if (y >= 26 + Math.round((c.noise(x, y, 6, 1802) - 0.5) * 1.2)) return hash(x, y, 1803) < 0.12 ? 'w' : 's';
        return 'kpkpkp'[Math.floor((x + y * 0.4 + c.noise(x, y, 4, 1801) * 3) / 2.2) % 6];
      });
      const half = (y: number): number => 4.2 + 3.6 * ((23 - y) / 14) ** 0.8;
      outlined(c, 'c', () => {
        // The tulip glass: grey walls, layers of chocolate, vanilla, strawberry and caramel with wavy tops.
        c.fill((x, y) => {
          if (y < 9 || y > 26) return undefined;
          const dx = Math.abs(x + 0.5 - 20);
          if (y >= 24) return dx < (y === 26 ? 4 : 1) ? 'e' : undefined;
          const w = half(y);
          if (dx > w) return undefined;
          if (dx > w - 1) return 'e';
          const lv = y + Math.sin(x * 1.3) * 0.8 + (c.noise(x, y, 2, 1804) - 0.5);
          if (lv > 20) return 'n';
          if (lv > 16.5) return 'w';
          if (lv > 13) return 'k';
          return lv > 11 ? 'n' : 'o';
        });
        // Whipped cream in three tiers, sprinkles, a wafer and a cherry on top.
        for (const [cy, rx, ry] of [[8.5, 7.8, 2.2], [6.4, 6, 1.9], [4.5, 4.2, 1.6]] as const) oval(c, 20, cy, rx, ry, 0, (_u, v) => (v > 0.55 ? 'e' : 'w'));
        c.speckle('r', 'w', 0.07, 1805);
        c.fill((x, y, now) => (now === 'w' && y < 10 && hash(x, y, 1806) < 0.06 ? 'b' : undefined));
        c.curve(26, 8, 27.5, 5.5, 28.5, 3, 'y', 1.6);
        oval(c, 20.5, 2.5, 1.4, 1.3, 0, 'r');
        c.line(21, 1, 22, 1, 'd');
      });
    },
  },
  { ...chameleon, deal: { sceneSeed: 3, buckets: 3, seed: 3363, strength: 1.5 } },
  {
    title: 'Campfire on a beach',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 4, seed: 34091, strength: 2.25 },
    draw: (c) => {
      // A night sky with purple clouds and stars, a moon, the sea with its moon path, grey moonlit sand.
      c.fill((x, y) => (c.noise(x, y, 5, 2201) > 0.52 ? 'p' : 'b'));
      c.speckle('w', 'b', 0.04, 2202);
      oval(c, 31.5, 4.5, 2.6, 2.6, 0, (_u, _v, x, y) => (hash(x, y, 2203) < 0.2 ? 'e' : 'w'));
      c.fill((x, y) => {
        if (y < 13) return undefined;
        if (y > 18 + Math.round(Math.sin(x / 3) + (c.noise(x, y, 3, 2204) - 0.5) * 2)) return hash(x, y, 2205) < 0.06 ? 'w' : 'e';
        if (Math.abs(x - 31.5) < 2.2 - (y - 13) * 0.15 && hash(x, y, 2206) < 0.6) return 'w';
        return (y + c.noise(x, y, 3, 2207) * 2) % 3 < 0.8 ? 'b' : 's';
      });
      c.curve(1, 27, 4.5, 25.5, 8, 27, 'n', 2);
      outlined(c, 'c', () => {
        // The fire: crossed logs, flames of red, orange and yellow, a ring of pale stones.
        c.curve(12, 26.5, 20, 24.5, 28, 22.5, 'n', 2);
        c.curve(12, 22.5, 20, 24.5, 28, 26.5, 'n', 2);
        c.curve(16.5, 19, 13.5, 12, 15.5, 7, 'r', 3, 1);
        c.curve(23.5, 19, 27, 13, 25, 8, 'r', 3, 1);
        oval(c, 20, 16, 5.2, 7.5, 0, 'r');
        oval(c, 20, 18, 3.8, 5.6, 0, 'o');
        oval(c, 20, 19.8, 2.4, 3.8, 0, 'y');
        oval(c, 20, 21.2, 1, 1.6, 0, 'w');
        for (let i = 0; i < 9; i++) {
          const a = (i / 8) * Math.PI;
          oval(c, 20 + Math.cos(a) * 9, 25.5 + Math.sin(a) * 2.4, 1.3, 0.9, 0, (_u, v) => (v > 0.3 ? 'e' : 'w'));
        }
      });
      for (let i = 0; i < 7; i++) c.put(Math.round(15 + hash(i, 1, 2208) * 10), Math.round(5 + hash(i, 2, 2208) * 5), i % 2 ? 'y' : 'o');
    },
  },
  { ...jellyfish, deal: { sceneSeed: 1, buckets: 4, seed: 1462, strength: 1.5 } },
  {
    title: 'Bicycle with flowers',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1332, strength: 0.75 },
    draw: (c) => {
      // A yellow plastered wall with a green-shuttered window, over a cobbled street.
      c.fill((x, y) => {
        if (y >= 25 + Math.round((c.noise(x, y, 5, 1702) - 0.5) * 1.2)) return (y % 2 === 0 && (x + (y % 4) * 2) % 5 === 0) || hash(x, y, 1703) < 0.08 ? 'n' : 'e';
        return c.noise(x, y, 3, 1701) > 0.72 ? 'o' : 'y';
      });
      c.fill((x, y) => {
        if (x < 2 || x > 15 || y < 2 || y > 13) return undefined;
        if (x < 5 || x > 12) return y % 2 ? 'd' : 'g';
        return x === 8 || x === 9 || y === 7 ? 'w' : 's';
      });
      // The wheels: charcoal tyres, grey rims and spokes, the wall showing between.
      for (const [cx, cy] of [[10, 20], [29, 20]] as const) {
        c.fill((x, y) => {
          const d = Math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5);
          return d > 5.7 ? undefined : d > 4.7 ? 'c' : d > 4.1 || d < 1.1 ? 'e' : undefined;
        });
        for (let i = 0; i < 8; i++) c.line(cx, cy, Math.round(cx + Math.cos((i * Math.PI) / 4 + 0.3) * 4), Math.round(cy + Math.sin((i * Math.PI) / 4 + 0.3) * 4), 'e');
      }
      c.curve(10, 20, 14.5, 20.5, 19, 21, 'b', 1.6);
      c.curve(10, 20, 13, 15.5, 16, 11, 'b', 1.4);
      c.curve(19, 21, 17.5, 16, 16, 11, 'b', 1.6);
      c.curve(16, 11, 21, 11.3, 26, 12, 'b', 1.6);
      c.curve(19, 21, 23, 17.5, 26.5, 14, 'b', 1.8);
      c.curve(26, 12, 28.5, 15, 29, 20, 'b', 1.4);
      c.curve(16, 10, 15.8, 9.5, 15.5, 9, 'e', 1);
      oval(c, 15, 8.3, 2.3, 1, 0, 'n');
      oval(c, 19.5, 21.5, 1.5, 1.5, 0, 'e');
      c.line(20, 22, 21, 24, 'c');
      outlined(c, 'c', () => {
        c.curve(26, 12, 25.5, 9.5, 23, 8.5, 'e', 1.2);
        c.fill((x, y) => (x < 26 || x > 34 || y < 8 || y > 12 ? undefined : y % 2 === 0 && x % 3 !== 0 ? 'o' : 'n'));
        oval(c, 30.5, 5.5, 5.5, 3, 0, 'd', 0.3, 1704);
        for (const [x, y, col, mid] of [[27, 6, 'r', 'y'], [30, 3.5, 'k', 'y'], [33.5, 5.5, 'w', 'y'], [29.5, 7, 'p', 'y'], [34, 2.8, 'r', 'y'], [31.5, 6.5, 'y', 'o'], [26.5, 3.5, 'w', 'y']] as const) {
          oval(c, x, y, 1.4, 1.3, 0, col);
          c.put(Math.floor(x), Math.floor(y), mid);
        }
      });
    },
  },
  {
    title: 'Mandarin duck on a pond',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1362, strength: 1.5 },
    draw: (c) => {
      // Still water mirroring an autumn bank: reflected leaves in wavering streaks across the blue.
      c.fill((x, y) => {
        const k = c.noise(x + Math.sin(y * 1.3) * 1.5, y * 3, 3, 705);
        const r = c.noise(x, y, 6, 706);
        if (r < 0.45) return hash(x, y, 707) < 0.08 ? 's' : 'b';
        return k < 0.4 ? 'r' : k < 0.68 ? 'y' : 'd';
      });
      ripples(c, 0, 29, 's', 'b', 30, 701);
      for (const [x, y, flower] of [[4, 25, true], [35, 4, false], [36, 26, false], [30, 28, true]] as const) {
        oval(c, x, y, 3.6, 2.1, 0.2, (u, v) => (Math.abs(v) < 0.25 && u > 0.2 ? 'b' : u < -0.4 && v < 0 ? 'd' : 'g'), 0.15, x);
        if (flower) {
          c.put(x - 1, y - 1, 'k');
          c.put(x + 1, y - 1, 'k');
          c.put(x, y - 2, 'k');
          c.put(x, y - 1, 'y');
        }
      }
      // The duck drawn round (19, 14) and grown by S.
      const S = 1.22;
      const X = (x: number): number => 19 + (x - 19) * S;
      const Y = (y: number): number => 14 + (y - 14) * S;
      const P = (pts: number[]): number[] => pts.map((v, i) => (i % 2 ? Y(v) : X(v)));
      outlined(c, 'c', () => {
        oval(c, X(21), Y(17), 9.5 * S, 4.5 * S, 0, (u, v) => {
          if (u > 0.82) return 'c';
          if (u < -0.5) return v < -0.5 ? 'n' : 'p';
          if (Math.abs(u + 0.42) < 0.07) return 'w';
          if (v < -0.35) return 'n';
          return 'o';
        });
        c.poly(P([21, 14, 25, 7, 27.5, 14]), 'o');
        c.poly(P([25, 14, 29, 8.5, 30.5, 14]), 'o');
        oval(c, X(14), Y(15), 3.6 * S, 3 * S, 0, 'o');
        c.poly(P([13, 8, 19, 10.5, 16, 13]), 'd');
        oval(c, X(12), Y(11), 4.5 * S, 4 * S, 0, (u, v, x, y) => {
          if (Math.abs(v - u * 0.35) < 0.24 && u > -0.35) return 'w';
          if (v < u * 0.35) return u < -0.2 ? 'r' : hash(x, y, 702) < 0.3 ? 'p' : 'd';
          return hash(x, y, 703) < 0.3 ? 'y' : 'o';
        });
        c.poly(P([8, 10.5, 4.5, 12, 8, 13]), 'r');
      });
      c.put(Math.round(X(5)), Math.round(Y(12)), 'w');
      c.put(Math.round(X(10)), Math.round(Y(10)), 'c');
      // The duck's broken reflection below the water line.
      for (let y = 23; y < 30; y++)
        for (let x = 6; x < 36; x++) {
          const from = c.at(x + Math.round(Math.sin(y * 1.9) * 1.2), 45 - y);
          if (from && 'pnwc'.includes(from) && hash(x, y, 704) > 0.35) c.put(x, y, from);
        }
    },
  },
  {
    title: 'Rainbow over a waterfall',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1351, strength: 1.25 },
    draw: (c) => {
      c.fill(() => 's');
      cloud(c, 6, 2, 7, 2001);
      cloud(c, 30, 1, 6, 2002);
      // Two cliffs of grey rock with dark cracks, wooded on top, the fall between them.
      c.fill((x, y) => {
        const n = (c.noise(x, y, 4, 2003) - 0.5) * 3;
        const left = 5 + x * 0.25 + n;
        const right = 5 + (39 - x) * 0.25 + n;
        const top = x < 14 ? left : x > 25 ? right : 99;
        if (y < top) return undefined;
        if (y < top + 2.2) return c.noise(x, y, 2, 2004) > 0.55 ? 'g' : 'd';
        return c.noise(x * 2, y * 0.6, 3, 2005) > 0.68 ? 'c' : 'e';
      });
      c.fill((x, y) => (x >= 14 && x <= 25 && y >= 7 && y < 23 ? (hash(x, Math.floor(y / 3 + hash(x, 0, 2006) * 3), 2007) < 0.3 ? 's' : 'w') : undefined));
      c.fill((x, y) => (y >= 23 + Math.round((c.noise(x, y, 4, 2008) - 0.5) * 1.5) ? (hash(x, y, 2009) < 0.1 ? 's' : 'b') : undefined));
      for (let i = 0; i < 7; i++) oval(c, 12 + i * 2.6, 22.5 + hash(i, 1, 2010) * 1.2, 2.4, 1.3, 0, 'w', 0.3, 2011);
      // The rainbow in the spray, from the left cliff to the right one.
      c.fill((x, y) => {
        if (y > 22) return undefined;
        const d = Math.hypot(x + 0.5 - 20, (y + 0.5 - 29) * 1.1);
        return d >= 10 && d < 18.4 ? 'rpbgyo'[5 - Math.floor((d - 10) / 1.4)] : undefined;
      });
    },
  },
  {
    title: 'Vintage typewriter',
    ...LARGE,
    deal: { sceneSeed: 6, buckets: 3, seed: 63092, strength: 2.25 },
    draw: (c) => {
      // A green papered wall with small yellow flowers over a desk whose grain runs in long broken streaks.
      c.fill((x, y) => {
        if (y < 17 + Math.round((c.noise(x, y, 6, 1401) - 0.5) * 1.5)) {
          if (y % 4 === 1 && (x + (y % 8 === 1 ? 0 : 3)) % 6 === 0) return 'y';
          return c.noise(x, y, 2.5, 1402) > 0.68 ? 'd' : 'g';
        }
        return c.noise(x * 0.35, y * 2.2, 3, 1403) > 0.6 ? 'o' : 'n';
      });
      outlined(c, 'c', () => {
        // The sheet in the roller, typed in broken grey lines.
        c.fill((x, y) => {
          if (x < 13 || x > 26 || y < 2 || y > 10) return undefined;
          return y % 2 === 1 && y < 9 && x > 13 && x < (y === 7 ? 21 : 26) && hash(x, y, 1404) < 0.75 ? 'e' : 'w';
        });
        c.rect(9, 10, 30, 11, 'e');
        oval(c, 7.5, 11, 1.7, 1.7, 0, 'y');
        oval(c, 32.5, 11, 1.7, 1.7, 0, 'y');
        c.line(33, 9, 35, 7, 'e');
        c.poly([6, 26, 33, 26, 30, 12, 9, 12], 'r');
        // The basket of type bars, a fan of grey and brown under the roller.
        oval(c, 19.5, 12.5, 5, 2.2, 0, (_u, v, x) => (v < 0 ? undefined : x % 2 ? 'e' : 'n'));
        c.poly([10, 24.5, 29, 24.5, 27.5, 15, 11.5, 15], 'c');
        [16, 18, 20].forEach((y, r) => {
          for (let x = 12; x <= 27; x++) if ((x + r) % 2 === 0 && c.at(x, y) === 'c' && c.at(x + 1, y) === 'c') c.put(x, y, r === 1 && x % 4 === 0 ? 'y' : 'w');
        });
        c.rect(15, 22, 24, 22, 'w');
        c.rect(17, 25, 22, 25, 'y');
      });
    },
  },
  { ...snake, deal: { sceneSeed: 5, buckets: 3, seed: 53111, strength: 2.75 } },
  {
    title: 'Tea glasses on a tray',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1354, strength: 1.25 },
    draw: (c) => {
      // A blue kilim with small yellow and orange crosses.
      c.fill((x, y) => {
        const sx = (x + (Math.floor(y / 5) % 2) * 3) % 6;
        const d = Math.abs(sx - 3) + Math.abs((y % 5) - 2);
        return d === 0 ? 'o' : d === 1 ? 'y' : c.noise(x, y, 5, 3101) > 0.65 ? 'p' : 'b';
      });
      outlined(c, 'c', () => {
        // A round silver tray, three tulip glasses of red tea on white saucers, sugar cubes.
        oval(c, 20, 21, 18, 7.5, 0, (u, v) => (Math.hypot(u, v) > 0.88 ? 'w' : 'e'));
        for (const [cx, base] of [[10, 22], [20, 25], [30, 22]] as const) {
          oval(c, cx, base, 4.4, 1.4, 0, (u, v) => (Math.hypot(u, v) > 0.7 ? 'r' : 'w'));
          c.fill((x, y) => {
            const top = base - 15;
            if (y < top || y > base - 1) return undefined;
            const t = (y - top) / 14;
            const w = 2.8 - Math.sin(t * Math.PI * 0.9) * 1.1 + (t > 0.7 ? (t - 0.7) * 3 : 0);
            const dx = Math.abs(x + 0.5 - cx);
            if (dx > w) return undefined;
            if (dx > w - 1 || y === top) return 'w';
            return y < top + 3 ? 'o' : 'r';
          });
        }
        for (const [x, y] of [[23, 15], [26, 16], [14, 17]] as const) c.rect(x, y, x + 1, y + 1, 'w');
      });
    },
  },
  { ...nest, deal: { sceneSeed: 1, buckets: 3, seed: 1371, strength: 1.75 } },
  {
    title: 'Satellite over Saturn',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 3, seed: 1341, strength: 1 },
    draw: (c) => {
      // Deep space in blue and purple haze with stars.
      c.fill((x, y) => {
        const n = c.noise(x, y, 6, 2501);
        return n > 0.55 ? 'p' : n < 0.3 ? 'k' : 'b';
      });
      c.speckle('w', 'bp', 0.04, 2502);
      c.speckle('y', 'b', 0.015, 2503);
      // Saturn: its rings tilted across a banded globe, the far half of the rings behind it.
      const ring = (front: boolean): void =>
        oval(c, 15, 19, 14, 4.2, -0.25, (u, v) => {
          const r = Math.hypot(u, v);
          if (r < 0.66 || (front ? v < 0 : v >= 0)) return undefined;
          return r > 0.9 ? 'w' : r > 0.82 ? 'c' : r > 0.74 ? 'e' : 'y';
        });
      outlined(c, 'c', () => {
        ring(false);
        oval(c, 15, 19, 8.5, 8, 0, (_u, v, x, y) => {
          const band = Math.floor((v + 1) * 4 + (c.noise(x, y, 3, 2504) - 0.5) * 0.8);
          return 'oynoyon'[Math.max(0, Math.min(6, band))];
        });
        ring(true);
      });
      outlined(c, 'c', () => {
        // The satellite: a gold body, two sky-blue panels in cells, a white dish.
        c.rect(23, 5, 27, 7, 's');
        c.rect(34, 5, 38, 7, 's');
        c.fill((x, y, now) => (now === 's' && y >= 5 && y <= 7 && x % 2 === 0 ? 'b' : undefined));
        c.line(28, 6, 33, 6, 'e');
        c.rect(29, 4, 32, 8, 'y');
        c.put(30, 5, 'o');
        c.put(31, 7, 'o');
        oval(c, 30.5, 10.5, 1.8, 1, 0, 'w');
        c.put(30, 9, 'e');
      });
    },
  },
  {
    title: 'Axolotl in a pond',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 3, seed: 33111, strength: 2.75 },
    draw: (c) => {
      // A pebble bed under clear water, seen from above: sand, brown and grey stones, pools of blue between.
      c.fill((x, y) => {
        const m = c.noise(x, y, 7, 402);
        if (m < 0.46) return hash(x, y, 403) < 0.1 ? 's' : 'b';
        const n = c.noise(x, y, 3, 401);
        return n > 0.62 ? 'e' : n < 0.36 ? 'y' : 'n';
      });
      for (let i = 0; i < 9; i++) {
        const corner = i % 2 === 0;
        const x = corner ? hash(i, 1, 404) * 9 : 31 + hash(i, 1, 404) * 9;
        const y = corner ? hash(i, 2, 404) * 9 : 21 + hash(i, 2, 404) * 9;
        leaf(c, x, y, 3.5, 1.3, hash(i, 3, 404) * Math.PI, i % 3 === 0 ? 'g' : 'd', i % 3 === 0 ? 'd' : undefined);
      }
      outlined(c, 'c', () => {
        c.curve(29, 19, 34, 22, 39, 27, 'k', 4, 1.2);
        c.curve(14, 13, 16, 8.5, 14, 6.5, 'k', 2, 1.4);
        c.curve(13, 18, 12, 21, 10, 23, 'k', 2, 1.4);
        c.curve(25, 15, 28, 11.5, 27, 9.5, 'k', 2, 1.4);
        c.curve(24, 20, 24, 24, 22, 26, 'k', 2, 1.4);
        oval(c, 20, 16.5, 11.5, 4.4, 0.3, (_u, _v, x, y) => (c.noise(x, y, 1.6, 405) > 0.66 ? 'p' : 'k'));
        oval(c, 9, 12, 5.4, 4.8, 0.3, 'k');
        for (const [a, b, d, e] of [[9, 8, 8, 4], [11, 9, 12, 5], [7, 9, 4, 6], [6, 15, 3, 18], [8, 16, 7, 20], [5, 13, 1, 13]] as const)
          c.curve(a, b, (a + d) / 2 + (b < 12 ? -1 : 1), (b + e) / 2, d, e, 'r', 1.6, 1);
      });
      c.put(8, 10, 'c');
      c.put(6, 13, 'c');
      c.put(8, 9, 'w');
      c.put(6, 12, 'w');
      for (let i = 0; i < 4; i++) c.put(Math.floor(28 + hash(i, 5, 406) * 10), Math.floor(1 + hash(i, 6, 406) * 8), 'o');
    },
  },
  {
    title: 'Red panda on a branch',
    ...LARGE,
    deal: { sceneSeed: 6, buckets: 3, seed: 63111, strength: 2.75 },
    draw: (c) => {
      // Misty sky between dark foliage at the top corners.
      c.fill((x, y) => (c.noise(x, y, 4, 3001) > 0.55 ? 'w' : 's'));
      oval(c, 2, 1, 12, 8, 0, 'd', 0.3, 3002);
      oval(c, 39, 3, 10, 9, 0, 'd', 0.3, 3003);
      oval(c, 2, 29, 9, 5, 0, 'd', 0.3, 3006);
      c.fill((x, y, now) => (now === 'd' && c.noise(x, y, 2, 3004) > 0.6 ? 'g' : undefined));
      c.curve(0, 22, 18, 19.5, 39, 23, 'e', 2.6, 2);
      c.fill((x, y, now) => (now === 'e' && c.at(x, y - 1) !== 'e' && hash(x, y, 3005) < 0.7 ? 'g' : undefined));
      outlined(c, 'c', () => {
        // The tail hangs in rust and brown rings below the branch.
        for (let i = 0; i < 9; i++) {
          const t = i / 8;
          const px = (1 - t) ** 2 * 24 + 2 * (1 - t) * t * 31 + t * t * 30;
          const py = (1 - t) ** 2 * 17 + 2 * (1 - t) * t * 20 + t * t * 28;
          oval(c, px, py, 2.4 - t * 0.5, 1.6, 0.2, i % 2 ? 'n' : 'o');
        }
        // The body: rust above, dark brown belly and legs, front paws over the branch.
        c.rect(13, 17, 14, 21, 'n');
        c.rect(20, 17, 21, 21, 'n');
        oval(c, 18.5, 14, 6.5, 5, 0, (u, v) => (v > 0.45 ? 'n' : u > 0.4 ? 'r' : 'o'));
        // The head: white ears and brows, white muzzle, dark eyes with red tear marks.
        oval(c, 10, 4.6, 1.8, 1.8, 0, (u, v) => (Math.hypot(u, v) < 0.5 ? 'n' : 'w'));
        oval(c, 17, 4.6, 1.8, 1.8, 0, (u, v) => (Math.hypot(u, v) < 0.5 ? 'n' : 'w'));
        oval(c, 13.5, 8.5, 5, 4, 0, 'o');
        oval(c, 13.5, 10.4, 2.4, 1.6, 0, 'w');
        oval(c, 11, 6.8, 1.2, 0.8, 0, 'w');
        oval(c, 16, 6.8, 1.2, 0.8, 0, 'w');
        c.put(11, 8, 'c');
        c.put(16, 8, 'c');
        c.put(11, 9, 'r');
        c.put(16, 9, 'r');
        c.put(13, 10, 'c');
      });
    },
  },
  {
    title: 'Lightning over a city',
    ...LARGE,
    deal: { sceneSeed: 1, buckets: 4, seed: 1431, strength: 0.75 },
    draw: (c) => {
      c.fill((x, y) => {
        const n = c.noise(x, y, 5, 1301) + (c.noise(x, y, 2, 1302) - 0.5) * 0.3;
        return n < 0.4 ? 'b' : n < 0.63 ? 'p' : 'e';
      });
      c.fill((x, y, now) => ('bpe'.includes(now) && (x * 2 + y) % 7 === 0 && hash(x, y, 1303) < 0.5 ? 's' : undefined));
      path(c, [[23, 2], [21, 4], [24, 7], [22, 11], [25, 14], [24, 17]], 'w');
      path(c, [[21, 4], [17, 7], [15, 10], [12, 11]], 'w');
      path(c, [[22, 11], [18, 13]], 'w');
      c.fill((x, y, now) => (now !== 'w' && y < 18 && ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dy]) => c.at(x + dx, y + dy) === 'w') ? 'k' : undefined));
      const towers = [[0, 4, 15], [4, 9, 19], [9, 13, 12], [13, 18, 17], [18, 21, 21], [21, 27, 16], [27, 31, 11], [31, 36, 18], [36, 40, 14]] as const;
      towers.forEach(([x0, x1, top], i) =>
        c.fill((x, y) => {
          if (x < x0 || x >= x1 || y > 24) return undefined;
          const step = y < top + 4 && (x === x0 || x === x1 - 1) && i % 2 ? 1 : 0;
          if (y < top || step) return undefined;
          if ((x - x0) % 2 === 1 && (y - top) % 2 === 1 && x < x1 - 1) {
            const h = hash(x, y, 1304 + i);
            return h < 0.35 ? 'y' : h < 0.5 ? 'o' : h < 0.55 ? 'w' : 'c';
          }
          return 'c';
        }),
      );
      c.put(29, 10, 'r');
      c.put(29, 9, 'c');
      // The river below mirrors the lit windows in broken streaks.
      for (let y = 25; y < 30; y++)
        for (let x = 0; x < 40; x++) {
          const from = c.at(x + Math.round(Math.sin(y * 2.1) * 1.1), 49 - y) as string;
          c.put(x, y, 'yow'.includes(from) && hash(x, y, 1305) > 0.3 ? from : hash(x, y, 1306) < 0.15 ? 's' : 'b');
        }
    },
  },
  {
    title: 'Combine in a wheat field',
    ...LARGE,
    deal: { sceneSeed: 3, buckets: 3, seed: 3361, strength: 1.5 },
    draw: (c) => {
      c.fill(() => 's');
      cloud(c, 4, 2, 8, 2301);
      cloud(c, 28, 3, 7, 2302);
      land(c, 11, 1, 'd', 2303, 2);
      // Uncut wheat to the right of the machine, stubble in brown streaks behind it.
      c.fill((x, y) => {
        if (y < 13 + Math.round((c.noise(x, y, 6, 2304) - 0.5) * 1.5)) return undefined;
        if (x < 20 + (c.noise(x, y, 3, 2305) - 0.5) * 3) return (y * 3 + x) % 7 < 2 ? 'n' : 'o';
        return hash(x, y, 2306) < 0.18 ? 'o' : 'y';
      });
      for (let i = 0; i < 5; i++) oval(c, 3 + i * 2.5, 19 - i * 0.8, 2.6, 1.8, 0, i % 2 ? 'w' : 'e', 0.3, 2307);
      outlined(c, 'c', () => {
        // The combine: green body and grain tank, sky-blue cab, the unloading pipe, the red reel at the front.
        c.curve(12, 11, 8, 8.5, 5, 8, 'g', 1.4);
        c.poly([9, 22, 28, 22, 28, 13, 20, 12.5, 10, 13.5], 'g');
        c.fill((_x, y, now) => (now === 'g' && y >= 20 ? 'd' : undefined));
        c.poly([11, 13.5, 19, 13, 18, 10, 12, 10.5], 'y');
        c.poly([20, 13, 27, 13, 26, 7, 21, 7], 'g');
        c.poly([21, 12, 26, 12, 25.5, 8, 21.5, 8], 's');
        c.put(23, 9, 'w');
        c.put(24, 10, 'w');
        c.poly([28, 21, 36, 22, 36, 18.5, 28, 18], 'y');
        oval(c, 31.5, 17.5, 3.6, 3.6, 0, (u, v) => (Math.abs(u) < 0.2 || Math.abs(v) < 0.2 || Math.hypot(u, v) > 0.75 ? 'r' : undefined));
        oval(c, 22, 22, 3.6, 3.6, 0, (u, v) => (Math.hypot(u, v) > 0.6 ? 'c' : Math.hypot(u, v) > 0.3 ? 'y' : 'e'));
        oval(c, 12, 23, 2.6, 2.6, 0, (u, v) => (Math.hypot(u, v) > 0.55 ? 'c' : 'y'));
      });
    },
  },
  {
    title: 'Snail on a toadstool',
    ...LARGE,
    deal: { sceneSeed: 2, buckets: 3, seed: 2363, strength: 1.5 },
    draw: (c) => {
      // A shady wood in dark and light green with patches of sun, mossy ground below.
      c.fill((x, y) => {
        if (y >= 27 + Math.round((c.noise(x, y, 6, 2901) - 0.5) * 1.5)) return hash(x, y, 2902) < 0.25 ? 'd' : 'g';
        const n = c.noise(x, y, 5, 2903);
        return n > 0.68 ? 'y' : n > 0.42 ? 'g' : 'd';
      });
      outlined(c, 'c', () => {
        // The toadstool: a red cap with white spots, pink gills, a white stem with a skirt.
        c.fill((x, y) => (x >= 16 && x <= 23 && y >= 18 && y <= 27 ? (x === 23 || (x === 22 && y % 2) ? 'e' : 'w') : undefined));
        c.rect(15, 20, 24, 20, 'e');
        oval(c, 19.5, 17.5, 14, 2, 0, (_u, v) => (v < 0 ? undefined : 'k'));
        oval(c, 19.5, 17.5, 14, 9.5, 0, (_u, v) => (v > 0 ? undefined : 'r'));
        for (let i = 0; i < 8; i++) {
          const a = Math.PI * (0.12 + (0.76 * i) / 7);
          oval(c, 19.5 - Math.cos(a) * 9.5, 17.5 - Math.sin(a) * 5 + (i % 2) * 1.5, 1.6, 1.1, 0, 'w');
        }
        // The snail on top: a grey body with stalked eyes, a shell in an orange and yellow spiral.
        oval(c, 19.5, 7.6, 7.5, 1.5, 0, 'e');
        c.line(12, 7, 11, 3, 'e');
        c.line(13, 7, 14, 3, 'e');
        c.put(11, 2, 'n');
        c.put(14, 2, 'n');
        oval(c, 22, 4.6, 4, 3.8, 0, (u, v) => {
          const r = Math.hypot(u, v);
          if (r > 0.85) return 'n';
          const turn = Math.atan2(v, u) / (2 * Math.PI);
          return Math.floor(r * 3 + turn + 1) % 2 ? 'o' : 'y';
        });
      });
    },
  },
  { ...bonsai, deal: { sceneSeed: 1, buckets: 3, seed: 1382, strength: 2 } },
];

/**
 * The rows of a scene, its scattered pixels placed by the seed. With `pad`, the scene goes on for that many
 * rows above and below (more sky, more ground), and the level's own rows sit unchanged in the middle.
 */
export function sceneRows(scene: Scene, seed: number, pad = 0): string[] {
  const c = new Canvas(seededRng(seed), pad, scene.width ?? SCENE_WIDTH, scene.height ?? SCENE_HEIGHT);
  scene.draw(c);
  return scene.mirror ? c.rows().map((r) => [...r].reverse().join('')) : c.rows();
}

/** The colours on the picture's border: the ways in when the level starts. */
export function edgeColours(rows: string[]): Set<string> {
  const edge = new Set<string>();
  rows.forEach((r, y) => [...r].forEach((ch, x) => (y === 0 || x === 0 || y === rows.length - 1 || x === r.length - 1) && edge.add(ch)));
  return edge;
}

/** How detailed a picture is: the share of neighbouring squares, across and down, that differ in colour. */
export function detail(rows: string[]): number {
  let pairs = 0;
  let differ = 0;
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (x + 1 < r.length) {
        pairs++;
        if (r[x + 1] !== ch) differ++;
      }
      const below = rows[y + 1];
      if (below) {
        pairs++;
        if (below[x] !== ch) differ++;
      }
    }),
  );
  return differ / pairs;
}
