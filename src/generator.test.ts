import { describe, expect, it } from 'vitest';
import { status } from './engine';
import { deal, replay } from './generator';
import { HOUSE, HOUSE_RULES } from './level';

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
