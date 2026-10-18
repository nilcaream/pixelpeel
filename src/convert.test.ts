import { describe, expect, it } from 'vitest';
import { decodePng, readPng } from '../scripts/png.ts';
import { assignColours, backgroundColour, cleanStrays, convert, fillClear, outline, type Image } from './convert.ts';
import { POOL, deltaE, hexToLab } from './palette.ts';

/** An image from rows of letters, each letter one colour; '.' is transparent. */
function image(rows: string[], colours: Record<string, [number, number, number]>): Image {
  const width = (rows[0] as string).length;
  const rgba = new Uint8Array(width * rows.length * 4);
  rows.forEach((row, y) =>
    [...row].forEach((c, x) => {
      const rgb = colours[c];
      if (rgb) rgba.set([...rgb, 255], (y * width + x) * 4);
    }),
  );
  return { width, height: rows.length, rgba };
}

const char = (name: string) => (POOL.find((c) => c.name === name) as { char: string }).char;

describe('convert', () => {
  it('keeps a flat picture as it is when shrinking by a whole factor, with clear squares for transparency', () => {
    const big = image(
      ['..RRRR..', '..RRRR..', 'GGGGGGGG', 'GGGGGGGG'],
      { R: [229, 57, 53], G: [67, 160, 71] },
    );
    expect(convert(big, { size: 4, colours: 4 })).toEqual([`.${char('red')}${char('red')}.`, char('green').repeat(4)]);
  });

  it('crops to the visible part and keeps its proportions', () => {
    const framed = image(['......', '.BBBB.', '.BBBB.', '......'], { B: [47, 111, 224] });
    expect(convert(framed, { size: 2, colours: 2 })).toEqual([char('blue').repeat(2)]);
  });

  it('gives two areas whose closest pool colour is the same two different pool colours', () => {
    const brown: [number, number, number] = [122, 74, 42];
    const light: [number, number, number] = [166, 100, 60];
    const pool = POOL.map((c) => hexToLab(c.hex));
    const nearest = (rgb: [number, number, number]) => {
      const lab = hexToLab(`#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`);
      return pool.reduce((best, q, i) => (deltaE(lab, q) < deltaE(lab, pool[best] as typeof q) ? i : best), 0);
    };
    expect(nearest(light)).toBe(nearest(brown));
    const muzzle = image(['NNNN', 'NLLN', 'NLLN', 'NNNN'], { N: brown, L: light });
    const rows = convert(muzzle, { size: 4, colours: 4 });
    const outer = (rows[0] as string)[0];
    const inner = (rows[1] as string)[1];
    expect(outer).toBe(char('brown'));
    expect(inner).not.toBe(outer);
  });

  it('uses no more colours than asked, joining the smallest areas into the closest kept ones', () => {
    const many = image(['RRRRRRRR', 'RRRRRRRR', 'GGGGGGBB', 'GGGGGGYY'], {
      R: [229, 57, 53], G: [67, 160, 71], B: [47, 111, 224], Y: [253, 216, 53],
    });
    const used = new Set(convert(many, { size: 8, colours: 2 }).join(''));
    expect(used.size).toBe(2);
  });

  it('cleans a lone stray square but keeps a feature two squares long, and one whose neighbours differ', () => {
    // 0 is the face, 1 a stray in it; 2 is an eye two squares wide; 3 an eye beside the edge.
    expect(cleanStrays([0, 0, 0, 0, 1, 0, 0, 0, 0], 3, 3)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const eye = [0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0];
    expect(cleanStrays(eye, 4, 3)).toEqual(eye);
    expect(cleanStrays([-1, -1, -1, 0, 3, -1, 0, 0, 0], 3, 3)[4]).toBe(3);
  });

  it('maps an edge blend to the area it is closest to', () => {
    const blend = { lab: hexToLab('#e04040'), count: 1 };
    const red = { lab: hexToLab('#e53935'), count: 500 };
    const green = { lab: hexToLab('#43a047'), count: 500 };
    const [b, r] = assignColours([blend, red, green], 2);
    expect(b).toBe(r);
  });

  it('fills a clear background with a pool colour the picture does not use', () => {
    const rows = ['.r.', 'rgr'];
    const bg = backgroundColour(rows);
    expect(['r', 'g', '.']).not.toContain(bg);
    expect(fillClear(rows, bg)).toEqual([`${bg}r${bg}`, 'rgr']);
  });

  it('rings a picture in one square of a colour, beside it but not across a corner, and inside its holes', () => {
    expect(outline(['r..', '...', 'g.g'], 'o')).toEqual([
      '.o...',
      'oro..',
      '.o.o.',
      'ogogo',
      '.o.o.',
    ]);
    expect(outline(['rrr', 'r.r', 'rrr'], 'o')).toEqual(['.ooo.', 'orrro', 'ororo', 'orrro', '.ooo.']);
  });
});

describe('readPng', () => {
  it('reads a palette PNG with transparency', () => {
    const parrot = readPng('levels/sources/kenney-animal-pack-redux/round/parrot.png');
    expect([parrot.width, parrot.height]).toEqual([129, 128]);
    expect(parrot.rgba[3]).toBe(0);
    const centre = (64 * parrot.width + 64) * 4;
    expect(parrot.rgba[centre + 3]).toBe(255);
  });

  it('refuses what is not a PNG', () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toThrow('not a PNG');
  });
});
