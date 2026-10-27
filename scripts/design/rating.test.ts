import { describe, expect, it } from 'vitest';
import levelsFile from '../../src/levels.json' with { type: 'json' };
import type { Level } from '../../src/levels.ts';
import { poolPicture } from '../../src/picture.ts';
import { Budgeted, sample } from './rating.ts';
import { explore, Game, gameOf, solve } from './tree.ts';

// A ring of yellow and blue round a core of red and green, 2 buckets: 84 positions, the random player wins 18.5%
// and the sensible one 66.7%, a sensible loss goes on 2 picks after its fatal pick, and the core is decided early.
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

describe('sampled games', () => {
  it('measure what the whole tree measures, within sampling error', async () => {
    const game = new Game(picture, columns, 2);
    const exact = solve(game, await explore(game));
    const solver = new Budgeted(game);
    for (const who of ['U', 'S'] as const) {
      const e = exact.per[who];
      const s = sample(game, solver, who, 3000);
      if (!e) throw new Error(`no ${who}`);
      expect(s.win).toBeCloseTo(e.win, 1);
      expect(s.trapsPerGame).toBeCloseTo(e.trapsPerGame, 1);
      expect(s.fallChance).toBeCloseTo(e.fallChance, 1);
      expect(s.deadEndMean).toBeCloseTo(e.deadEndMean, 1);
      expect(s.decidedMean).toBeCloseTo(e.decided.mean, 1);
      expect(s.freeShare[1]).toBeCloseTo(e.freeShare[1] as number, 1);
      expect(s.inRunsShare).toBeCloseTo(e.inRunsShare, 1);
      expect(s.unknownPerGame).toBe(0);
    }
  });

  it('give up a search that runs out of calls, and keep what it decided', () => {
    const game = gameOf((levelsFile as unknown as Level[]).find((l) => l.number === 2) as Level);
    const solver = new Budgeted(game);
    expect(solver.within(10, () => solver.allWin(game.start()))).toBeNull();
    expect(solver.within(Infinity, () => solver.winnable(game.start()))).toBe(true);
  });
});
