import { describe, expect, it } from 'vitest';
import { FOOTER_HEIGHT, HEADER_HEIGHT, measure } from './layout.ts';

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
