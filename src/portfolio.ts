// Pictures that are not levels yet: drawn first, as a portfolio, and turned into levels later, when each
// gets its pots, its band and its place in the order. Every picture is one subject in its setting, drawn
// with the noise helpers of the Canvas, so its horizons wander and its tones meet in broken edges.

import { type Canvas, LARGE, type Scene, hash, land, leaf, ribbon, rim, sprite, spriteFlip, streaks } from './scenes.ts';

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
];
