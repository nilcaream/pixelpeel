import { describe, expect, it } from 'vitest';
import { MAX_COLOURS, MIN_DELTA_E, PAGE, POOL, deltaE, hexToLab } from './palette.ts';

describe('palette', () => {
  it('computes CIEDE2000 as the published test pairs give it', () => {
    // Sharma, Wu and Dalal (2005), table 1, pairs 1, 7, 17 and 25.
    expect(deltaE([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
    expect(deltaE([50, 0, 0], [50, -1, 2])).toBeCloseTo(2.3669, 4);
    expect(deltaE([50, 2.5, 0], [73, 25, -18])).toBeCloseTo(27.1492, 4);
    expect(deltaE([60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387])).toBeCloseTo(1.2644, 4);
  });

  it('keeps every two colours of the pool clearly apart', () => {
    for (const a of POOL)
      for (const b of POOL) {
        if (a === b) continue;
        expect(deltaE(hexToLab(a.hex), hexToLab(b.hex)), `${a.name} vs ${b.name}`).toBeGreaterThanOrEqual(MIN_DELTA_E);
      }
  });

  it('keeps every colour clearly apart from the page, which is what an emptied square looks like', () => {
    for (const c of POOL) expect(deltaE(hexToLab(c.hex), hexToLab(PAGE)), c.name).toBeGreaterThanOrEqual(MIN_DELTA_E);
  });

  it('gives every colour its own name and letter, and has room for a full level', () => {
    expect(new Set(POOL.map((c) => c.char)).size).toBe(POOL.length);
    expect(new Set(POOL.map((c) => c.name)).size).toBe(POOL.length);
    expect(POOL.length).toBeGreaterThanOrEqual(MAX_COLOURS);
  });
});
