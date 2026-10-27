import { describe, expect, it } from 'vitest';
import { deal, measure, perturb, play, replay } from './generator.ts';
import { HOUSE, HOUSE_RULES } from './level.ts';
import { seededRng } from './rng.ts';
import { reachable, status, type Pot } from './rules.ts';

describe('deal', () => {
  it('deals the house so that playing its plan wins, for every seed tried', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const rules = { ...HOUSE_RULES, seed };
      const d = deal(HOUSE, rules);
      expect(status(replay(HOUSE, d.columns, rules.buckets, d.plan)), `seed ${seed}`).toBe('won');
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
    for (let row = 0; columns.some((c) => c[row]); row++) for (const c of columns) {
        const pot = c[row];
        if (pot) out.push(pot.count);
      }
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

describe('players and measure', () => {
  const d = deal(HOUSE, HOUSE_RULES);
  const shuffled = perturb(d.columns.flat(), 4, { spread: 40, reverse: 1.5, merge: 0.3 }, seededRng(3));

  /** For each pick of a game: whether its pot could reach a pixel, and whether any top pot could. */
  const choices = (picks: number[]) =>
    picks.map((column, i) => {
      const b = replay(HOUSE, shuffled, 4, picks.slice(0, i));
      const free = reachable(b);
      const reaches = (c: number) => ((free[(b.columns[c] as Pot[])[0]?.colour ?? -1] ?? 0) as number) > 0;
      return { reaches: reaches(column), any: b.columns.some((_, c) => reaches(c)) };
    });

  it('has the sensible player pick a shut-in pot only when every top pot is shut in', () => {
    for (let seed = 1; seed <= 20; seed++)
      for (const c of choices(play(HOUSE, shuffled, 4, seed, 'sensible').picks)) expect(c.reaches || !c.any).toBe(true);
  });

  it('has the sticky player pick its last column again whenever that column reaches, and play sensibly otherwise', () => {
    let kept = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const picks = play(HOUSE, shuffled, 4, seed, 'sticky').picks;
      const c = choices(picks);
      picks.forEach((column, i) => {
        expect(c[i]?.reaches || !c[i]?.any).toBe(true);
        const last = picks[i - 1];
        if (last === undefined) return;
        const b = replay(HOUSE, shuffled, 4, picks.slice(0, i));
        const top = (b.columns[last] as Pot[])[0];
        if (top && (reachable(b)[top.colour] as number) > 0) {
          expect(column, `seed ${seed} pick ${i}`).toBe(last);
          kept += 1;
        }
      });
    }
    expect(kept).toBeGreaterThan(0);
  });

  it('has the random player pick shut-in pots while others could reach', () => {
    const all = Array.from({ length: 20 }, (_, i) => choices(play(HOUSE, shuffled, 4, i + 1, 'random').picks)).flat();
    expect(all.some((c) => !c.reaches && c.any)).toBe(true);
  });

  it('gives up early only where the full measure is outside the band too', () => {
    const full = measure(HOUSE, shuffled, 4, 60, 'random');
    for (const band of [[0.02, 0.2], [0.2, 0.6], [0.6, 0.8], [0.8, 0.98]] as const) {
      const quick = measure(HOUSE, shuffled, 4, 60, 'random', band);
      const share = full.wins / 60;
      const inside = share >= band[0] && share < band[1];
      expect(quick.outside === undefined, `band ${band}`).toBe(inside);
      if (inside) expect(quick.wins).toBe(full.wins);
    }
  });

  it('replays a game to the same end', () => {
    const game = play(HOUSE, shuffled, 4, 5, 'random');
    expect(status(replay(HOUSE, shuffled, 4, game.picks))).toBe(game.won ? 'won' : 'stuck');
  });
});
