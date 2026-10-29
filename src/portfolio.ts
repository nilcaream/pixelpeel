// Pictures that are not levels yet: drawn first, as a portfolio, and turned into levels later, when each
// gets its pots, its band and its place in the order. Every picture is one subject in its setting, drawn
// with the noise helpers of the Canvas, so its horizons wander and its tones meet in broken edges.

import { type Canvas, LARGE, type Scene, cloud, frac, hash, land, leaf, outlined, pine, ribbon, rim, ripples, sprite, spriteFlip, streaks } from './scenes.ts';

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

// Ten pictures drawn by Retell: each from a description in words only, never from the picture it describes.

/** How far a square's centre lies from an ellipse's centre, 1 on its edge. */
const ell = (x: number, y: number, cx: number, cy: number, rx: number, ry: number): number => Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry);

type Sample = [number, number, number];
/** A path sampled finely, each sample with the arc length up to it. */
function sampled(f: (t: number) => [number, number], n = 240): Sample[] {
  const out: Sample[] = [];
  let s = 0;
  let [px, py] = f(0);
  for (let i = 0; i <= n; i++) {
    const [x, y] = f(i / n);
    s += Math.hypot(x - px, y - py);
    out.push([x, y, s]);
    px = x;
    py = y;
  }
  return out;
}
/** The distance from a square's centre to the path, and the arc length where it is nearest. */
function nearest(pts: Sample[], x: number, y: number): [number, number] {
  let best = Infinity;
  let at = 0;
  for (const [px, py, s] of pts) {
    const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
    if (d < best) {
      best = d;
      at = s;
    }
  }
  return [best, at];
}
/** A tube along a path, `width(s)` wide on each side, painted by arc length. */
function tube(c: Canvas, pts: Sample[], width: (s: number) => number, paint: (s: number, d: number) => string | undefined): void {
  c.fill((x, y) => {
    const [d, s] = nearest(pts, x, y);
    return d <= width(s) ? paint(s, d) : undefined;
  });
}
/** How close a square lies to the wall between two cells of a jittered grid: 0 on the wall. */
function cellGap(x: number, y: number, size: number, salt: number): number {
  const gx = Math.floor(x / size);
  const gy = Math.floor(y / size);
  let d0 = 99;
  let d1 = 99;
  for (let j = gy - 1; j <= gy + 1; j++)
    for (let i = gx - 1; i <= gx + 1; i++) {
      const d = Math.hypot(x + 0.5 - (i + 0.2 + hash(i, j, salt) * 0.6) * size, y + 0.5 - (j + 0.2 + hash(i, j, salt + 1) * 0.6) * size);
      if (d < d0) {
        d1 = d0;
        d0 = d;
      } else if (d < d1) d1 = d;
    }
  return d1 - d0;
}
/** Turns every square of the working letter `from` into `to`. */
const settle = (c: Canvas, from: string, to: string): void => c.fill((_x, _y, now) => (now === from ? to : undefined));

/** A flat-topped savanna tree: a leaning forked trunk and a broad ragged crown with sky showing through. */
function acacia(c: Canvas, cx: number, top: number, half: number, ground: number, salt: number): void {
  const mid = (ground + top) / 2 + 2;
  c.curve(cx + 0.5, ground + 1, cx - 0.5, mid, cx - half * 0.45, top + 1, 'e', 1.3, 0.8);
  c.curve(cx, mid, cx + half * 0.2, top + 3, cx + half * 0.5, top + 1, 'e', 1, 0.7);
  c.fill((x, y) => {
    const u = (x + 0.5 - cx) / half;
    const v = y + 0.5 - top;
    if (Math.abs(u) > 1 + (c.noise(0, y, 2, salt + 1) - 0.5) * 0.3) return undefined;
    if (v < (c.noise(x, 1, 2.5, salt + 2) - 0.5) * 1.4 || v > 2.1 * (1 - u * u * 0.5) + (c.noise(x, 0, 2, salt) - 0.5) * 1.2) return undefined;
    return hash(x, y, salt + 3) < 0.08 ? undefined : 'e';
  });
}

const giraffe: Scene = {
  title: 'Giraffe at dusk',
  ...LARGE,
  draw(c) {
    // The evening sky in wavy bands: blue above, then purple, pink, and an orange glow at the horizon.
    c.fill((x, y) => {
      const t = y + (c.noise(x, y, 5, 501) - 0.5) * 3.5 + Math.sin(x / 4 + y / 3) * 0.7;
      return t < 5.5 ? 'b' : t < 10.5 ? 'p' : t < 16 ? 'k' : 'o';
    });
    // Long thin clouds: pink streaks in the purple, purple in the pink, yellow in the glow; the first stars.
    c.fill((x, y, now) => {
      const s = c.noise(x * 0.5, y * 2.2, 3, 502);
      if (now === 'p' && s > 0.66) return 'k';
      if (now === 'k' && s < 0.3) return 'p';
      if (now === 'o' && s > 0.62) return 'y';
      if (now === 'b' && hash(x, y, 503) < 0.06) return 'w';
      return undefined;
    });
    // The sun sinking at the horizon on the left.
    c.fill((x, y) => (ell(x, y, 10, 18.5, 2.6, 2.4) < 1 ? 'y' : undefined));
    // The ground: brown earth, lit orange in places, a few dark stones.
    const horizon = (x: number): number => 19 + c.noise(x, 0, 6, 504) * 1.6 + Math.sin(x / 5) * 0.4;
    c.fill((x, y) => {
      if (y + 0.5 < horizon(x)) return undefined;
      const h = hash(x, y, 505);
      return h < 0.08 ? 'o' : h < 0.12 ? 'c' : 'n';
    });
    acacia(c, 6, 11, 6, 20, 510);
    acacia(c, 37, 9, 5.5, 20, 520);
    // The giraffe, facing left: legs, body, the long neck up to the head at the top edge (drawn in Y, patched after).
    const feet: [number, number][] = [];
    for (const [x, lean] of [[19.5, -0.8], [22.2, 0.2], [31.2, -0.4], [34, 0.6]] as const) {
      c.curve(x, 17, x + lean * 0.3, 22, x + lean, 28.5, 'Y', 1.9, 1.4);
      feet.push([Math.floor(x + lean), 28]);
    }
    c.blob(27, 14.5, 9, 4.4, 'Y', undefined, undefined, 540, 0.12);
    c.blob(20.5, 13.2, 4, 4, 'Y', undefined, undefined, 541, 0.1);
    c.blob(34.5, 14.6, 3.4, 3.4, 'Y', undefined, undefined, 544, 0.1);
    c.curve(20.5, 12.5, 17, 6, 15.5, 2.8, 'Y', 4.4, 2.8);
    c.blob(13.8, 2.2, 3.4, 1.9, 'Y', undefined, undefined, 542, 0.1);
    c.blob(10.6, 3, 2, 1.4, 'Y', undefined, undefined, 543, 0.1);
    c.put(17, 1, 'Y');
    c.curve(37.5, 13.5, 38.5, 17, 38.5, 21, 'Y', 0.8, 0.6);
    // Brown patches with pale lines between them; the legs stay plain below the knee.
    c.fill((x, y, now) => (now === 'Y' && y < 21 && y > 1 && cellGap(x, y, 3, 550) > 0.7 ? 'n' : undefined));
    // The mane down the back of the neck, the horns, the eye, hooves and the tail tuft.
    c.fill((x, y, now) => (now === 'Y' && y > 3 && y < 12 && x > 15 && c.at(x + 1, y) !== 'Y' && c.at(x + 1, y) !== 'n' ? 'n' : undefined));
    for (const [x, y] of [[14, 0], [16, 0], [13, 2], [9, 3], [38, 21], [38, 22]] as const) c.put(x, y, 'c');
    settle(c, 'Y', 'y');
    // Dark green grass along the bottom, light tips catching the last light.
    c.fill((x, y) => {
      const top = 25 + (c.noise(x, 0, 3, 530) - 0.5) * 3 + (hash(x, 0, 531) < 0.3 ? -1.5 : 0) - Math.max(0, 4 - Math.min(x, 39 - x)) * 1.8;
      if (y + 0.5 < top) return undefined;
      return hash(x, y, 532) < 0.16 || (y + 0.5 < top + 1 && hash(x, y, 533) < 0.5) ? 'g' : 'd';
    });
    for (const [x, y] of feet) c.put(x, y, 'c');
  },
};

