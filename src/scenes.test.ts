import { describe, expect, it } from 'vitest';
import { CLEAR, MAX_COLOURS, POOL } from './palette.ts';
import { SCENE_HEIGHT, SCENE_WIDTH, SCENES, edgeColours, sceneRows } from './scenes.ts';

describe('the scenes', () => {
  it.each(SCENES.map((s) => [s.title, s] as const))('%s fills its whole rectangle in pool colours, at most MAX_COLOURS of them', (_, s) => {
    const rows = sceneRows(s, 1);
    expect(rows).toHaveLength(SCENE_HEIGHT);
    for (const r of rows) expect(r).toHaveLength(SCENE_WIDTH);
    const chars = new Set(rows.join(''));
    expect(chars.has(CLEAR)).toBe(false);
    for (const c of chars) expect(POOL.some((p) => p.char === c), `'${c}'`).toBe(true);
    expect(chars.size).toBeLessThanOrEqual(MAX_COLOURS);
  });

  it.each(SCENES.map((s) => [s.title, s] as const))('%s has at least three colours on its edge, so no one colour is the only way in', (_, s) => {
    expect(edgeColours(sceneRows(s, 1)).size).toBeGreaterThanOrEqual(3);
  });

  it('draws a scene the same for the same seed', () => {
    const s = SCENES[0] as (typeof SCENES)[number];
    expect(sceneRows(s, 2)).toEqual(sceneRows(s, 2));
  });

  it('counts the colours on the border only', () => {
    expect([...edgeColours(['sss', 'srs', 'sgs'])].sort()).toEqual(['g', 's']);
  });
});
