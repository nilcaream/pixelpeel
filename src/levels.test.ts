import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makePots, measure, perturb, replay } from './generator.ts';
import levelsFile from './levels.json';
import { GAUGE, PLAYOUTS, bandFor, bandOf, capFor, levelId, structureFor, type Level } from './levels.ts';
import { CLEAR, MAX_COLOURS, POOL } from './palette.ts';
import { poolPicture } from './picture.ts';
import { seededRng } from './rng.ts';
import { status } from './rules.ts';

const levels = levelsFile as unknown as Level[];

describe('the baked levels', () => {
  it('are levels 1 to 30, in order', () => {
    expect(levels.map((l) => l.number)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it.each(levels.map((l) => [l.number, l] as const))('level %i can be won: its winning order replays to a win', (_, l) => {
    const picture = poolPicture(l.rows);
    const end = replay(picture, l.columns, l.structure.buckets, l.winningOrder);
    expect(status(end)).toBe('won');
  });

  it.each(levels.map((l) => [l.number, l] as const))('level %i sits on its wave and its measured share is in its band', (_, l) => {
    expect(l.band).toBe(bandFor(l.number));
    expect(l.playouts).toBe(PLAYOUTS);
    expect(l.winShare).toBe(l.wins / l.playouts);
    expect(bandOf(l.winShare, l.number)).toBe(l.band);
    expect(l.winShare).toBeLessThan(capFor(l.number));
    expect(l.structure).toEqual(structureFor(l.number));
  });

  it.each(levels.map((l) => [l.number, l] as const))('level %i is ringed in one colour wherever it meets the empty background', (_, l) => {
    const at = (x: number, y: number) => l.rows[y]?.[x] ?? CLEAR;
    const touching = new Set<string>();
    l.rows.forEach((r, y) =>
      [...r].forEach((c, x) => {
        if (c !== CLEAR && [at(x, y - 1), at(x - 1, y), at(x + 1, y), at(x, y + 1)].includes(CLEAR)) touching.add(c);
      }),
    );
    // Outside the frame counts as empty too, so a solid background is the one colour there instead.
    expect([...touching]).toHaveLength(1);
  });

  it.each(levels.map((l) => [l.number, l] as const))('level %i is drawn in distinct pool colours at its size', (_, l) => {
    const chars = new Set(l.rows.join(''));
    chars.delete(CLEAR);
    for (const c of chars) expect(POOL.some((p) => p.char === c), `'${c}'`).toBe(true);
    expect(chars.size).toBeLessThanOrEqual(Math.min(l.structure.colours, MAX_COLOURS));
    expect(Math.max(l.rows.length, (l.rows[0] as string).length)).toBe(l.structure.size);
  });

  it.each(levels.map((l) => [l.number, l] as const))('level %i deals every pixel once, as its seed and knobs make it', (_, l) => {
    const picture = poolPicture(l.rows);
    const dealt = picture.palette.map(() => 0);
    for (const pot of l.columns.flat()) dealt[pot.colour] = (dealt[pot.colour] as number) + pot.count;
    expect(dealt).toEqual(picture.palette.map((_, c) => picture.cells.filter((x) => x === c).length));
    const rng = seededRng(l.seed);
    const pots = makePots(picture, { ...l.structure, seed: l.seed }, rng);
    expect(perturb(pots, l.structure.columns, l.knobs, rng)).toEqual(l.columns);
    expect(l.id).toBe(levelId(l.rows, l.columns, l.structure.buckets));
  });

  it.each(levels.map((l) => [l.number, l] as const))('level %i names a CC0 source that is in the repo', (_, l) => {
    expect(existsSync(l.source.file)).toBe(true);
    expect(l.source.licence).toBe('CC0 1.0');
    expect(l.source.page).toMatch(/^https:\/\//);
  });

  it('brings the first ten pictures back in levels 21 to 30, larger and with more colours', () => {
    const first = new Set(levels.slice(0, 10).map((l) => l.source.file));
    const third = new Set(levels.slice(20, 30).map((l) => l.source.file));
    expect(third).toEqual(first);
    expect(new Set(levels.slice(0, 20).map((l) => l.source.file)).size).toBe(20);
  });

  it('measures the very hard levels again to exactly the stored share', () => {
    for (const l of levels.filter((x) => x.band === 'very hard')) {
      const m = measure(poolPicture(l.rows), l.columns, l.structure.buckets, l.playouts, GAUGE);
      expect(m.wins, `level ${l.number}`).toBe(l.wins);
    }
  }, 30_000);
});