/** A cloud of bonsai leaves: dark below, lit above, with tufts of each colour in the other. */
function pad(c: Canvas, cx: number, cy: number, rx: number, ry: number, salt: number): void {
  c.fill((x, y) => {
    const d = ell(x, y, cx, cy, rx, ry) + (c.noise(x, y, 1.6, salt) - 0.5) * 0.5;
    if (d > 1) return undefined;
    const lit = (y + 0.5 - cy) / ry + ((x + 0.5 - cx) / rx) * 0.4 < -0.1 + (hash(x, y, salt + 1) - 0.5) * 0.6;
    const flip = hash(x, y, salt + 2) < 0.08;
    return lit !== flip ? 'g' : 'd';
  });
}

const bonsai: Scene = {
  title: 'Bonsai on the table',
  ...LARGE,
  draw(c) {
    // The warm wall: orange plaster clouded with yellow, and a round yellow paper window behind the tree flecked orange.
    c.fill((x, y) => {
      const v = c.noise(x, y, 4, 601) + c.noise(x, y, 1.5, 602) * 0.35;
      return ell(x, y, 20, 11.5, 13.5, 13) + (c.noise(x, y, 2, 603) - 0.5) * 0.08 < 1 ? (v > 0.95 ? 'o' : 'y') : v > 0.8 ? 'y' : 'o';
    });
    // The table: brown wood with dark grain.
    const edge = (x: number): number => 25.6 + (c.noise(x, 0, 6, 610) - 0.5) * 0.8;
    c.fill((x, y) => {
      if (y + 0.5 < edge(x)) return undefined;
      const g = frac((y + c.noise(x, y, 5, 611) * 2.5) / 1.8);
      return g < 0.22 && hash(x, y, 612) > 0.35 ? 'c' : 'n';
    });
    // Moss heaped in the pot.
    c.blob(20, 20.6, 7, 1.4, 'd', undefined, undefined, 620, 0.2);
    c.fill((x, y, now) => (now === 'd' && y < 21 && hash(x, y, 621) < 0.35 ? 'g' : undefined));
    // The trunk twisting up out of the moss, and the limbs out to the three leaf clouds.
    c.blob(21, 20.4, 2.5, 1, 'n', undefined, undefined, 622, 0.1);
    c.curve(21, 21, 13, 17, 17, 12.5, 'n', 2.6, 1.6);
    c.curve(17, 12.5, 22, 10, 21, 5, 'n', 1.6, 1);
    c.curve(16, 14, 12, 13.5, 9, 11.5, 'n', 1.2, 0.8);
    c.curve(19, 11, 25, 11, 29, 8.5, 'n', 1.2, 0.8);
    c.fill((x, y, now) => (now === 'n' && y < 21 && hash(x, y, 623) < 0.14 ? 'c' : undefined));
    pad(c, 8.5, 10.5, 8, 4.3, 630);
    pad(c, 21, 5, 9.2, 4.6, 640);
    pad(c, 31.2, 9.5, 8, 4.2, 650);
    // Red blossoms on the right side, a few with a pink petal; two fallen on the table.
    for (let i = 0; i < 16; i++) {
      const x = Math.round(24 + hash(i, 1, 660) * 11);
      const y = Math.round(3 + hash(i, 2, 660) * 8);
      if (c.at(x, y) !== 'd' && c.at(x, y) !== 'g') continue;
      c.put(x, y, 'r');
      if (hash(i, 3, 660) < 0.4) c.put(x + 1, y, 'k');
    }
    c.put(31, 27, 'r');
    c.put(34, 26, 'k');
    // The shallow blue pot: curved rim and foot, sky-blue glaze running down from the rim, a white glint.
    c.fill((x, y) => {
      const u = (x + 0.5 - 20) / 11;
      if (Math.abs(u) > 1 - (y + 0.5 - 21) * 0.04) return undefined;
      if (y + 0.5 < 21 + u * u * 0.8 || y + 0.5 > 25.8 - u * u * 0.9) return undefined;
      return y + 0.5 < 22.4 + u * u * 0.8 + hash(x, 0, 670) * 1.2 ? 's' : 'b';
    });
    c.put(12, 23, 'w');
    c.put(13, 24, 'w');
    for (const x of [12, 13, 26, 27]) c.put(x, 25, 'c');
    c.put(4, 21, 'e');
  },
};

const chameleon: Scene = {
  title: 'Chameleon on the move',
  ...LARGE,
  draw(c) {
    // The sky, deeper blue at the very top, with white clouds shaded grey underneath.
    c.fill((x, y) => (y + c.noise(x, 0, 5, 701) * 3 < 3 ? 'b' : y < 18 && c.noise(x, y, 5, 702) > 0.7 ? 'w' : 's'));
    c.fill((x, y, now) => (now === 'w' && c.at(x, y + 1) === 's' && hash(x, y, 703) < 0.6 ? 'e' : undefined));
    // Dark green leaves crowding into the four corners.
    const corners = [[0, 0], [40, 0], [0, 30], [40, 30]] as const;
    for (let i = 0; i < 28; i++) {
      const [kx, ky] = corners[i % 4]!;
      const r = 3 + hash(i, 1, 710) * 7;
      const a = (hash(i, 2, 710) * Math.PI) / 2;
      const cx = kx + (kx ? -1 : 1) * Math.cos(a) * r;
      const cy = ky + (ky ? -1 : 1) * Math.sin(a) * r;
      const col = i % 3 === 0 ? 'g' : 'd';
      leaf(c, cx, cy, 6 + hash(i, 4, 710) * 3, 2.4, Math.atan2(cy - ky, cx - kx) + (hash(i, 3, 710) - 0.5) * 0.8, col, col === 'g' ? 'd' : 'g');
    }
    // The branch across the picture, dark underneath, a twig rising on the right.
    const br = (x: number): number => 21 + Math.sin(x / 7) * 0.9 - x * 0.05 + (c.noise(x, 0, 3, 720) - 0.5) * 0.6;
    c.fill((x, y) => {
      const v = y + 0.5 - br(x);
      if (v < 0 || v > 2.8 + c.wobble(x, y, 721) * 0.4) return undefined;
      return v > 2 || hash(x, y, 722) < 0.12 ? 'c' : 'n';
    });
    c.curve(33, br(33), 36, 16, 39.5, 13, 'n', 1, 0.7);
    // The chameleon, drawn in O: body with a ridged back, the casqued head on the left, four gripping legs.
    c.blob(19.5, 13, 11.5, 6, 'O', undefined, undefined, 730, 0.08);
    for (let x = 10; x <= 28; x += 2) c.put(x, Math.round(13 - 6 * Math.sqrt(Math.max(0, 1 - ((x + 0.5 - 19.5) / 11.5) ** 2))) - 1, 'O');
    c.poly([9.5, 8, 9.5, 18.5, 1.5, 15.6, 1, 13, 5.5, 8], 'O');
    c.poly([4.8, 8.8, 8, 4.8, 11, 8.8], 'O');
    for (const [x0, x1] of [[12, 10.5], [15.5, 16], [23.5, 24.5], [27, 28.4]] as const) {
      c.curve(x0, 18, x0 - 1, 19.6, x1, br(x1) + 0.2, 'O', 1.8, 1.3);
      c.put(Math.round(x1) - 1, Math.round(br(x1)), 'y');
      c.put(Math.round(x1) + 1, Math.round(br(x1)), 'y');
    }
    // The tail: out over the back, down past the branch, and curled into a spiral.
    const tail = sampled((t) => {
      if (t < 0.3) {
        const u = t / 0.3;
        return [(1 - u) ** 2 * 28.5 + 2 * u * (1 - u) * 36.5 + u * u * 35, (1 - u) ** 2 * 13 + 2 * u * (1 - u) * 10 + u * u * 20.5];
      }
      const a = -Math.PI / 2 + ((t - 0.3) / 0.7) * 3.4 * Math.PI;
      const r = 4 * (1 - ((t - 0.3) / 0.7) * 0.82);
      return [35 + Math.cos(a) * r, 24.5 + Math.sin(a) * r];
    });
    const len = tail[tail.length - 1]![2];
    tube(c, tail, (s) => 1.9 - (s / len) * 1.1, (s) => (frac(s / 3.2) < 0.3 ? 'r' : 'O'));
    // Markings: wavering red bands across the body, a yellow stripe low along the side, yellow spots.
    c.fill((x, y, now) => {
      if (now !== 'O' || x < 9) return undefined;
      if (y + 0.5 > 16.8 + (c.noise(x, y, 2, 740) - 0.5) * 1.4) return 'y';
      if (frac((x + c.noise(x, y, 2.5, 741) * 2.5) / 4) < 0.27) return 'r';
      return hash(x, y, 742) < 0.08 ? 'y' : undefined;
    });
    // The turret eye: a yellow-ringed cone with a dark pupil; the mouth line.
    c.fill((x, y) => {
      const d = ell(x, y, 6.6, 11.4, 2.3, 2.3);
      return d < 0.45 ? 'c' : d < 1 ? 'y' : undefined;
    });
    c.line(2, 15, 9, 16, 'r');
    settle(c, 'O', 'o');
  },
};

