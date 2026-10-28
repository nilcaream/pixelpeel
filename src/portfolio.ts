// Pictures that are not levels yet: drawn first, as a portfolio, and turned into levels later, when each
// gets its pots, its band and its place in the order. Every picture is one subject in its setting, drawn
// with the noise helpers of the Canvas, so its horizons wander and its tones meet in broken edges.

import { type Canvas, LARGE, type Scene, cloud, hash, land, leaf, outlined, ribbon, rim, ripples, sprite, spriteFlip, streaks } from './scenes.ts';

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
    title: 'Axolotl in a pond',
    ...LARGE,
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
    title: 'Mandrill close-up',
    ...LARGE,
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
    title: 'Highland cow in heather',
    ...LARGE,
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
    title: 'Mandarin duck on a pond',
    ...LARGE,
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
    title: 'Manta ray over a reef',
    ...LARGE,
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
    title: 'Seahorse in seagrass',
    ...LARGE,
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
  {
    title: 'Pagoda in autumn hills',
    ...LARGE,
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
    title: 'Canal houses at dusk',
    ...LARGE,
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
          const from = c.at(x + Math.round(Math.sin(y * 1.7) * 1.2), 44 - y) as string;
          c.put(x, y, hash(x, y, 1104) < 0.3 || from === 'e' ? 'b' : from);
        }
      c.fill((x, y) => (y >= 25 && y <= 26 && x >= 7 && x <= 16 - (y - 25) && x >= 7 + (y - 25) ? (y === 25 ? 'r' : 'n') : undefined));
    },
  },
  {
    title: 'Comet over a desert arch',
    ...LARGE,
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
    title: 'Lightning over a city',
    ...LARGE,
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
];
