// Pictures that are not levels yet: drawn first, as a portfolio, and turned into levels later, when each
// gets its pots, its band and its place in the order. Every picture is one subject in its setting, drawn
// with the noise helpers of the Canvas, so its horizons wander and its tones meet in broken edges.

import {
  type Canvas,
  LARGE,
  type Scene,
  frac,
  hash,
  land,
  leaf,
  outlined,
  ribbon,
  rim,
  ripples,
  sprite,
  spriteFlip,
  starCross,
  streaks,
} from './scenes.ts';

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

export const PORTFOLIO: readonly Scene[] = [
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
  {
    title: 'Parrots in the rain',
    ...LARGE,
    draw: (c: Canvas) => {
      // A grey wet sky over the canopy, charcoal gloom, dark green below.
      c.bands(0, 29, 'ecd', 620, 2.5, 8);
      // Big drooping leaves, each with a dark midrib.
      for (const [x0, y0, bx, by, x1, y1, w, col, rib] of [
        [-2, 2, 5, 0, 10, 6, 4.5, 'g', 'd'],
        [41, 4, 34, 1, 29, 7, 4.5, 'd', 'g'],
        [-1, 18, 4, 13, 9, 15, 4, 'd', 'g'],
        [40, 15, 36, 11, 31, 13, 4, 'g', 'd'],
        [0, 29, 6, 24, 11, 27, 4, 'g', 'd'],
        [39, 29, 33, 25, 29, 28, 4, 'd', 'g'],
      ] as const) {
        c.curve(x0, y0, bx, by, x1, y1, col, w, 0.8);
        c.curve(x0, y0, bx, by, x1, y1, rib, 0.8);
      }
      // Rain: slanting broken lines of sky blue and white.
      c.fill((x, y, now) => {
        const p = x - y * 0.33 + (c.noise(x, y, 6, 621) - 0.5) * 1.5;
        const lane = Math.floor(p / 3.5);
        if (p - lane * 3.5 >= 1.4 || c.noise(lane * 5, y, 2.5, 622) < 0.45) return undefined;
        return 'ec'.includes(now) ? 's' : 'dg'.includes(now) ? 'w' : undefined;
      });
      // The branch they sit on, wet and dark underneath.
      c.curve(-1, 23, 20, 20, 41, 24, 'n', 2.6, 2.2);
      c.curve(-1, 24.4, 20, 21.6, 41, 25.4, 'c', 1);
      // The scarlet macaw at the left: red, a folded blue wing with a yellow and green shoulder, a long tail.
      c.curve(13, 19, 12, 25, 10, 30, 'r', 2.8, 1.4);
      c.curve(15, 19, 16, 25, 14, 30, 'b', 2, 1);
      c.blob(12.5, 14.5, 4.6, 6.5, 'r', 'n', undefined, 623, 0.1);
      c.blob(15, 16.5, 3, 5.5, 'b', 'p', undefined, 624, 0.1);
      c.curve(12.5, 12, 15, 11.5, 17, 13.5, 'y', 1.6);
      c.curve(13, 13.6, 15.5, 13.4, 17.4, 15, 'g', 1.2);
      // The blue-and-yellow macaw at the right: a blue back and wing, a yellow breast.
      c.curve(27, 19, 28, 25, 30, 30, 'b', 2.8, 1.4);
      c.blob(27.5, 14.5, 4.6, 6.5, 'y', 'o', undefined, 625, 0.1);
      c.blob(30.5, 15.5, 2.4, 5.6, 'b', 'p', undefined, 626, 0.1);
      for (const [x, y] of [[11, 21], [14, 21], [26, 21], [29, 21]] as const) c.put(x, y, 'c');
      // The heads, drawn square by square, beaks nearly touching.
      sprite(c, 6, 3, [
        '....rrrrr....',
        '.rrrrrrrrrr..',
        'rrrrrrrwwww..',
        'rrrrrrwwcwwe.',
        'rrrrrrwwwweee',
        'rrrrrrrwwweee',
        '.rrrrrrrrcce.',
        '..rrrrrrr.c..',
      ]);
      sprite(c, 21, 3, [
        '....ggbbb....',
        '..ggbbbbbbbb.',
        '..wwwwbbbbbbb',
        '.cwcwwbbbbbbb',
        'cccwwwbbbbbbb',
        'cccwcwbbbbbbb',
        '.ccc.cbbbbbb.',
        '..c..cbbbbb..',
      ]);
      // Raindrops beaded on their backs.
      for (const [x, y] of [[10, 4], [12, 9], [30, 6], [28, 10], [16, 17]] as const) c.put(x, y, 's');
    },
  },
  {
    title: 'Rabbit in the snow at dusk',
    ...LARGE,
    draw: (c: Canvas) => {
      // Dusk: blue overhead, purple, pink, orange low down; the sun just setting at the left.
      c.bands(0, 19, 'bpko', 680, 2, 8);
      c.speckle('w', 'b', 0.03, 699);
      c.blob(3, 18.5, 2.6, 1.8, 'y', undefined, 'w', 681, 0);
      // A dark line of pines along the far edge of the field, a little snow on their boughs.
      c.fill((x, y) => {
        for (const [tx, top, s] of [[2, 8, 0], [10, 11, 1], [35, 9, 4], [39, 12, 5]] as const) {
          const hw = (y - top) * 0.4 + (c.noise(x, y, 1.5, 682 + s) - 0.5) * 0.9;
          if (y >= top && Math.abs(x + 0.5 - tx) < hw) return 'd';
        }
        return y > 16.5 + c.noise(x, 0, 4, 688) * 2 ? 'd' : undefined;
      });
      c.fill((x, y, now) => (now === 'd' && x > 0 && c.noise(x, y, 2, 689) > 0.64 ? 'c' : undefined));
      streaks(c, 'w', 'd', 8, 19, 3, 690, 1, 0.6);
      // The snow, pink where the sky lights it, blue in its hollows and in the rabbit's shadow.
      land(c, 20, 1.2, 'kw', 691, 3, 8);
      c.fill((x, y, now) => ('kw'.includes(now) && y > 21 && c.noise(x, y, 3, 692) > 0.64 ? 's' : undefined));
      c.blob(22, 28.2, 12, 1.8, 's', undefined, undefined, 693, 0.2);
      // Footprints in front of the rabbit.
      for (const [x, y] of [[33, 26], [35, 25], [36, 27], [38, 26]] as const) c.putOn(x, y, 'e', 'kws');
      // The rabbit, sitting in profile and facing right, brown with a charcoal belly and a white tail;
      // the low sun behind it rims its back and the back of its ears in orange.
      c.blob(16.5, 21.3, 11, 7.8, 'n', undefined, undefined, 694, 0.08);
      c.blob(23.5, 16, 4.8, 4.8, 'n', undefined, undefined, 695, 0.08);
      c.blob(28.5, 12.5, 6, 4.8, 'n', undefined, undefined, 696, 0.06);
      c.curve(25.5, 9, 23, 5, 21, 1.4, 'n', 3.4, 2.4);
      c.curve(28.5, 9, 29, 5, 28, 1.4, 'n', 3.2, 2.2);
      c.curve(28.7, 8, 29, 5, 28.1, 2.4, 'k', 1);
      c.blob(28.5, 27, 3.8, 1.6, 'n', undefined, undefined, 697, 0.1);
      c.fill((x, y, now) => (now === 'n' && y > 26 + (c.noise(x, y, 2.5, 700) - 0.5) * 2 && x > 10 && x < 31 ? 'c' : undefined));
      // The hind leg's thigh, the long hind foot, the front leg, and the line of the jaw, in charcoal.
      c.curve(9, 25, 10, 16, 19, 20, 'c', 1);
      c.curve(7, 27.8, 13, 28.4, 20, 27.8, 'n', 1.6);
      c.curve(24, 18.5, 24.5, 24, 26, 27, 'c', 1);
      c.curve(24.5, 16.4, 27.5, 18, 32, 16, 'c', 1);
      // A charcoal outline on the shaded front and underside, the orange rim on the lit back.
      rim(c, 'n', 'bpkydwse', 'c', 27, 0, 39, 29);
      rim(c, 'n', 'bpkydwse', 'c', 0, 22, 26, 29);
      rim(c, 'n', 'bpkoy', 'o', 0, 0, 26, 21);
      c.blob(6.5, 19.5, 2, 2, 'w', 'e', undefined, 698, 0);
      sprite(c, 30, 10, ['.cc', 'cwc', 'cc.']);
      c.put(34, 12, 'k');
      c.put(33, 14, 'w');
      c.put(32, 14, 'w');
    },
  },
  {
    title: 'Tiger in tall grass',
    ...LARGE,
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
    title: 'Panda eating bamboo',
    ...LARGE,
    draw: (c: Canvas) => {
      // A misty bamboo grove: pale sky and mist, stalks with dark nodes, sprays of leaves, a mossy floor.
      c.fill((x, y) => (c.noise(x, y, 6, 800) > 0.5 && (x < 10 || x > 30) ? 'w' : 's'));
      for (const [sx, salt] of [[1.5, 810], [5.5, 811], [9, 814], [31.5, 815], [34.5, 812], [38.5, 813]] as const) {
        c.fill((x, y) => {
          const w = sx + (c.noise(0, y, 8, salt) - 0.5) * 2;
          if (Math.abs(x + 0.5 - w) > 1.1) return undefined;
          return (y + Math.floor(hash(sx, 0, salt) * 5)) % 6 === 0 ? 'd' : x + 0.5 < w ? 'y' : 'g';
        });
      }
      for (const [x, y, a, col] of [[4, 3, 0.4, 'd'], [8, 9, 2.6, 'g'], [3, 15, 0.2, 'd'], [35, 4, 2.7, 'd'], [32, 10, 0.5, 'g'], [37, 16, 2.9, 'd'], [12, 2, 2.9, 'g'], [29, 2, 0.3, 'g']] as const)
        leaf(c, x, y, 3, 1.1, a, col);
      land(c, 25, 1.2, 'gd', 802, 2);
      // The panda sits facing us: white body, black legs and shoulders, white head with black ears.
      c.blob(20, 22, 11, 8, 'w', undefined, undefined, 803, 0.12);
      c.fill((x, y, now) => (now === 'w' && y > 16 && c.noise(x, y, 2.5, 819) > 0.72 ? 'e' : undefined));
      c.blob(10.5, 26.5, 5, 3.6, 'c', undefined, undefined, 804, 0.2);
      c.blob(29.5, 26.5, 5, 3.6, 'c', undefined, undefined, 805, 0.2);
      c.blob(9.5, 27.5, 1.6, 1.2, 'e', undefined, undefined, 806, 0);
      c.blob(30.5, 27.5, 1.6, 1.2, 'e', undefined, undefined, 806, 0);
      c.blob(12.5, 3.2, 3, 2.6, 'c', undefined, undefined, 807, 0.15);
      c.blob(27.5, 3.2, 3, 2.6, 'c', undefined, undefined, 808, 0.15);
      c.blob(20, 9.5, 9, 7, 'w', undefined, undefined, 809, 0.1);
      c.fill((x, y, now) => (now === 'w' && y < 17 && y > 9 && x > 24 && c.noise(x, y, 2.5, 820) > 0.6 ? 'e' : undefined));
      // Eye patches that droop outward, each with a dark eye and a glint; the nose and the mouth.
      const patch = ['..ccc', '.cccc', 'cnwcc', 'cccc.', 'cc...'];
      spriteFlip(c, patch, 13, 6);
      spriteFlip(c, patch, 22, 6, true);
      spriteFlip(c, ['ccc', '.c.'], 19, 11);
      // The shoulders and arms, black, reaching in to hold a stalk of bamboo whose leafy top is at the mouth.
      // The stalk runs from the lower left past the corner of the mouth to a spray of leaves at the upper right.
      c.curve(11, 21, 11, 17, 16, 20.5, 'c', 4.2, 3.4);
      c.curve(29, 21, 28, 16, 22, 17, 'c', 4.2, 3.4);
      const onStalk: [number, number][] = [];
      c.curve(9.5, 29, 18, 19, 30.5, 4, 'g', 2.2, 1.8);
      c.fill((x, y, now) => {
        if (now === 'g' && x < 32 && y > 3 && c.at(x - 1, y) !== 'g' && c.at(x - 1, y) !== 'y') onStalk.push([x, y]);
        return undefined;
      });
      for (const [x, y] of onStalk) if (hash(x, y, 821) < 0.75) c.put(x, y, 'y');
      for (const k of [8, 15, 23]) c.fill((x, y, now) => ('gy'.includes(now) && y === k && x > 8 && x < 32 ? 'd' : undefined));
      leaf(c, 33, 2.5, 3.4, 1.2, -0.4, 'd', 'g');
      leaf(c, 34, 6, 3.4, 1.2, 0.5, 'g', 'd');
      leaf(c, 29, 1, 2.8, 1, -1.6, 'd');
      c.blob(16, 20.5, 2.2, 1.8, 'c', undefined, undefined, 818, 0.2);
      c.blob(21.5, 16.5, 2.2, 1.8, 'c', undefined, undefined, 817, 0.2);
    },
  },
  {
    title: 'Stained glass window with a dove',
    ...LARGE,
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
    title: 'Clownfish in an anemone',
    ...LARGE,
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
    title: 'Starfish in a rock pool',
    ...LARGE,
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
    title: 'Leopard on a branch at dusk',
    ...LARGE,
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
    title: 'Coral snake among autumn leaves',
    ...LARGE,
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
  // Three pictures drawn from a description in words only, never from the picture described.
  {
    title: 'Harbour fireworks',
    ...LARGE,
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
    title: 'Toucan on a mossy branch',
    ...LARGE,
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
    title: 'Bees on the comb',
    ...LARGE,
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
];
