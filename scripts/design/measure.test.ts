import { describe, expect, it } from 'vitest';
import { measure, rounds } from './measure.ts';

describe('rounds', () => {
  it('counts the layers of other colours over a square', () => {
    // The red centre is shut in by the yellow ring, the yellow ring by the blue frame.
    const rows = ['bbbbb', 'byyyb', 'byryb', 'byyyb', 'bbbbb'];
    const round = rounds(rows);
    expect(round[0]).toBe(0);
    expect(round[6]).toBe(1);
    expect(round[12]).toBe(2);
  });

  it('floods a colour through itself only, from where it touches the edge', () => {
    // The blue that reaches the right edge is peeled at once; blue shut in by yellow waits a round.
    expect([...rounds(['yyy', 'ybb', 'yyy'])]).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect([...rounds(['yyyy', 'ybby', 'yyyy'])]).toEqual([0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0]);
  });
});

describe('measure', () => {
  it('blind is the largest share one colour peels at the start', () => {
    const m = measure('no mask', ['bbbbb', 'byyyb', 'byryb', 'byyyb', 'bbbbb']);
    expect(m.blind).toBeCloseTo(16 / 25);
    expect(m.rounds).toBe(3);
    expect(m.late).toBeCloseTo(1 / 25);
    expect(Number.isNaN(m.subject)).toBe(true);
  });
});
