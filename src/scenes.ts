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
}

/** The size of the scenes from level 21 on: more squares for shading, texture and detail, still legible on a phone. */
export const LARGE = { width: 40, height: 30 } as const;

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
