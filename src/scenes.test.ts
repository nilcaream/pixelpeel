import { describe, expect, it } from 'vitest';
import { CLEAR, MAX_COLOURS, POOL } from './palette.ts';
import { LARGE, SCENE_HEIGHT, SCENE_WIDTH, SCENES, edgeColours, sceneRows } from './scenes.ts';

describe('the scenes', () => {
  it.each(SCENES.map((s) => [s.title, s] as const))('%s fills its whole rectangle in pool colours, at most MAX_COLOURS of them', (_, s) => {
    const rows = sceneRows(s, 1);
    expect(rows).toHaveLength(s.height ?? SCENE_HEIGHT);
    for (const r of rows) expect(r).toHaveLength(s.width ?? SCENE_WIDTH);
    const chars = new Set(rows.join(''));
    expect(chars.has(CLEAR)).toBe(false);
    for (const c of chars) expect(POOL.some((p) => p.char === c), `'${c}'`).toBe(true);
    expect(chars.size).toBeLessThanOrEqual(MAX_COLOURS);
  });

  it.each(SCENES.map((s) => [s.title, s] as const))('%s has at least three colours on its edge, so no one colour is the only way in', (_, s) => {
    expect(edgeColours(sceneRows(s, 1)).size).toBeGreaterThanOrEqual(3);
  });

  it('draws the first twenty scenes at 32 × 24 and every later one larger', () => {
    for (const s of SCENES.slice(0, 20)) expect([s.width, s.height]).toEqual([undefined, undefined]);
    for (const s of SCENES.slice(20)) expect([s.width, s.height], s.title).toEqual([LARGE.width, LARGE.height]);
    expect(sceneRows(SCENES[20] as (typeof SCENES)[number], 1)[0]).toHaveLength(LARGE.width);
  });

  it('draws a scene the same for the same seed', () => {
    const s = SCENES[0] as (typeof SCENES)[number];
    expect(sceneRows(s, 2)).toEqual(sceneRows(s, 2));
  });

  it('counts the colours on the border only', () => {
    expect([...edgeColours(['sss', 'srs', 'sgs'])].sort()).toEqual(['g', 's']);
  });
});
