import { describe, expect, it } from 'vitest';
import levelsFile from './levels.json';
import { EXTENDED, MAX_BLUE_GREENS, MIN_DELTA_E, PAGE, POOL, blueGreensOf, checkOverrides, deltaE, hexToLab, paint, type Overrides } from './palette.ts';
import { SCENES, sceneRows } from './scenes.ts';

const ALL = [...POOL, ...EXTENDED];

describe('the blue-green cap, on the colours a picture is painted in', () => {
  const levels = levelsFile as { number: number; title: string; rows: string[]; overrides?: Overrides }[];
  it.each(levels.map((l) => [l.number, l.title, l] as const))('level %i (%s) holds at most four blue-greens', (_, __, l) => {
    const painted = blueGreensOf(paint(l.rows, l.overrides));
    expect(painted.length, painted.join('')).toBeLessThanOrEqual(MAX_BLUE_GREENS);
  });

  it.each(SCENES.map((s) => [s.title, s] as const))('the scene %s holds at most four blue-greens', (_, s) => {
    const painted = blueGreensOf(paint(sceneRows(s, s.deal?.sceneSeed ?? 1), s.overrides));
    expect(painted.length, painted.join('')).toBeLessThanOrEqual(MAX_BLUE_GREENS);
  });

  it.each(SCENES.map((s) => [s.title, s] as const))('the scene %s has overrides that fit it', (_, s) => {
    checkOverrides(sceneRows(s, s.deal?.sceneSeed ?? 1), s.overrides);
  });

  it('counts each blue-green once, and nothing else', () => {
    expect(blueGreensOf(['ggdd', 'srwb', 'vtyy'])).toEqual(['g', 'd', 's', 't', 'b', 'v']);
    expect(blueGreensOf(['roy.'])).toEqual([]);
  });
});

describe('palette', () => {
  it('computes CIEDE2000 as the published test pairs give it', () => {
    // Sharma, Wu and Dalal (2005), table 1, pairs 1, 7, 17 and 25.
    expect(deltaE([50, 2.6772, -79.7751], [50, 0, -82.7485])).toBeCloseTo(2.0425, 4);
    expect(deltaE([50, 0, 0], [50, -1, 2])).toBeCloseTo(2.3669, 4);
    expect(deltaE([50, 2.5, 0], [73, 25, -18])).toBeCloseTo(27.1492, 4);
    expect(deltaE([60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387])).toBeCloseTo(1.2644, 4);
  });

  it('keeps every two colours of the pool and the extended colours clearly apart', () => {
    for (const a of ALL)
      for (const b of ALL) {
        if (a === b) continue;
        expect(deltaE(hexToLab(a.hex), hexToLab(b.hex)), `${a.name} vs ${b.name}`).toBeGreaterThanOrEqual(MIN_DELTA_E);
      }
  });

  it('keeps every colour clearly apart from the page, which is what an emptied square looks like', () => {
    for (const c of ALL) expect(deltaE(hexToLab(c.hex), hexToLab(PAGE)), c.name).toBeGreaterThanOrEqual(MIN_DELTA_E);
  });

  it('gives every colour its own name and letter', () => {
    expect(new Set(ALL.map((c) => c.char)).size).toBe(ALL.length);
    expect(new Set(ALL.map((c) => c.name)).size).toBe(ALL.length);
  });

  it('paints a picture in its overrides, and takes only overrides that fit it', () => {
    expect(paint(['sbc', 'ss.'], { s: 't', c: 'v' })).toEqual(['tbv', 'tt.']);
    expect(() => checkOverrides(['sbc'], { s: 't', c: 'v' })).not.toThrow();
    expect(() => checkOverrides(['sbc'], { s: 'r' })).not.toThrow();
    expect(() => checkOverrides(['sbc'], { r: 't' })).toThrow('not a default colour of the picture');
    expect(() => checkOverrides(['sbc'], { t: 'v' })).toThrow('not a default colour of the picture');
    expect(() => checkOverrides(['sbc'], { s: 'b' })).toThrow('nor a default one the picture does not use');
    expect(() => checkOverrides(['sbc'], { s: 'x' })).toThrow('nor a default one the picture does not use');
    expect(() => checkOverrides(['sbc'], { s: 't', c: 't' })).toThrow('two colours painted alike');
  });
});