const flamingo: Scene = {
  title: 'Flamingo on one leg',
  ...LARGE,
  draw(c) {
    // Sky, the yellow sun top left with a broken orange halo, a white cloud top right shaded grey underneath.
    c.fill(() => 's');
    c.fill((x, y) => {
      const d = ell(x, y, 6, 5, 3.6, 3.6);
      return d < 1 ? 'y' : d < 1.4 && hash(x, y, 801) < 0.6 ? 'o' : undefined;
    });
    c.fill((x, y) => {
      const d = Math.min(ell(x, y, 33, 5, 6, 2), ell(x, y, 35.5, 3.3, 3.5, 2.2), ell(x, y, 30.5, 4, 2.8, 1.8)) + (c.noise(x, y, 1.5, 802) - 0.5) * 0.3;
      if (d > 1) return undefined;
      return y + 0.5 > 5.6 + (c.noise(x, 0, 2, 803) - 0.5) * 1.2 ? 'e' : 'w';
    });
    // The far shore: a low dark green treeline.
    c.fill((x, y) => (y + 0.5 > 13.4 - c.noise(x, 0, 2.5, 804) * 2 && y < 15 ? 'd' : undefined));
    // The shallows: blue with short sky-blue ripples and white glints; a muddy bank in front.
    c.fill((x, y) => {
      if (y < 15) return undefined;
      if (y + 0.5 > 28.2 + (c.noise(x, 0, 3, 813) - 0.5) * 1.6) return hash(x, y, 814) < 0.2 ? 'g' : 'n';
      const h = hash(Math.floor((x + hash(0, y, 811) * 7) / 3), y, 812);
      return h < 0.28 ? 's' : h > 0.97 ? 'w' : 'b';
    });
    // The reed beds crowding in at both sides.
    c.fill((x, y) => {
      const n = c.noise(0, y, 3, 815) * 2.5;
      if (y < 9 + hash(x, 0, 816) * 4 || (x > 3 + n && x < 36 - n)) return undefined;
      return frac((x + y * 0.15) / 2.3) < 0.45 ? 'd' : 'g';
    });
    // The flamingo, drawn in K: body and tail, the S of the neck, the head, the standing leg and the folded one.
    c.blob(24, 12.5, 9.5, 4.8, 'K', undefined, undefined, 820, 0.1);
    c.poly([31, 10, 37, 9, 36, 14.5, 31, 15.5], 'K');
    c.curve(17, 11.5, 9.5, 7, 13.5, 4.5, 'K', 3, 2.4);
    c.curve(13.5, 4.5, 17, 1, 12.5, 1.4, 'K', 2.4, 1.8);
    c.blob(11.5, 2, 2.6, 1.8, 'K', undefined, undefined, 821, 0.05);
    c.curve(24, 16, 23.6, 21, 23, 27.5, 'K', 1.7, 1.3);
    c.line(25, 16, 28, 19, 'K');
    c.line(28, 19, 25, 21, 'K');
    c.line(25, 17, 28, 20, 'K');
    // The beak, white with a dark bent tip; the eye.
    for (const [x, y, col] of [[9, 2, 'w'], [8, 2, 'w'], [8, 3, 'c'], [7, 3, 'c'], [7, 4, 'c'], [12, 1, 'c']] as const) c.put(x, y, col);
    // The wing: purple feathers edged in red, the black flight feathers at the tail.
    c.fill((x, y, now) => {
      if (now !== 'K') return undefined;
      const d = ell(x, y, 25, 12, 6, 3);
      return d < 0.75 ? 'p' : d < 1.05 && y > 11 ? 'r' : undefined;
    });
    for (const [x, y] of [[34, 11], [35, 11], [34, 12], [35, 12]] as const) c.put(x, y, 'c');
    // Ripples ringing the standing leg.
    c.fill((x, y, now) => (now === 'b' && Math.abs(ell(x, y, 23.5, 27.5, 4, 1) - 1) < 0.25 ? 's' : undefined));
    settle(c, 'K', 'k');
    // Reeds along both sides, some topped with brown seed heads.
    for (let i = 0; i < 26; i++) {
      const left = i % 2 === 0;
      const bx = left ? hash(i, 1, 840) * 7 : 33 + hash(i, 1, 840) * 7;
      const h = 9 + hash(i, 2, 840) * 11;
      const lean = (hash(i, 3, 840) - 0.5) * 4 + (left ? 0.8 : -0.8);
      const col = i % 3 === 0 ? 'd' : 'g';
      c.curve(bx, 30, bx + lean * 0.4, 30 - h * 0.5, bx + lean, 30 - h, col, 1, 0.6);
      if (hash(i, 4, 840) < 0.45) c.rect(Math.round(bx + lean), Math.round(30 - h), Math.round(bx + lean), Math.round(30 - h) + 2, 'n');
    }
  },
};

