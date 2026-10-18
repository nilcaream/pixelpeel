import { describe, expect, it } from 'vitest';
import { HUD_HEIGHT, measure } from './layout.ts';

const SHAPE = { width: 32, height: 24, buckets: 3, columns: 4, visible: 3 };

describe('the layout', () => {
  it('fits a phone screen, the picture first and the pots below the buckets', () => {
    const l = measure(390, 844, SHAPE);
    expect(l.cell).toBeGreaterThan(0);
    expect(l.columnsY).toBeGreaterThan(l.bucketY + l.bucketSize);
  });

  it('never gives a size below zero, even in a window shorter than the bar at the top', () => {
    // A window this short happens for a moment when the browser's device toolbar is switched on.
    for (const height of [0, 1, HUD_HEIGHT - 1, HUD_HEIGHT]) {
      const l = measure(390, height, SHAPE);
      for (const size of [l.inner, l.cell, l.bucketSize, l.potSize, l.potGap, l.columnWidth]) {
        expect(size, `height ${height}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
