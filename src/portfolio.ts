// Pictures that are not levels yet: drawn first, as a portfolio, and turned into levels later, when each
// gets its pots, its band and its place in the order. Every picture is one subject in its setting, drawn
// with the noise helpers of the Canvas, so its horizons wander and its tones meet in broken edges.

import { LARGE, type Scene, land, ribbon, rim } from './scenes.ts';

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
];
