// Pictures that are not levels yet: drawn first, as a portfolio, and turned into levels later, when each
// gets its pots, its band and its place in the order. Every picture is one subject in its setting, drawn
// with the noise helpers of the Canvas, so its horizons wander and its tones meet in broken edges.

import { type Canvas, LARGE, type Scene, hash } from './scenes.ts';

/** Ground below a skyline that wanders by up to `amp` rows round `base`, in bands of `colours` by depth. */
function land(c: Canvas, base: number, amp: number, colours: string, salt: number, depth = 4, scale = 9): void {
  c.fill((x, y) => {
    const top = base + (c.noise(x, 0, scale, salt) - 0.5) * 2 * amp + (c.noise(x, 0, 2.5, salt + 3) - 0.5) * 1.6;
    if (y < top) return undefined;
    const d = (y - top + c.wobble(x, y, salt + 1)) / depth + (c.noise(x, y, 4, salt + 1) - 0.5) * 1.2;
    return colours[Math.min(colours.length - 1, Math.max(0, Math.floor(d)))];
  });
}

/** A cloud: a few overlapping puffs, white, with a `shade` underside. */
function cloud(c: Canvas, x: number, y: number, w: number, salt: number, shade = 'e'): void {
  c.blob(x, y + 0.6, w / 2, w / 6 + 0.6, shade, undefined, undefined, salt, 0.3);
  c.blob(x - w / 5, y, w / 4, w / 6 + 0.4, 'w', undefined, undefined, salt + 1, 0.3);
  c.blob(x + w / 6, y - 0.6, w / 4, w / 5 + 0.4, 'w', undefined, undefined, salt + 2, 0.3);
}