const jellyfish: Scene = {
  title: 'Jellyfish adrift',
  ...LARGE,
  overrides: { c: 'v' },
  draw(c) {
    // The water: light near the surface, shafts of light slanting down, navy in the deep.
    c.fill((x, y) => {
      const t = y + (c.noise(x, y, 6, 901) - 0.5) * 5;
      if (t < 5.5) return hash(x, y, 905) < 0.05 ? 'w' : 's';
      if (t > 21 && c.noise(x, y, 4, 902) > 0.4) return 'c';
      const ray = frac((x - y * 0.35 + c.noise(x, y, 8, 903) * 3) / 9);
      return ray < 0.16 && y < 20 - hash(x, 0, 904) * 6 ? 's' : 'b';
    });
    // The purple seabed with grey pebbles, a little green weed waving up from it.
    const bed = (x: number): number => 26.5 + (c.noise(x, 0, 5, 910) - 0.5) * 3;
    c.fill((x, y) => (y + 0.5 > bed(x) ? (hash(x, y, 911) < 0.1 ? 'e' : 'p') : undefined));
    for (const [bx, h] of [[3, 6], [5, 4], [33, 7], [35.5, 5], [37, 3]] as const)
      for (let y = 29; y > 29 - h - 1; y--) c.put(Math.round(bx + Math.sin(y / 1.6 + bx) * 0.8), Math.round(y - (29 - bed(bx)) * 0.2), 'g');
    // Specks drifting in the water.
    c.fill((x, y, now) => ((now === 'b' || now === 'c') && hash(x, y, 912) < 0.025 ? 'w' : undefined));
    // Long thin tentacles hanging from the rim, broken here and there.
    for (let k = 0; k < 10; k++) {
      const x0 = 10.5 + k * 2.1;
      const end = 25 + hash(k, 1, 920) * 4;
      for (let y = 12; y < end; y++) if (hash(k, y, 921) > 0.12) c.put(Math.round(x0 + Math.sin(y / 3 + k) * 1.3 + (y - 12) * (k - 4.5) * 0.04), y, 'k');
    }
    // Four frilly oral arms, white down the middle, pink and red frills.
    for (let k = 0; k < 4; k++) {
      const cx = 15.2 + k * 3.2;
      const end = 21 + hash(k, 2, 930) * 4;
      for (let y = 11; y < end; y++) {
        const x = Math.round(cx + Math.sin(y / 2.5 + k * 1.7) * 1.4);
        c.put(x, y, 'w');
        c.put(x - 1, y, y % 4 === 0 ? 'r' : 'k');
        c.put(x + 1, y, y % 4 === 2 ? 'r' : 'k');
      }
    }
    // The bell: a pink dome with a scalloped rim dotted red, a white sheen, four orange rings inside.
    const lip = (x: number): number => 12.4 + 1.3 * Math.abs(Math.sin((x + 0.5) * 0.75));
    c.fill((x, y) => {
      if (ell(x, y, 20, 10.5, 12.5, 9.5) > 1 || y + 0.5 > lip(x)) return undefined;
      if (y + 1.5 > lip(x)) return x % 2 ? 'r' : 'k';
      if (ell(x, y, 14.5, 4.8, 4, 2.2) < 1 && hash(x, y, 940) < 0.75) return 'w';
      for (const gx of [13.8, 18, 22, 26.2]) {
        const g = ell(x, y, gx, 9, 1.8, 1.5);
        if (g > 0.5 && g < 1.05) return 'o';
      }
      return frac((Math.atan2(y + 0.5 - 12, x + 0.5 - 20) * 8) / Math.PI) < 0.12 ? 'p' : 'k';
    });
  },
};

const monkey: Scene = {
  title: 'Snow monkey taking a bath',
  ...LARGE,
  draw(c) {
    // A grey winter sky over a snowy slope, dark pines crowded on it with snow on their boughs, snow falling.
    c.fill((x, y) => (y + c.noise(x, 0, 6, 1001) * 3 < 2.5 ? 'e' : 'w'));
    for (let i = 0; i < 14; i++) pine(c, i * 3.1 - 1 + hash(i, 1, 1002) * 2, 1 + hash(i, 2, 1002) * 6, 21, 2.8 + hash(i, 3, 1002) * 1.6, i % 4 === 3 ? 'g' : 'd');
    c.fill((x, y, now) => {
      if (now !== 'd' && now !== 'g') return undefined;
      if (frac((y + hash(Math.floor(x / 2), 0, 1003) * 3) / 3) < 0.18 && c.noise(x, y, 1.5, 1004) > 0.55) return 'w';
      return hash(x, y, 1005) < 0.05 ? 'w' : undefined;
    });
    // The rocks round the pool, capped with snow.
    const rim = (x: number): number => 21 + (c.noise(x, 0, 3, 1010) - 0.5) * 1.6;
    c.fill((x, y) => {
      const v = y + 0.5 - rim(x);
      if (v < 0 || v > 1.6 + hash(x, 0, 1011)) return undefined;
      return v < 0.7 && hash(x, y, 1012) < 0.6 ? 'w' : 'c';
    });
    // The hot pool: blue with sky-blue ripples.
    const pool = (x: number): number => rim(x) + 1.6 + hash(x, 0, 1011);
    c.fill((x, y) => {
      if (y + 0.5 < pool(x)) return undefined;
      return frac((x * 0.7 + Math.sin(y * 1.3) * 2 + y * 2.3) / 5) < 0.2 && hash(x, y, 1013) < 0.7 ? 's' : 'b';
    });
    // The monkey, drawn in E: a shaggy head and the shoulders just above the water.
    c.fill((x, y) => (ell(x, y, 20, 25, 16, 8.5) + (c.noise(x, y, 1.2, 1020) - 0.5) * 0.3 < 1 && y + 0.5 < pool(x) + 0.5 ? 'E' : undefined));
    c.blob(20, 10.8, 7.4, 6.9, 'E', undefined, undefined, 1021, 0.3);
    // Fur: dark strands, snow resting on the crown.
    c.fill((x, y, now) => (now === 'E' && y < 7 && hash(x, y, 1022) < 0.2 ? 'w' : now === 'E' && hash(x, y, 1023) < 0.06 ? 'c' : undefined));
    // The pink face with red cheeks, dark eyes and brow, the nose and mouth.
    c.fill((x, y) => (ell(x, y, 20, 11.5, 3.9, 3.3) < 1 ? 'k' : undefined));
    for (const [x, y, col] of [[17, 12, 'r'], [23, 12, 'r'], [18, 10, 'c'], [22, 10, 'c'], [19, 9, 'e'], [21, 9, 'e'], [20, 12, 'r'], [19, 14, 'c'], [20, 14, 'c'], [21, 14, 'c']] as const) c.put(x, y, col);
    settle(c, 'E', 'e');
    // Ripples round the shoulders, steam rising off the water.
    c.fill((x, y, now) => {
      const r = ell(x, y, 20, 24, 15, 2);
      if (now === 'b' && r > 0.85 && r < 1.2) return 's';
      const n = c.noise(x * 0.7, y * 1.4, 3, 1030);
      if (y > 20 && (now === 'b' || now === 's') && n > 0.7) return 'w';
      return undefined;
    });
  },
};

