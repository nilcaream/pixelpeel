import { describe, expect, it } from 'vitest';
import { autopilotPick, onAutopilot } from './autopilot.ts';
import { createState, pick, type Pot } from './engine.ts';
import { parsePicture } from './picture.ts';

const A: Pot = { colour: 0, count: 1 };

function stateOf(columns: Pot[][], buckets = 1) {
  return createState(parsePicture(['AAAA'], { A: '#ff0000' }), columns, buckets);
}

describe('the autopilot', () => {
  it('leaves the choice to the player while two columns hold pots', () => {
    expect(onAutopilot(stateOf([[A], [A]]))).toBe(false);
  });

  it('takes over when one column is left, since its pots can only go in one order', () => {
    expect(onAutopilot(stateOf([[], [A, A], []]))).toBe(true);
  });

  it('takes over when no pots are left, to bring the last dots home', () => {
    expect(onAutopilot(stateOf([[], []]))).toBe(true);
  });

  it('picks the column that is left as soon as a bucket is free, and waits while none is', () => {
    const s = stateOf([[], [A, A]]);
    expect(autopilotPick(s)).toBe(1);
    expect(autopilotPick(pick(s, 1))).toBe(-1);
  });

  it('picks nothing for the player while there is still a choice', () => {
    expect(autopilotPick(stateOf([[A], [A]]))).toBe(-1);
  });
});
