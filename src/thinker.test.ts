import { describe, expect, it } from 'vitest';
import { replay } from './generator.ts';
import { poolPicture } from './picture.ts';
import { status, type Pot } from './rules.ts';
import { solve, thinkerShare } from './thinker.ts';

// A red middle inside a yellow ring: only yellow is reachable at the start, and two buckets.
const ringed = poolPicture(['yyyyy', 'yrrry', 'yyyyy']);
const r = (count: number): Pot => ({ colour: 0, count });
const y = (count: number): Pot => ({ colour: 1, count });

describe('a thinker', () => {
  // Both tops are red and shut in; the only yellow is hidden under the left one. Column 0 twice wins.
  const blind = [[r(1), y(12)], [r(1), r(1)]];

  it('guesses when the pick that decides the game is hidden, and wins when it can see it', () => {
    expect(ringed.palette).toEqual(['#e53935', '#fdd835']);
    const seeing = thinkerShare(ringed, blind, 2, 20, { sight: 2, depth: 2 });
    const blinded = thinkerShare(ringed, blind, 2, 20, { sight: 1, depth: 2 });
    expect(seeing).toBe(1);
    expect(blinded).toBeGreaterThan(0.1);
    expect(blinded).toBeLessThan(0.9);
  });

  it('plans: one pick ahead it does not find the yellow, two picks ahead it does', () => {
    expect(thinkerShare(ringed, blind, 2, 20, { sight: 2, depth: 2 })).toBe(1);
    expect(thinkerShare(ringed, blind, 2, 20, { sight: 2, depth: 1 })).toBeLessThan(1);
  });
});

describe('the solver', () => {
  it('finds the winning picks of a deal that can be won', () => {
    const solved = solve(ringed, [[r(1), y(12)], [r(1), r(1)]], 2);
    expect(solved.result).toBe('win');
    if (solved.result !== 'win') return;
    expect(status(replay(ringed, [[r(1), y(12)], [r(1), r(1)]], 2, solved.picks))).toBe('won');
  });

  it('says a deal is lost when every order fills the buckets before the yellow comes', () => {
    expect(solve(ringed, [[r(1), r(1), y(12)], [r(1)]], 2).result).toBe('lose');
  });
});