const nest: Scene = {
  title: 'Nest of blue eggs',
  ...LARGE,
  draw(c) {
    // Leaves everywhere, and a patch of sky at the top with a wisp of cloud.
    c.fill((x, y) => (c.noise(x, y, 4, 1100) > 0.5 ? 'g' : 'd'));
    for (let i = 0; i < 40; i++) {
      const [lx, ly] = [hash(i, 1, 1101) * 44 - 2, hash(i, 2, 1101) * 34 - 2];
      leaf(c, lx, ly, 5 + hash(i, 3, 1101) * 3, 2.2, hash(i, 4, 1101) * Math.PI, c.at(Math.round(lx), Math.round(ly)) === 'g' ? 'd' : 'g');
    }
    c.fill((x, y) => (Math.hypot((x + 0.5 - 22) / 12, (y + 1) / 6) + (c.noise(x, y, 2.5, 1102) - 0.5) * 0.7 < 1 ? 's' : undefined));
    c.fill((x, y, now) => (now === 's' && ell(x, y, 24, 1.5, 4, 0.9) < 1 ? 'w' : undefined));
    leaf(c, 14, 3, 6, 2.2, 0.4, 'g', 'd');
    leaf(c, 31, 4, 6, 2.2, 2.6, 'd', 'g');
    // A sprig of red berries low on the left.
    for (const [x, y] of [[4, 25], [5, 26], [3, 27], [6, 24], [35, 26], [36, 27]] as const) c.put(x, y, 'r');
    // The branch the nest sits in.
    c.curve(-1, 27, 18, 25, 41, 20, 'n', 1.6, 1.2);
    // The nest seen from a little above: woven strands round a dark cup lying towards the back.
    c.fill((x, y) => {
      const dx = x + 0.5 - 20;
      const r = Math.hypot(dx, (y + 0.5 - 17) / 0.62) + (c.noise(x, y, 1.3, 1110) - 0.5) * 1.2;
      if (r > 14) return undefined;
      const a = Math.atan2((y + 0.5 - 17) / 0.62, dx);
      if (Math.hypot(dx, (y + 0.5 - 15.8) / 0.62) < 9) return frac(a * 3 + r * 0.9 + c.noise(x, y, 2, 1111)) < 0.25 ? 'n' : 'c';
      const s = frac(a * 4 + r * 1.3 + c.noise(x, y, 2.5, 1112) * 1.5);
      return s < 0.35 ? 'n' : s < 0.6 ? 'o' : s < 0.72 ? 'y' : s < 0.85 ? 'n' : 'c';
    });
    // Loose straws sticking out of the rim.
    for (let i = 0; i < 14; i++) {
      const a = hash(i, 1, 1120) * 2 * Math.PI;
      const x0 = 20 + Math.cos(a) * 13;
      const y0 = 17 + Math.sin(a) * 8;
      c.line(Math.round(x0), Math.round(y0), Math.round(x0 + Math.cos(a) * 2.5), Math.round(y0 + Math.sin(a) * 1.8), i % 3 ? 'n' : 'y');
    }
    // Four blue eggs in the cup, each with a sky-blue highlight and a dark speckle.
    for (const [ex, ey] of [[15, 15.5], [20.5, 13], [26, 15.5], [20.5, 18.3]] as const) {
      c.fill((x, y) => (ell(x, y, ex, ey, 2.4, 1.7) < 1 ? 'b' : undefined));
      c.put(Math.round(ex) - 1, Math.round(ey) - 1, 's');
      c.put(Math.round(ex) + 1, Math.round(ey), 'c');
    }
  },
};

const crab: Scene = {
  title: 'Red crab on the sand',
  ...LARGE,
  draw(c) {
    // Sky and sea along the top, a line of foam, wet sand, then dry sand with wind ripples, specks and pebbles.
    const shore = (x: number): number => 7 + c.noise(x, 0, 5, 1201) * 1.5 + Math.sin(x / 4) * 0.5;
    c.fill((x, y) => {
      if (y < 2 + c.noise(x, 0, 5, 1202) * 1.5) return 's';
      if (y + 0.5 < shore(x) - 0.8) return frac((x + y * 3 + hash(0, y, 1203) * 9) / 6) < 0.3 ? 's' : 'b';
      if (y + 0.5 < shore(x)) return 'w';
      if (y + 0.5 < shore(x) + 1.5) return hash(x, y, 1204) < 0.5 ? 'o' : 'y';
      const rip = frac((y + c.noise(x, y, 6, 1205) * 3 + Math.sin(x / 3) * 0.4) / 3.2);
      const h = hash(x, y, 1206);
      return rip < 0.18 ? 'o' : h < 0.04 ? 'n' : h < 0.06 ? 'e' : 'y';
    });
    // Shells and seaweed on the sand.
    for (const [x, y, col] of [[3, 25, 'w'], [4, 25, 'w'], [3, 26, 'e'], [35, 27, 'k'], [36, 27, 'k'], [6, 12, 'p'], [7, 12, 'p'], [33, 10, 'g'], [34, 11, 'g'], [35, 11, 'd'], [36, 10, 'g'], [37, 28, 'c']] as const) c.put(x, y, col);
    // The crab's shadow on the sand.
    c.blob(20, 22, 12, 2.8, 'o', undefined, undefined, 1210, 0.15);
    // The crab, drawn in R, mirrored about the middle: legs, arms raised with open claws, eyes on stalks, the shell.
    for (const m of [(x: number) => x, (x: number) => 40 - x]) {
      for (let i = 0; i < 4; i++) {
        c.curve(m(12), 16.5 + i, m(7 - i * 0.6), 15.5 + i * 1.8, m(5.5 - i * 0.9), 21 + i * 2, 'R', 1.5, 1);
        c.put(Math.floor(m(5.5 - i * 0.9)), Math.round(21 + i * 2), 'c');
      }
      c.curve(m(12), 15, m(8), 13, m(7.5), 9.5, 'R', 2, 1.7);
      c.blob(m(7.5), 7.5, 3.7, 3, 'R', undefined, undefined, 1220, 0.1);
      c.curve(m(5.8), 6, m(4), 3.5, m(5.8), 1.5, 'R', 1.5, 1);
      c.curve(m(9.2), 6, m(10.5), 3.5, m(9), 1.8, 'R', 1.4, 0.9);
      c.curve(m(18), 11, m(17.6), 9.5, m(17), 7.8, 'R', 1, 1);
      c.fill((x, y) => (ell(x, y, m(16.9), 7, 1, 1) < 1 ? 'c' : undefined));
    }
    c.fill((x, y) => (ell(x, y, 20, 15.5, 11, 6) + (c.noise(x, y, 1.5, 1230) - 0.5) * 0.15 < 1 ? 'R' : undefined));
    // The shell: bumps lit orange on top, a dark lower rim, the mouth; claw tips dark, eye glints white.
    c.fill((x, y, now) => {
      if (now !== 'R') return undefined;
      if (y < 14 && hash(x, y, 1240) < 0.12) return 'o';
      if (y > 17 && x > 11 && x < 28 && c.at(x, y + 1) !== 'R') return 'c';
      return undefined;
    });
    for (const [x, y, col] of [[19, 20, 'n'], [20, 20, 'n'], [5, 1, 'c'], [34, 1, 'c'], [16, 6, 'w'], [23, 6, 'w']] as const) c.put(x, y, col);
    settle(c, 'R', 'r');
  },
};

