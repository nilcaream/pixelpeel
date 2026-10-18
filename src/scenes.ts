// The pictures of the first levels: whole scenes drawn in code, in pool letters, the way pixel-art
// pictures are built. A scene fills its rectangle (sky and grass are colours to peel too), gives each
// area two tones dithered together, and nests small things in big ones: spots in a cap, apples in a
// crown, flowers in grass, stars in the night. The detail is what makes a picture hard: dithered tones
// and single scattered pixels make colours interleave, so no pot reaches all of its colour at once.
// A scene's seed only moves its scattered pixels.

import { seededRng, type Rng } from './rng.ts';

export const SCENE_WIDTH = 32;
export const SCENE_HEIGHT = 24;

export class Canvas {
  readonly g: string[][];
  readonly rng: Rng;
  /** Rows of the same scene drawn above and below the picture's 24, for a square icon; 0 for a level. */
  readonly pad: number;
  constructor(rng: Rng, pad = 0) {
    this.rng = rng;
    this.pad = pad;
    this.g = Array.from({ length: SCENE_HEIGHT + 2 * pad }, () => Array.from({ length: SCENE_WIDTH }, () => 's'));
  }

  at(x: number, y: number): string | undefined {
    return this.g[y + this.pad]?.[x];
  }

  put(x: number, y: number, c: string): void {
    const row = this.g[y + this.pad];
    if (row && x >= 0 && x < SCENE_WIDTH) row[x] = c;
  }

  rect(x0: number, y0: number, x1: number, y1: number, c: string): void {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) this.put(x, y, c);
  }

  /** An ellipse; its lower right is in `shade`, dithered at the edge, and its upper left in `light`. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: string, shade?: string, light?: string): void {
    for (let y = -this.pad; y < SCENE_HEIGHT + this.pad; y++)
      for (let x = 0; x < SCENE_WIDTH; x++) {
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
    for (let x = 0; x < SCENE_WIDTH; x++) {
      const h = top + Math.round(wave * Math.sin(x / 4));
      for (let y = h; y < SCENE_HEIGHT + this.pad; y++) {
        const d = y - h;
        this.put(x, y, d > 3 || (d > 1 && (x + y) % 2 === 0) ? deep : light);
      }
    }
  }

  /** `n` single pixels in colours from `cs`, on squares of a colour in `on`, between rows y0 and y1. */
  scatter(cs: string, n: number, y0: number, y1: number, on: string): void {
    for (let i = 0; i < n; i++)
      for (let tries = 0; tries < 50; tries++) {
        const x = Math.floor(this.rng() * SCENE_WIDTH);
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

  rows(): string[] {
    return this.g.map((r) => r.join(''));
  }
}

export interface Scene {
  title: string;
  draw: (c: Canvas) => void;
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
];

/**
 * The rows of a scene, its scattered pixels placed by the seed. With `pad`, the scene goes on for that many
 * rows above and below (more sky, more ground), and the level's own rows sit unchanged in the middle.
 */
export function sceneRows(scene: Scene, seed: number, pad = 0): string[] {
  const c = new Canvas(seededRng(seed), pad);
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
