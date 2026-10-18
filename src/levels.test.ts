import { describe, expect, it } from 'vitest';
import { dealFor } from './bake.ts';
import { measure, replay } from './generator.ts';
import levelsFile from './levels.json';
import { BANDS, CASUAL_GAMES, MAX_LUCK, bandFor, casualFit, levelId, thinkerFit, type Level } from './levels.ts';
import { poolPicture } from './picture.ts';
import { status } from './rules.ts';
import { SCENES, sceneRows } from './scenes.ts';

const levels = levelsFile as unknown as Level[];
const each = levels.map((l) => [l.number, l] as const);

describe('the bands', () => {
  it('stop easy at 0.98 of casual games, so no level is won by every one', () => {
    expect(casualFit('easy', 0.98)).toBe('in');
    expect(casualFit('easy', 0.985)).toBe('easier');
    expect(casualFit('medium', 0.45)).toBe('harder');
  });

  it('give the depth a thinker needs, or say which way the deal is off', () => {
    expect(thinkerFit('easy', [0.95])).toBe(1);
    expect(thinkerFit('easy', [0.5])).toBe('harder');
    expect(thinkerFit('hard', [0.7])).toBe('easier');
    expect(thinkerFit('hard', [0.5, 0.95])).toBe(2);
    expect(thinkerFit('very hard', [0.3, 0.7])).toBe('easier');
    expect(thinkerFit('very hard', [0.3, 0.5, 0.8])).toBe('harder');
    expect(thinkerFit('very hard', [0.3, 0.5, 0.85])).toBe(3);
  });
});

describe('the scene levels', () => {
  it('are one per scene, in order, on their waves', () => {
    expect(levels.map((l) => l.number)).toEqual(SCENES.map((_, i) => i + 1));
    for (const l of levels) {
      expect(l.band).toBe(bandFor(l.number));
      expect(l.title).toBe(SCENES[l.number - 1]?.title);
    }
  });

  it.each(each)('level %i is its scene, dealt as its seed and strength make it', (_, l) => {
    expect(l.rows).toEqual(sceneRows(SCENES[l.number - 1] as (typeof SCENES)[number], l.sceneSeed));
    const deal = dealFor(poolPicture(l.rows), l.structure, l.seed, l.strength);
    expect(deal.columns).toEqual(l.columns);
    expect(deal.knobs).toEqual(l.knobs);
    expect(l.id).toBe(levelId(l.rows, l.columns, l.structure.buckets));
  });

  it.each(each)('level %i can be won: its winning order replays to a win', (_, l) => {
    expect(status(replay(poolPicture(l.rows), l.columns, l.structure.buckets, l.winningOrder))).toBe('won');
  });

  it.each(each)('level %i is in its band, at its depth, with no more luck than allowed', (_, l) => {
    expect(casualFit(l.band, l.casualWins / CASUAL_GAMES)).toBe('in');
    expect(thinkerFit(l.band, l.thinkers)).toBe(l.depth);
    expect(l.depth).toBeGreaterThanOrEqual(BANDS[l.band].depth[0]);
    expect(l.depth).toBeLessThanOrEqual(BANDS[l.band].depth[1]);
    expect(l.luck).toBeLessThanOrEqual(MAX_LUCK);
    expect(l.luck).toBe(Math.round(Math.max(0, l.fullSight - Math.max(...l.thinkers)) * 100) / 100);
  });

  it('measures the very hard level again to exactly the stored casual share', () => {
    for (const l of levels.filter((x) => x.band === 'very hard')) {
      const m = measure(poolPicture(l.rows), l.columns, l.structure.buckets, CASUAL_GAMES, 'sensible');
      expect(m.wins, `level ${l.number}`).toBe(l.casualWins);
    }
  }, 30_000);
});