const kingfisher: Scene = {
  title: 'Kingfisher on the dive',
  ...LARGE,
  draw(c) {
    // Leaves fill the background, sun flecks on the light ones, a couple of twigs and red berries.
    c.fill(() => 'd');
    for (let i = 0; i < 36; i++) {
      const col = i % 3 ? 'g' : 'd';
      leaf(c, 4 + hash(i, 1, 1301) * 32, 4 + hash(i, 2, 1301) * 20, 5 + hash(i, 3, 1301) * 3, 2.3, hash(i, 4, 1301) * Math.PI, col);
    }
    c.fill((x, y, now) => (now === 'g' && hash(x, y, 1302) < 0.05 ? 'y' : undefined));
    c.curve(-1, 6, 6, 4, 12, 0, 'n', 1, 0.7);
    c.curve(41, 18, 35, 16, 31, 20, 'n', 1, 0.7);
    for (const [x, y] of [[3, 18], [4, 19], [2, 20], [36, 4], [37, 5]] as const) c.put(x, y, 'r');
    // The water below: sky-blue with blue rings spreading where the beak points, white glints.
    const wl = (x: number): number => 26.5 + (c.noise(x, 0, 4, 1310) - 0.5) * 1.5;
    c.fill((x, y) => {
      if (y + 0.5 < wl(x)) return undefined;
      if (hash(x, y, 1311) < 0.06) return 'w';
      return frac(Math.hypot((x + 0.5 - 20) / 2, y + 0.5 - 28.5) / 1.6) < 0.3 ? 'b' : 's';
    });
    // The kingfisher from above, drawn in B: wings spread wide, the body, a short tail up top, the head down low.
    c.poly([16.5, 9.5, 9, 6, 0.5, 5, 0.5, 11, 5, 15, 11, 17.5, 16.5, 18], 'B');
    c.poly([23.5, 9.5, 31, 6, 39.5, 5, 39.5, 11, 35, 15, 29, 17.5, 23.5, 18], 'B');
    c.blob(20, 13, 3.9, 6.5, 'B', undefined, undefined, 1320, 0.05);
    c.poly([18.4, 8, 21.6, 8, 22, 2, 18, 2], 'B');
    c.blob(20, 20.8, 3.4, 3.2, 'B', undefined, undefined, 1321, 0.05);
    // Markings: the bright stripe down the back, sky-blue spots on the wings, dark tips on the flight feathers.
    c.fill((x, y, now) => {
      if (now !== 'B') return undefined;
      if ((x === 19 || x === 20) && y >= 4 && y <= 19) return 's';
      if (c.at(x, y + 1) !== 'B' && (x < 15 || x > 24) && x % 2 === 0) return 'c';
      if ((x < 16 || x > 23) && hash(x, y, 1330) < 0.22) return 's';
      return undefined;
    });
    // Orange cheeks and flanks, white patches behind the cheeks, the long dark beak.
    for (const [x, y, col] of [[17, 20, 'o'], [17, 21, 'o'], [22, 20, 'o'], [22, 21, 'o'], [16, 17, 'o'], [23, 17, 'o'], [17, 19, 'w'], [22, 19, 'w']] as const) c.put(x, y, col);
    c.poly([19, 23.3, 21, 23.3, 20, 27.6], 'c');
    settle(c, 'B', 'b');
  },
};

