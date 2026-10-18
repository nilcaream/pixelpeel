import { describe, expect, it } from 'vitest';
import { autopilotPick, onAutopilot } from './autopilot.ts';
import { parsePicture } from './picture.ts';
import { createBoard, pick, type Pot } from './rules.ts';
import { createScene, place } from './scene.ts';

const A: Pot = { colour: 0, count: 1 };

// Red shut in by yellow, so a red pot stays in its bucket.
function boardOf(columns: Pot[][], buckets = 1) {
  return createBoard(parsePicture(['BBB', 'BAB', 'BBB'], { A: '#ff0000', B: '#ffff00' }), columns, buckets);
}

describe('the autopilot', () => {
  it('leaves the choice to the player while two columns hold pots', () => {
    expect(onAutopilot(boardOf([[A], [A]]))).toBe(false);
  });

  it('takes over when one column is left, since its pots can only go in one order', () => {
    expect(onAutopilot(boardOf([[], [A, A], []]))).toBe(true);
  });

  it('takes over when no pots are left, to bring the last dots home', () => {
    expect(onAutopilot(boardOf([[], []]))).toBe(true);
  });

  it('picks the column that is left as soon as a bucket is free, and waits while none is', () => {
    const b = boardOf([[], [A, A]]);
    expect(autopilotPick(b, createScene(b))).toBe(1);
    const r = pick(b, 1);
    if (!r) throw new Error('no pick');
    expect(autopilotPick(r.board, place(createScene(b), r.pot, r.lifts))).toBe(-1);
  });

  it('picks nothing for the player while there is still a choice', () => {
    const b = boardOf([[A], [A]]);
    expect(autopilotPick(b, createScene(b))).toBe(-1);
  });
});
