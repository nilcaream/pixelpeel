// Pictures that are not levels yet: drawn first, as a portfolio, and turned into levels later, when each
// gets its pots, its band and its place in the order. Every picture is one subject in its setting, drawn
// with the noise helpers of the Canvas, so its horizons wander and its tones meet in broken edges.

import { type Canvas, LARGE, type Scene, cloud, hash, land, ribbon, rim, ripples, streaks } from './scenes.ts';

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
    title: 'Spiral galaxy in infrared',
    ...LARGE,
    draw: (c) => {
      // A spiral galaxy seen nearly face on, in the false colours of an infrared telescope: a white core in
      // a yellow and orange bulge, two arms of glowing red dust with brown lanes on their inner side and
      // pink knots where stars are born, a purple and blue haze between the arms, and deep space round it
      // in charcoal, the same dark that opens holes in the haze. Stars of every colour lie anywhere, in front
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
    title: 'Nebula pillars in infrared',
    ...LARGE,
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
    title: 'Mushroom house at night',
    ...LARGE,
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
    title: 'Fox asleep in the snow',
    ...LARGE,
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
    title: 'Fawn in spring flowers',
    ...LARGE,
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
    title: 'Koi pond in autumn',
    ...LARGE,
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
    title: 'Owl in a hollow by day',
    ...LARGE,
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
    title: 'Dragon asleep on its gold',
    ...LARGE,
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
    title: 'Rocket on the pad at night',
    ...LARGE,
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
    title: 'Goldfish pond from above',
    ...LARGE,
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
    title: 'Volcano erupting at night',
    ...LARGE,
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
    title: 'Treehouse in autumn at dusk',
    ...LARGE,
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
    title: 'Bees on a honeycomb',
    ...LARGE,
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
    title: 'Pizza from above',
    ...LARGE,
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
    title: "Bird's nest with eggs",
    ...LARGE,
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
    title: 'Octopus in a rock pool',
    ...LARGE,
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
    title: 'Toucan in the rainforest',
    ...LARGE,
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
    title: 'Crab on the beach',
    ...LARGE,
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
    title: 'Zebra at a waterhole',
    ...LARGE,
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
    title: 'Snow monkey in a hot spring',
    ...LARGE,
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
    title: 'Fireworks over a harbour',
    ...LARGE,
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
    title: 'Stained glass rose window',
    ...LARGE,
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
    title: 'Peacock feather close-up',
    ...LARGE,
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
    title: 'Mandarin fish on a reef',
    ...LARGE,
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
    title: 'Lion resting at dusk',
    ...LARGE,
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
    title: 'Kingfisher diving',
    ...LARGE,
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
];

/** A bright star with the cross of light a telescope's mirror gives it: one square of `core`, four of `ray`. */
function starCross(c: Canvas, x: number, y: number, core: string, ray: string): void {
  c.put(x, y, core);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) c.put(x + dx, y + dy, ray);
}

/** A little picture of letters, row by row, its top left at (x0, y0); '.' leaves the square as it is. */
function sprite(c: Canvas, x0: number, y0: number, rows: readonly string[]): void {
  rows.forEach((row, y) => [...row].forEach((k, x) => k !== '.' && c.put(x0 + x, y0 + y, k)));
}

/** A little picture of letters, row by row, '.' left alone; `flip` mirrors it inside its own box. */
function spriteFlip(c: Canvas, rows: readonly string[], x0: number, y0: number, flip = false): void {
  rows.forEach((row, y) =>
    [...row].forEach((k, i) => {
      if (k !== '.') c.put(flip ? x0 + row.length - 1 - i : x0 + i, y0 + y, k);
    }),
  );
}

/** The part of `v` after the point, in [0, 1) also for negative `v`. */
function frac(v: number): number {
  return v - Math.floor(v);
}

/** A fir in three tiers, each a little wider than the one above. */
function pine(c: Canvas, cx: number, top: number, bottom: number, half: number, col: string): void {
  const h = bottom - top;
  for (let k = 0; k < 3; k++) {
    const t0 = top + ((k * h) / 3) * 0.8;
    const t1 = top + ((k + 1) * h) / 3;
    const w = half * (0.45 + (0.55 * (k + 1)) / 3);
    c.poly([cx, t0, cx + w, t1, cx - w * 0.9, t1 + 0.4], col);
  }
}

/** A koi seen from above along a bent spine, head first: body, two side fins and a tail fan. */
function koi(c: Canvas, p: number[], R: number, body: string, fin: string) {
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
function fishPart(cx: number, cy: number, ang: number, len: number, wide: number, bend: number) {
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
function leaf(c: Canvas, cx: number, cy: number, len: number, w: number, ang: number, col: string, vein?: string): void {
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
function outlined(c: Canvas, col: string, draw: () => void): void {
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