const snake: Scene = {
  title: 'Snake in the leaf litter',
  ...LARGE,
  draw(c) {
    // Dark soil and old brown litter, covered in fallen leaves of every autumn colour.
    c.fill((x, y) => (hash(x, y, 1402) < 0.06 ? 'c' : c.noise(x, y, 2, 1401) > 0.55 ? 'o' : 'n'));
    const hue = 'nnooyyrrgp';
    const vein: Record<string, string> = { n: 'o', o: 'n', y: 'o', r: 'n', g: 'y', p: 'n' };
    const fallen = (i: number, x: number, y: number, len: number, salt: number): void => {
      const col = hue[Math.floor(hash(i, 1, salt) * hue.length)]!;
      leaf(c, x, y, len, 1.8, hash(i, 4, salt) * Math.PI * 2, col, hash(i, 7, salt) < 0.5 ? vein[col] : undefined);
    };
    for (let i = 0; i < 75; i++) fallen(i, hash(i, 2, 1410) * 44 - 2, hash(i, 3, 1410) * 34 - 2, 3 + hash(i, 5, 1410) * 2, 1410);
    // The coral snake winding through: wide red bands, narrow yellow, black; a black snout behind a yellow collar.
    const body = sampled((t) => [1 + 33 * t, 15 + 7 * Math.sin(t * Math.PI * 2.1 + 0.4) + 1.5 * Math.sin(t * 9)]);
    const len = body[body.length - 1]![2];
    tube(
      c,
      body,
      (s) => Math.min(1.7, 0.6 + s / 6),
      (s) => {
        const h = len - s;
        if (h < 2) return 'c';
        const u = (h - 2) % 7.5;
        return u < 1 ? 'y' : u < 3 ? 'c' : u < 4 ? 'y' : 'r';
      },
    );
    // Leaves fallen across the snake, so that only parts of it show.
    for (let i = 0; i < 4; i++) {
      const [x, y] = body[Math.floor(hash(i, 6, 1420) * body.length)]!;
      fallen(i, x, y, 3.5, 1420);
    }
  },
};

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
  {
    title: 'Clockwork robot dog',
    ...LARGE,
    draw: (c) => {
      // A blue and purple workshop wall over a wooden floor.
      c.fill((x, y) => {
        if (y >= 26 + Math.round((c.noise(x, y, 6, 2401) - 0.5) * 1.2)) return c.noise(x * 0.35, y * 2.2, 3, 2402) > 0.6 ? 'o' : 'n';
        return c.noise(x, y, 5, 2403) > 0.55 ? 'p' : 'b';
      });
      outlined(c, 'c', () => {
        // The tin dog: grey body and head, brass joints, a gear on its side, a wind-up key on its back.
        c.curve(10, 13, 7, 10, 6, 7, 'e', 1.4, 1);
        oval(c, 6, 6.2, 1.2, 1.2, 0, 'r');
        for (const x of [12, 16, 23, 27]) {
          c.rect(x, 18, x + 2, 25, 'e');
          oval(c, x + 1.5, 21.5, 1.3, 1.3, 0, 'y');
          c.rect(x - 1, 25, x + 3, 25, 'y');
        }
        oval(c, 19.5, 15, 10, 5.2, 0, (_u, v) => (v < -0.6 ? 'w' : 'e'));
        for (let x = 12; x <= 27; x += 3) c.put(x, 18, 'w');
        oval(c, 19.5, 15, 3, 3, 0, (u, v) => {
          const r = Math.hypot(u, v);
          if (r < 0.4) return 'y';
          if (r > 0.75) return Math.cos(8 * Math.atan2(v, u)) > 0 ? 'o' : undefined;
          return 'o';
        });
        c.rect(19, 7, 20, 10, 'y');
        oval(c, 19.5, 5.5, 3.2, 1.8, 0, (u, v) => (Math.hypot(u, v) < 0.45 ? 'b' : 'o'));
        c.rect(27, 10, 29, 14, 'y');
        oval(c, 31, 9.5, 4.6, 3.8, 0, (_u, v) => (v < -0.55 ? 'w' : 'e'));
        oval(c, 35, 11.5, 2.6, 1.7, 0, 'e');
        c.poly([28, 7, 30, 1.5, 32, 7], 'e');
        c.poly([29.3, 6, 30.2, 3.5, 31, 6], 'k');
        oval(c, 31.8, 8.8, 1.2, 1.2, 0, 'r');
        c.put(31, 8, 'y');
        c.put(37, 11, 'n');
        c.line(33, 13, 36, 13, 'n');
      });
    },
  },
  {
    title: 'Satellite over Saturn',
    ...LARGE,
    draw: (c) => {
      // Deep space in blue and purple haze with stars.
      c.fill((x, y) => {
        const n = c.noise(x, y, 6, 2501);
        return n > 0.55 ? 'p' : n < 0.3 ? 'k' : 'b';
      });
      c.speckle('w', 'bp', 0.04, 2502);
      c.speckle('y', 'b', 0.015, 2503);
      // Saturn: its rings tilted across a banded globe, the far half of the rings behind it.
      const ring = (front: boolean): void =>
        oval(c, 15, 19, 14, 4.2, -0.25, (u, v) => {
          const r = Math.hypot(u, v);
          if (r < 0.66 || (front ? v < 0 : v >= 0)) return undefined;
          return r > 0.9 ? 'w' : r > 0.82 ? 'c' : r > 0.74 ? 'e' : 'y';
        });
      outlined(c, 'c', () => {
        ring(false);
        oval(c, 15, 19, 8.5, 8, 0, (_u, v, x, y) => {
          const band = Math.floor((v + 1) * 4 + (c.noise(x, y, 3, 2504) - 0.5) * 0.8);
          return 'oynoyon'[Math.max(0, Math.min(6, band))];
        });
        ring(true);
      });
      outlined(c, 'c', () => {
        // The satellite: a gold body, two sky-blue panels in cells, a white dish.
        c.rect(23, 5, 27, 7, 's');
        c.rect(34, 5, 38, 7, 's');
        c.fill((x, y, now) => (now === 's' && y >= 5 && y <= 7 && x % 2 === 0 ? 'b' : undefined));
        c.line(28, 6, 33, 6, 'e');
        c.rect(29, 4, 32, 8, 'y');
        c.put(30, 5, 'o');
        c.put(31, 7, 'o');
        oval(c, 30.5, 10.5, 1.8, 1, 0, 'w');
        c.put(30, 9, 'e');
      });
    },
  },
  {
    title: 'Longship in a storm',
    ...LARGE,
    draw: (c) => {
      // A storm sky in grey and purple with a white bolt, and a dark sea of heaving waves.
      c.fill((x, y) => {
        const n = c.noise(x, y, 5, 2601);
        return n > 0.6 ? 'e' : n > 0.4 ? 'p' : 'b';
      });
      path(c, [[4, 0], [6, 3], [3, 6], [6, 9], [5, 12]], 'w');
      outlined(c, 'c', () => {
        // The ship: a curved brown hull of planks, a dragon prow and a curled stern, a striped sail, round shields.
        c.line(20, 1, 20, 17, 'n');
        c.fill((x, y) => {
          if (y < 3 || y > 14) return undefined;
          const bulge = Math.sin(((y - 3) / 11) * Math.PI) * 2;
          if (x < 13 - bulge || x > 27 + bulge) return undefined;
          return Math.floor((x - 13 + bulge) / 2.6) % 2 ? 'w' : 'r';
        });
        c.line(12, 3, 28, 3, 'n');
        c.curve(8, 17, 5, 15, 6, 11, 'n', 2.2, 1.4);
        oval(c, 6.8, 10.5, 1.4, 1.4, 0, 'n');
        c.curve(32, 17, 35, 14, 34, 8, 'n', 2.4, 1.8);
        oval(c, 35.5, 7.5, 2.4, 1.5, 0.3, 'g');
        c.put(36, 7, 'y');
        c.fill((x, y) => {
          if (y < 16 || y > 21) return undefined;
          const half = 13 - (y - 16) * 1.4;
          if (Math.abs(x + 0.5 - 20) > half) return undefined;
          return y === 19 ? 'o' : 'n';
        });
        for (let i = 0; i < 7; i++) oval(c, 10.5 + i * 3.2, 16.8, 1.3, 1.3, 0, (u, v) => (Math.hypot(u, v) < 0.4 ? 'n' : 'yrwy'[i % 4]));
      });
      // Waves in front of the hull: blue swells with sky-blue crests and white foam.
      c.fill((x, y) => {
        const top = 21 + Math.sin(x / 3.2) * 1.6 + (c.noise(x, y, 4, 2602) - 0.5) * 1.5;
        if (y < top) return undefined;
        if (y < top + 1) return hash(x, y, 2603) < 0.5 ? 'w' : 's';
        return c.noise(x, y, 3, 2604) > 0.65 ? 's' : 'b';
      });
    },
  },
  {
    title: 'Okapi in the rainforest',
    ...LARGE,
    draw: (c) => {
      // Rainforest leaves in two greens with sky-blue gaps, mossy ground.
      c.fill((x, y) => {
        if (y >= 25 + Math.round((c.noise(x, y, 6, 2701) - 0.5) * 1.5)) return hash(x, y, 2702) < 0.12 ? 'y' : 'g';
        const n = c.noise(x, y, 4, 2703);
        return n > 0.66 ? 's' : n > 0.4 ? 'g' : 'd';
      });
      for (let i = 0; i < 10; i++) leaf(c, hash(i, 1, 2704) * 40, hash(i, 2, 2704) * 22, 4, 1.6, hash(i, 3, 2704) * Math.PI, i % 2 ? 'd' : 'g', i % 2 ? 'g' : 'd');
      outlined(c, 'c', () => {
        // The okapi facing left: dark brown body, a striped rump and legs, a pale face and big ears.
        for (const x of [14, 17, 26, 29]) {
          c.rect(x, 17, x + 1, 25, 'w');
          for (let y = 17; y <= 21; y += 2) c.rect(x, y, x + 1, y, 'n');
        }
        c.curve(30, 12, 31.5, 15, 31, 19, 'n', 1.2, 1);
        oval(c, 22, 14, 9, 4.6, 0, (u, v) => (u > 0.45 && Math.floor((v + 1) * 4.5) % 2 === 1 ? 'w' : 'n'));
        c.curve(15, 13, 11.5, 10, 10, 6, 'n', 4, 3);
        oval(c, 8, 7.5, 3.4, 2.3, 0.45, (u) => (u < -0.2 ? 'w' : 'e'));
        oval(c, 9.5, 3.8, 1.4, 2.2, 0.4, 'n');
        oval(c, 12, 4.4, 1.3, 2, -0.3, 'n');
        c.put(8, 6, 'c');
        c.put(5, 9, 'n');
      });
    },
  },
  {
    title: 'Sushi platter from above',
    ...LARGE,
    draw: (c) => {
      // A dark blue table, mottled sky-blue, under a wooden board.
      c.fill((x, y) => (c.noise(x, y, 4, 2801) > 0.62 ? 's' : 'b'));
      outlined(c, 'c', () => {
        c.fill((x, y) => {
          const e = Math.min(x - 3, 36 - x, y - 3, 26 - y) + (c.noise(x, y, 3, 2802) - 0.5);
          if (e < 0) return undefined;
          return c.noise(x * 2.5, y * 0.4, 3, 2803) > 0.6 ? 'o' : 'n';
        });
        // Six rolls: green nori, white rice, a salmon, tuna or cucumber heart.
        for (let i = 0; i < 6; i++)
          oval(c, 8 + i * 4.8, 8.5, 2.3, 2.3, 0, (u, v) => {
            const r = Math.hypot(u, v);
            return r > 0.78 ? 'd' : r > 0.4 ? 'w' : 'org'[i % 3];
          });
        // Four nigiri: rice under a slice of salmon or tuna with pale stripes.
        for (let i = 0; i < 4; i++)
          oval(c, 9 + i * 7, 15.5, 3.2, 1.8, 0, (u, v, x) => (v > 0.55 ? 'w' : i % 2 ? 'r' : (x + Math.round(u * 2)) % 3 === 0 ? 'w' : 'o'));
        oval(c, 9, 21.5, 3, 2.4, 0, (u, v) => (Math.hypot(u, v) > 0.7 ? 'w' : 'c'));
        oval(c, 19, 21.5, 2.6, 1.8, 0, 'k');
        c.fill((x, y, now) => (now === 'k' && (x + y) % 3 === 0 ? 'w' : undefined));
        oval(c, 26.5, 21.5, 1.6, 1.3, 0, 'g');
        c.line(29, 23, 35, 19, 'y');
        c.line(30, 24, 36, 20, 'y');
      });
    },
  },
  {
    title: 'Snail on a toadstool',
    ...LARGE,
    draw: (c) => {
      // A shady wood in dark and light green with patches of sun, mossy ground below.
      c.fill((x, y) => {
        if (y >= 27 + Math.round((c.noise(x, y, 6, 2901) - 0.5) * 1.5)) return hash(x, y, 2902) < 0.25 ? 'd' : 'g';
        const n = c.noise(x, y, 5, 2903);
        return n > 0.68 ? 'y' : n > 0.42 ? 'g' : 'd';
      });
      outlined(c, 'c', () => {
        // The toadstool: a red cap with white spots, pink gills, a white stem with a skirt.
        c.fill((x, y) => (x >= 16 && x <= 23 && y >= 18 && y <= 27 ? (x === 23 || (x === 22 && y % 2) ? 'e' : 'w') : undefined));
        c.rect(15, 20, 24, 20, 'e');
        oval(c, 19.5, 17.5, 14, 2, 0, (_u, v) => (v < 0 ? undefined : 'k'));
        oval(c, 19.5, 17.5, 14, 9.5, 0, (_u, v) => (v > 0 ? undefined : 'r'));
        for (let i = 0; i < 8; i++) {
          const a = Math.PI * (0.12 + (0.76 * i) / 7);
          oval(c, 19.5 - Math.cos(a) * 9.5, 17.5 - Math.sin(a) * 5 + (i % 2) * 1.5, 1.6, 1.1, 0, 'w');
        }
        // The snail on top: a grey body with stalked eyes, a shell in an orange and yellow spiral.
        oval(c, 19.5, 7.6, 7.5, 1.5, 0, 'e');
        c.line(12, 7, 11, 3, 'e');
        c.line(13, 7, 14, 3, 'e');
        c.put(11, 2, 'n');
        c.put(14, 2, 'n');
        oval(c, 22, 4.6, 4, 3.8, 0, (u, v) => {
          const r = Math.hypot(u, v);
          if (r > 0.85) return 'n';
          const turn = Math.atan2(v, u) / (2 * Math.PI);
          return Math.floor(r * 3 + turn + 1) % 2 ? 'o' : 'y';
        });
      });
    },
  },
  {
    title: 'Red panda on a branch',
    ...LARGE,
    draw: (c) => {
      // Misty sky between dark foliage at the top corners.
      c.fill((x, y) => (c.noise(x, y, 4, 3001) > 0.55 ? 'w' : 's'));
      oval(c, 2, 1, 12, 8, 0, 'd', 0.3, 3002);
      oval(c, 39, 3, 10, 9, 0, 'd', 0.3, 3003);
      oval(c, 2, 29, 9, 5, 0, 'd', 0.3, 3006);
      c.fill((x, y, now) => (now === 'd' && c.noise(x, y, 2, 3004) > 0.6 ? 'g' : undefined));
      c.curve(0, 22, 18, 19.5, 39, 23, 'e', 2.6, 2);
      c.fill((x, y, now) => (now === 'e' && c.at(x, y - 1) !== 'e' && hash(x, y, 3005) < 0.7 ? 'g' : undefined));
      outlined(c, 'c', () => {
        // The tail hangs in rust and brown rings below the branch.
        for (let i = 0; i < 9; i++) {
          const t = i / 8;
          const px = (1 - t) ** 2 * 24 + 2 * (1 - t) * t * 31 + t * t * 30;
          const py = (1 - t) ** 2 * 17 + 2 * (1 - t) * t * 20 + t * t * 28;
          oval(c, px, py, 2.4 - t * 0.5, 1.6, 0.2, i % 2 ? 'n' : 'o');
        }
        // The body: rust above, dark brown belly and legs, front paws over the branch.
        c.rect(13, 17, 14, 21, 'n');
        c.rect(20, 17, 21, 21, 'n');
        oval(c, 18.5, 14, 6.5, 5, 0, (u, v) => (v > 0.45 ? 'n' : u > 0.4 ? 'r' : 'o'));
        // The head: white ears and brows, white muzzle, dark eyes with red tear marks.
        oval(c, 10, 4.6, 1.8, 1.8, 0, (u, v) => (Math.hypot(u, v) < 0.5 ? 'n' : 'w'));
        oval(c, 17, 4.6, 1.8, 1.8, 0, (u, v) => (Math.hypot(u, v) < 0.5 ? 'n' : 'w'));
        oval(c, 13.5, 8.5, 5, 4, 0, 'o');
        oval(c, 13.5, 10.4, 2.4, 1.6, 0, 'w');
        oval(c, 11, 6.8, 1.2, 0.8, 0, 'w');
        oval(c, 16, 6.8, 1.2, 0.8, 0, 'w');
        c.put(11, 8, 'c');
        c.put(16, 8, 'c');
        c.put(11, 9, 'r');
        c.put(16, 9, 'r');
        c.put(13, 10, 'c');
      });
    },
  },
  {
    title: 'Tea glasses on a tray',
    ...LARGE,
    draw: (c) => {
      // A blue kilim with small yellow and orange crosses.
      c.fill((x, y) => {
        const sx = (x + (Math.floor(y / 5) % 2) * 3) % 6;
        const d = Math.abs(sx - 3) + Math.abs((y % 5) - 2);
        return d === 0 ? 'o' : d === 1 ? 'y' : c.noise(x, y, 5, 3101) > 0.65 ? 'p' : 'b';
      });
      outlined(c, 'c', () => {
        // A round silver tray, three tulip glasses of red tea on white saucers, sugar cubes.
        oval(c, 20, 21, 18, 7.5, 0, (u, v) => (Math.hypot(u, v) > 0.88 ? 'w' : 'e'));
        for (const [cx, base] of [[10, 22], [20, 25], [30, 22]] as const) {
          oval(c, cx, base, 4.4, 1.4, 0, (u, v) => (Math.hypot(u, v) > 0.7 ? 'r' : 'w'));
          c.fill((x, y) => {
            const top = base - 15;
            if (y < top || y > base - 1) return undefined;
            const t = (y - top) / 14;
            const w = 2.8 - Math.sin(t * Math.PI * 0.9) * 1.1 + (t > 0.7 ? (t - 0.7) * 3 : 0);
            const dx = Math.abs(x + 0.5 - cx);
            if (dx > w) return undefined;
            if (dx > w - 1 || y === top) return 'w';
            return y < top + 3 ? 'o' : 'r';
          });
        }
        for (const [x, y] of [[23, 15], [26, 16], [14, 17]] as const) c.rect(x, y, x + 1, y + 1, 'w');
      });
    },
  },
  {
    title: 'Farm in tulip fields',
    ...LARGE,
    draw: (c) => {
      c.fill(() => 's');
      cloud(c, 5, 2, 7, 3201);
      cloud(c, 33, 1, 6, 3202);
      land(c, 13, 1, 'd', 3203, 2);
      // The farm: a red barn with a white door and trim, a grey silo with a white dome, a dark tree.
      outlined(c, 'c', () => {
        c.poly([11, 15, 25, 15, 25, 9, 18, 4.5, 11, 9], 'r');
        c.line(11, 9, 18, 4, 'w');
        c.line(18, 4, 25, 9, 'w');
        c.rect(16, 11, 19, 15, 'w');
        c.line(16, 11, 19, 15, 'r');
        c.rect(27, 5, 30, 15, 'e');
        oval(c, 28.5, 5, 2, 1.6, 0, 'w');
        oval(c, 7, 10, 3.2, 3.6, 0, 'd', 0.3, 3204);
        c.line(7, 13, 7, 15, 'n');
      });
      // Rows of tulips fanning out from the farm, green between them.
      c.fill((x, y) => {
        if (y < 16 + Math.round((c.noise(x, y, 6, 3205) - 0.5) * 1.2)) return undefined;
        const t = (x + 0.5 - 20) / (y - 11) + (c.noise(x, y, 3, 3206) - 0.5) * 0.15;
        const k = Math.floor(t * 4 + 100);
        const f = t * 4 + 100 - k;
        if (f < 0.2) return 'g';
        return 'rykpo'[k % 5];
      });
      c.speckle('d', 'rykpo', 0.05, 3207);
    },
  },
  giraffe,
  bonsai,
  chameleon,
  flamingo,
  jellyfish,
  monkey,
  nest,
  crab,
  kingfisher,
  snake,
];