/** Short ripples on water: little arcs in `c` on `on`, at fixed irregular places. */
function ripples(c: Canvas, y0: number, y1: number, col: string, on: string, n: number, salt: number): void {
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
function streaks(c: Canvas, col: string, on: string, y0: number, y1: number, gap: number, salt: number, thick = 1, dash = 0.35): void {
  c.fill((x, y, now) => {
    if (y < y0 || y > y1 || !on.includes(now)) return undefined;
    const p = y + (c.noise(x, 0, 6, salt) - 0.5) * 4 + Math.sin(x / 3.5 + salt) * 1.1;
    const band = Math.floor(p / gap);
    return p - band * gap < thick && c.noise(x, band * 7, 3.5, salt + 2) > dash ? col : undefined;
  });
}

/** A ribbon of `col` one to two squares wide over the squares of `on`, waving across the whole width round row `base`. */
function ribbon(c: Canvas, col: string, on: string, base: number, amp: number, salt: number, width = 0.9): void {
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
function rim(c: Canvas, of: string, against: string, col: string, x0: number, y0: number, x1: number, y1: number): void {
  const marks: [number, number][] = [];
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (of.includes(c.at(x, y) as string) && ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).some(([dx, dy]) => against.includes(c.at(x + dx, y + dy) ?? '-')))
        marks.push([x, y]);
  for (const [x, y] of marks) c.put(x, y, col);
}

export const PORTFOLIO: readonly Scene[] = [
  {
    title: 'Hedgehog with an apple',
    ...LARGE,
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
    title: 'Cherry blossom tree',
    ...LARGE,
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
    title: 'Whale in the deep sea',
    ...LARGE,
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
    title: 'Penguin on an ice floe',
    ...LARGE,
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
    title: 'Frog on a lily pad',
    ...LARGE,
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
    title: 'Swan on a lake',
    ...LARGE,
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
    title: 'Jellyfish in the deep',
    ...LARGE,
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
    title: 'Giraffe at sunset',
    ...LARGE,
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
    title: 'Squirrel with an acorn',
    ...LARGE,
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
    title: 'Flamingo in the shallows',
    ...LARGE,
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
      c.put(19, 6, 'c');
      c.put(19, 7, 'c');
      c.put(15, 1, 'c');
      c.scatter('w', 4, 0, 14, 'bs');
    },
  },
  {
    title: 'Sea turtle',
    ...LARGE,
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
    title: 'Volcano island',
    ...LARGE,
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
    title: 'Strawberry',
    ...LARGE,
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
    title: 'Sleeping cat',
    ...LARGE,
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
    title: 'Chameleon on a branch',
    ...LARGE,
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
    title: 'Treehouse in an oak',
    ...LARGE,
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
    title: 'Goldfish in a bowl',
    ...LARGE,
    draw: (c) => {
      // A purple wall papered in wavy pink streaks, a table with a two-tone cloth.
      c.bands(0, 29, 'p', 340);
      streaks(c, 'k', 'p', 0, 25, 4, 341, 1, 0.45);
      land(c, 25, 1, 'nc', 343, 2, 9);
      // The bowl fills the height: glass, the water inside, a rim on top.
      c.blob(20, 15, 15, 14.6, 'w', undefined, undefined, 345, 0);
      c.blob(20, 15.5, 14, 13.6, 's', 'b', undefined, 346, 0.05);
      c.fill((_x, y, now) => (y < 4 && 'sb'.includes(now) ? 'p' : undefined));
      c.fill((x, y) => (y === 3 &&Math.abs(x - 20) < 10 ? 'w' : undefined));
      c.curve(9, 9, 7, 15, 9, 22, 'w');
      c.put(10, 7, 'w');
      // Pebbles and weeds on the bottom.
      c.fill((x, y, now) => (y > 23 && 'sb'.includes(now) && y > 25 - c.noise(x, 0, 2, 347) * 2 ? ['y', 'r', 'o', 'w'][Math.floor(hash(x, y, 348) * 4)] : undefined));
      c.curve(11, 26, 9, 19, 12, 12, 'd', 1.8, 1);
      c.curve(13, 26, 15, 20, 13, 15, 'g', 1.8, 1);
      c.curve(30, 26, 32, 20, 29, 16, 'd', 1.6, 1);
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
    title: 'Bonsai tree',
    ...LARGE,
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
    title: 'Wolf under northern lights',
    ...LARGE,
    draw: (c) => {
      // Night sky crossed by ribbons of the northern lights, and a full moon behind the muzzle.
      c.bands(0, 29, 'b', 380);
      ribbon(c, 'g', 'b', 5, 2.5, 381);
      ribbon(c, 's', 'b', 10, 3, 384);
      ribbon(c, 'g', 'b', 15, 2.5, 387);
      ribbon(c, 's', 'b', 20, 2, 393);
      c.scatter('w', 10, 0, 20, 'b');
      c.blob(33, 6, 5, 4.6, 'y', undefined, 'w', 389, 0);
      // Snowy ground, and a rock under the wolf.
      land(c, 24, 1.5, 'w', 390, 3, 7);
      c.blob(27, 27, 11, 3.5, 'n', 'c', undefined, 384, 0.3);
      // The wolf sits on the rock in profile and howls at the sky, facing left: the snout points up and to
      // the left, the jaw a little open, the ear pricked behind; then the back down to the haunch and the tail,
      // and the front legs straight under the chest. A grey wolf with a dark saddle, so the head stands
      // out light against the night.
      c.curve(33, 27, 38, 28, 39, 22, 'c', 3.6, 2);
      c.poly([14, 13, 12.5, 15.5, 12.5, 19, 14.5, 22.5, 15.5, 29.5, 18, 29.5, 18.5, 25, 19.5, 25, 20, 29.5, 36, 29.5, 36, 24, 34, 19.5, 29.5, 15.5, 26, 13.5, 23, 11], 'e');
      c.poly([22, 12, 26, 13.5, 29.5, 15.5, 34, 19.5, 36, 24, 36, 29.5, 31, 29.5, 29.5, 23, 26.5, 18, 23, 15], 'c');
      c.fill((x, y, now) => (now === 'e' && x > 20 && y > 12 && c.noise(x, y, 2.2, 391) > 0.68 ? 'c' : undefined));
      // The moon lights the saddle's edge; the ruff of the throat is white.
      rim(c, 'c', 'bgsy', 'e', 23, 10, 35, 22);
      c.curve(14.5, 14, 13.5, 17, 15, 20.5, 'w', 1.6, 1.2);
      // The head, drawn square by square: the snout up to the left with a dark nose and the jaw a little
      // open, a dip at the brow, the eye shut to howl, and the ear pricked behind, dark inside.
      const head = [
        '.............e...',
        'cee.........eee..',
        'ceeee......eecee.',
        '.eeeeee...eeecee.',
        '..eeeeeeecceeeee.',
        '...eeeeeeeeeeeee.',
        '...ee..eeeeeeeeee',
        '....eeeeeeeeeeeee',
        '......eeeeeeeeeee',
        '........eeeeeeeee',
        '.........eeeeeeee',
        '.........eeeeeeee',
        '........eeeeeeeee',
      ];
      head.forEach((row, y) => [...row].forEach((k, x) => k !== '.' && c.put(6 + x, 1 + y, k)));
      c.put(17, 29, 'w');
      c.put(22, 29, 'w');
      c.scatter('e', 8, 25, 29, 'w');
    },
  },
];
