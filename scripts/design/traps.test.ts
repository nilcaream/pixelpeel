import { describe, expect, it } from 'vitest';
import { poolPicture } from '../../src/picture.ts';
import { traps } from './traps.ts';
import { explore, Game, solve } from './tree.ts';

// The fixture of rating.test.ts: a ring of yellow and blue round a core of red and green, 2 buckets, 84 positions.
const picture = poolPicture(['bbyby', 'bgrgy', 'yrgrb', 'bggrb', 'yyybb']);
const columns = [
  [
    { colour: 2, count: 2 },
    { colour: 3, count: 3 },
    { colour: 1, count: 3 },
    { colour: 3, count: 2 },
  ],
  [
    { colour: 0, count: 2 },
    { colour: 1, count: 3 },
    { colour: 3, count: 4 },
  ],
  [
    { colour: 0, count: 2 },
    { colour: 1, count: 1 },
    { colour: 2, count: 3 },
  ],
];

describe('traps', () => {
  it('lists the positions whose chance adds up to the traps a sensible game meets, each with a winning and a losing pick', async () => {
    const game = new Game(picture, columns, 2);
    const t = await explore(game);
    const found = traps(game, t);
    expect(found.length).toBeGreaterThan(0);
    expect(found.reduce((s, x) => s + x.reach, 0)).toBeCloseTo(solve(game, t).per.S?.trapsPerGame as number, 9);
    for (const trap of found) {
      const chosen = trap.columns.filter((c) => c.chosen);
      expect(chosen.some((c) => c.wins)).toBe(true);
      expect(chosen.some((c) => !c.wins)).toBe(true);
    }
  });
});
