import { describe, expect, it } from 'vitest';
import { judge, type DecidedOf } from './bake.ts';
import levelsFile from './levels.json';
import { ruleFor, type Level } from './levels.ts';
import { poolPicture } from './picture.ts';

const levels = levelsFile as unknown as Level[];
const judged = (number: number, decidedOf: DecidedOf) => {
  const l = levels.find((x) => x.number === number) as Level;
  return judge(poolPicture(l.rows), l.columns, l.structure.buckets, ruleFor(number), l.band, decidedOf);
};
const never: DecidedOf = () => {
  throw new Error('no decided points here');
};

describe('judge, the gates for new levels', () => {
  it('turns down a deal the random player wins too often, before any thinker plays', () => {
    // Level 2, medium: in its band on every other measure, while the random player wins 135 of 200.
    expect(judged(2, never)).toMatchObject({ fits: false, why: 'easier', gate: 'careless', thinkers: [] });
  }, 60_000);

  it('turns down a deal decided before the floor, measured last', () => {
    // Level 19, hard: in its band, on its hold-out games and under the careless cap.
    expect(judged(19, () => ({ decided: 0.8, line: 0.55 }))).toMatchObject({ fits: false, why: 'easier', gate: 'decided' });
  }, 120_000);

  it('takes an easy deal with no cap and no decided points, and keeps what the careless players won', () => {
    expect(judged(1, never)).toMatchObject({ fits: true, gates: { randomWins: 58, stickyWins: 160, decided: null, decidedLine: null } });
  }, 120_000);
});
