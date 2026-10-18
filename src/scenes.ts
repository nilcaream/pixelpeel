// The pictures of the first levels: whole scenes drawn in code, in pool letters, the way pixel-art
// pictures are built. A scene fills its rectangle (sky and grass are colours to peel too), gives each
// area two tones dithered together, and nests small things in big ones: spots in a cap, apples in a
// crown, flowers in grass, stars in the night. The detail is what makes a picture hard: dithered tones
// and single scattered pixels make colours interleave, so no pot reaches all of its colour at once.
// A scene's seed only moves its scattered pixels.

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
];

/**
 * The rows of a scene, its scattered pixels placed by the seed. With `pad`, the scene goes on for that many
 * rows above and below (more sky, more ground), and the level's own rows sit unchanged in the middle.
 */
export function sceneRows(scene: Scene, seed: number, pad = 0): string[] {
  const c = new Canvas(seededRng(seed), pad, scene.width ?? SCENE_WIDTH, scene.height ?? SCENE_HEIGHT);
  scene.draw(c);
  return c.rows();
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
