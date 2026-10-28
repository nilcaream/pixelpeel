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
  {
    title: 'Vintage typewriter',
    ...LARGE,
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
  {
    title: 'Books and a candle',
    ...LARGE,
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
  {
    title: 'Guitar on a rug',
    ...LARGE,
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
    title: 'Bicycle with flowers',
    ...LARGE,
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
    title: 'Sundae in a tall glass',
    ...LARGE,
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
  {
    title: 'Sunbird at red flowers',
    ...LARGE,
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
    title: 'Rainbow over a waterfall',
    ...LARGE,
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
    title: 'Citrus slices',
    ...LARGE,
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
  {
    title: 'Campfire on a beach',
    ...LARGE,
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
  {
    title: 'Combine in a wheat field',
    ...LARGE,
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
];
