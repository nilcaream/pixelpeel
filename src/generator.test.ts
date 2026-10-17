import { describe, expect, it } from 'vitest';
import { createState, pick, status, tick, type Pot } from './engine.ts';
import { deal, measure, perturb, playRandom, replay, resume } from './generator.ts';
import { HOUSE, HOUSE_RULES } from './level.ts';
import { seededRng } from './rng.ts';

describe('deal', () => {
  it('deals the house so that playing its plan wins, for every seed tried', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rules = { ...HOUSE_RULES, seed };
      const d = deal(HOUSE, rules);
      expect(status(replay(HOUSE, d, rules.buckets)), `seed ${seed}`).toBe('won');
    }
  });

  it('deals exactly the pixels of each colour, no more and no fewer', () => {
    const d = deal(HOUSE, HOUSE_RULES);
    const dealt = HOUSE.palette.map(() => 0);
    for (const pot of d.columns.flat()) dealt[pot.colour] = (dealt[pot.colour] as number) + pot.count;
    const inPicture = HOUSE.palette.map((_, c) => HOUSE.cells.filter((x) => x === c).length);
    expect(dealt).toEqual(inPicture);
  });

  it('mixes the colours across the columns', () => {
    const d = deal(HOUSE, HOUSE_RULES);
    for (const column of d.columns) expect(new Set(column.map((p) => p.colour)).size).toBeGreaterThan(1);
  });

  it('deals the same pots for the same seed', () => {
    expect(deal(HOUSE, HOUSE_RULES)).toEqual(deal(HOUSE, HOUSE_RULES));
  });
});

describe('perturb', () => {
  const pots = [1, 2, 3, 4, 5, 6].map((count) => ({ colour: count % 2, count }));
  const order = (columns: Pot[][]) => {
    const out: number[] = [];
    for (let row = 0; columns.some((c) => c[row]); row++) for (const c of columns) if (c[row]) out.push(c[row].count);
    return out;
  };

  it('keeps the made order with no perturbing, and reverses it at full reverse', () => {
    expect(order(perturb(pots, 2, { spread: 0, reverse: 0, merge: 0 }, seededRng(1)))).toEqual([1, 2, 3, 4, 5, 6]);
    expect(order(perturb(pots, 2, { spread: 0, reverse: 2, merge: 0 }, seededRng(1)))).toEqual([6, 5, 4, 3, 2, 1]);
  });

  it('merges pots of one colour without losing a pixel', () => {
    const merged = perturb(pots, 3, { spread: 0, reverse: 0, merge: 1 }, seededRng(1)).flat();
    expect(merged.map((p) => p.count)).toEqual([9, 12]);
  });
});

describe('measure and resume', () => {
  const d = deal(HOUSE, HOUSE_RULES);
  const shuffled = perturb(d.columns.flat(), 4, { spread: 40, reverse: 1.5, merge: 0.3 }, seededRng(3));

  it('gives up early only where the full measure is outside the band too', () => {
    const full = measure(HOUSE, shuffled, 4, 60);
    for (const band of [[0.1, 0.35], [0.35, 0.65], [0.65, 0.9], [0.9, 1]] as const) {
      const quick = measure(HOUSE, shuffled, 4, 60, band);
      const share = full.wins / 60;
      const inside = share >= band[0] && (share < band[1] || band[1] === 1);
      expect(quick.outside === undefined, `band ${band}`).toBe(inside);
      if (inside) expect(quick.wins).toBe(full.wins);
    }
  });

  it('brings a game back to where its last pick left it', () => {
    const game = playRandom(HOUSE, shuffled, 4, 5);
    const some = game.picks.slice(0, 6);
    const resumed = resume(HOUSE, shuffled, 4, some);
    let s = createState(HOUSE, shuffled, 4);
    for (const p of some) {
      while (s.ticks < p.tick) s = tick(s);
      s = pick(s, p.column);
    }
    expect(resumed).toEqual(s);
    expect(resumed.ticks).toBe((some.at(-1) as { tick: number }).tick);
  });
});
