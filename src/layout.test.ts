import { describe, expect, it } from 'vitest';
import { FOOTER_HEIGHT, HEADER_HEIGHT, measure, nameFontSize, toCanvas } from './layout.ts';
import levelsFile from './levels.json';

const LEVELS = levelsFile as { title: string }[];

const SHAPE = { width: 32, height: 24, buckets: 3, columns: 4, visible: 3 };

describe('the layout', () => {
  it('fits a phone screen, the picture first and the pots below the buckets', () => {
    const l = measure(390, 844, SHAPE);
    expect(l.cell).toBeGreaterThan(0);
    expect(l.columnsY).toBeGreaterThan(l.bucketY + l.bucketSize);
  });

  it('centres the column between the header and the footer in the height a tall phone has to spare', () => {
    const l = measure(360, 780, SHAPE);
    const bottom = l.columnsY + SHAPE.visible * (l.potSize + l.potGap) + l.inner * 0.04;
    const above = l.top - l.inner * 0.04 - HEADER_HEIGHT;
    const below = 780 - FOOTER_HEIGHT - bottom;
    expect(above).toBeGreaterThan(0);
    expect(above).toBeCloseTo(below, 6);
  });

  it('keeps the column clear of the footer when the height is short', () => {
    const l = measure(390, 500, SHAPE);
    const bottom = l.columnsY + SHAPE.visible * (l.potSize + l.potGap) + l.inner * 0.04;
    expect(bottom).toBeLessThanOrEqual(500 - FOOTER_HEIGHT + 1e-6);
  });

  it('never gives a size below zero, even in a window shorter than the bars', () => {
    // A window this short happens for a moment when the browser's device toolbar is switched on.
    for (const height of [0, 1, HEADER_HEIGHT - 1, HEADER_HEIGHT, HEADER_HEIGHT + FOOTER_HEIGHT - 1]) {
      const l = measure(390, height, SHAPE);
      for (const size of [l.inner, l.cell, l.bucketSize, l.potSize, l.potGap, l.columnWidth]) {
        expect(size, `height ${height}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('a tap on the canvas', () => {
  // A top pot's centre at 412 × 915, as the game lays it out (level 21's shape).
  const SIZE = { width: 412, height: 915 };
  const POT = { x: 63.9, y: 592.7 };

  it('lands on the point it was drawn at when the canvas fills the window', () => {
    const p = toCanvas(POT.x, POT.y, { left: 0, top: 0, ...SIZE }, SIZE);
    expect(p.x).toBeCloseTo(POT.x, 6);
    expect(p.y).toBeCloseTo(POT.y, 6);
  });

  it('lands on the pot where it is seen when the canvas box is taller than the size it was drawn at', () => {
    // A box 48 px taller (a navigation bar) shows the picture stretched: the pot is seen 31 px lower.
    const box = { left: 0, top: 0, width: 412, height: 963 };
    const seen = (POT.y * box.height) / SIZE.height;
    expect(seen - POT.y).toBeGreaterThan(30);
    const p = toCanvas(POT.x, seen, box, SIZE);
    expect(p.y).toBeCloseTo(POT.y, 6);
  });

  it('lands on the pot where it is seen when the canvas box starts below the top of the window', () => {
    const p = toCanvas(POT.x + 5, POT.y + 24, { left: 5, top: 24, ...SIZE }, SIZE);
    expect(p.x).toBeCloseTo(POT.x, 6);
    expect(p.y).toBeCloseTo(POT.y, 6);
  });

  it('is the top-left corner for a box of no size', () => {
    expect(toCanvas(10, 10, { left: 0, top: 0, width: 0, height: 0 }, SIZE)).toEqual({ x: 0, y: 0 });
  });
});

describe("the level name's size", () => {
  it('stays at 12 px when the name fits, as every name up to 27 letters does at 360', () => {
    expect(nameFontSize(360, 'Mountain lake at sunset'.length)).toBe(12);
    expect(nameFontSize(360, 27)).toBe(12);
  });

  it('shrinks a longer name to whole pixels so it fits between the gutters', () => {
    // Longer than any level's name now is: the size still steps down for one.
    const chars = 'Space station over a ringed planet'.length;
    for (const width of [360, 390, 412, 430]) {
      const size = nameFontSize(width, chars);
      expect(size, `width ${width}`).toBe(Math.floor(size));
      expect(size * chars, `width ${width}`).toBeLessThanOrEqual(width - 32);
    }
    expect(nameFontSize(360, chars)).toBe(9);
  });

  it("keeps every level's name at 12 px on a 360 px page", () => {
    for (const level of LEVELS) {
      expect(nameFontSize(360, level.title.length), level.title).toBe(12);
    }
  });

  it('is never below zero, for a page narrower than its gutters or an empty name', () => {
    expect(nameFontSize(10, 5)).toBe(0);
    expect(nameFontSize(360, 0)).toBe(12);
  });
});
