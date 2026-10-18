import { describe, expect, it } from 'vitest';
import { createBoard, pick, reachable, status, type Pot } from './rules.ts';
import { parsePicture } from './picture.ts';

const COLOURS = { A: '#ff0000', B: '#ffff00', C: '#0000ff' };
const A = 0;
const B = 1;
const C = 2;

function boardOf(rows: string[], columns: Pot[][] = [], buckets = 1) {
  return createBoard(parsePicture(rows, COLOURS), columns, buckets);
}

const pot = (colour: number, count: number): Pot => ({ colour, count });

describe('a pick', () => {
  it('lifts at once as many reachable pixels of its colour as the pot holds, and the bucket frees at zero', () => {
    const r = pick(boardOf(['AAAA'], [[pot(A, 3)]]), 0);
    expect(r?.lifts.length).toBe(3);
    expect(Array.from(r?.board.cells ?? []).filter((c) => c === A).length).toBe(1);
    expect(r?.board.held).toEqual([]);
  });

  it('keeps a pot in its bucket, counting down, while its colour cannot be reached', () => {
    const r = pick(boardOf(['BBB', 'BAB', 'BBB'], [[pot(A, 1)]]), 0);
    expect(r?.lifts).toEqual([]);
    expect(r?.board.held).toMatchObject([{ colour: A, count: 1, left: 1 }]);
  });

  it('lets a waiting pot go on as soon as a later pick opens its colour', () => {
    let b = boardOf(['BBB', 'BAB', 'BBB'], [[pot(A, 1), pot(B, 8)]], 2);
    b = (pick(b, 0) as { board: typeof b }).board;
    const r = pick(b, 0);
    expect(r?.lifts).toContainEqual({ pot: 0, square: 4 });
    expect(status(r?.board ?? b)).toBe('won');
  });

  it('takes the most exposed pixel first: the shortest walk from outside, then the lowest row, then the leftmost', () => {
    // Every pixel on the edge is one step from outside; the bottom row comes first, left to right.
    const r = pick(boardOf(['AAA', 'AAA'], [[pot(A, 4)]]), 0);
    expect(r?.lifts.map((l) => l.square)).toEqual([3, 4, 5, 0]);
  });

  it('lets the pots in the buckets take turns, one pixel each, the earliest picked first', () => {
    // Red and yellow wait inside the blue; blue digging from the bottom opens them both at once.
    let b = boardOf(['CCCC', 'CABC', 'CCCC'], [[pot(A, 1)], [pot(B, 1)], [pot(C, 10)]], 3);
    b = (pick(b, 0) as { board: typeof b }).board;
    b = (pick(b, 1) as { board: typeof b }).board;
    const r = pick(b, 2);
    expect(r?.lifts.slice(0, 5)).toEqual([
      { pot: 2, square: 8 },
      { pot: 2, square: 9 },
      { pot: 0, square: 5 },
      { pot: 1, square: 6 },
      { pot: 2, square: 10 },
    ]);
  });

  it('takes no pot when every bucket is held, or from an empty column', () => {
    const b = (pick(boardOf(['BBB', 'BAB', 'BBB'], [[pot(A, 1), pot(B, 8)], []]), 0) as { board: ReturnType<typeof boardOf> }).board;
    expect(pick(b, 0)).toBeNull();
    expect(pick(boardOf(['A'], [[], [pot(A, 1)]], 1), 0)).toBeNull();
  });
});

describe('the end', () => {
  it('is won when the picture is empty', () => {
    expect(status((pick(boardOf(['AA'], [[pot(A, 2)]]), 0) as { board: ReturnType<typeof boardOf> }).board)).toBe('won');
  });

  it('is stuck when every bucket holds a pot that can reach nothing', () => {
    const b = boardOf(['BBBB', 'BAAB', 'BBBB'], [[pot(A, 1), pot(A, 1), pot(B, 10)]], 2);
    const one = (pick(b, 0) as { board: typeof b }).board;
    expect(status(one)).toBe('playing');
    expect(status((pick(one, 0) as { board: typeof b }).board)).toBe('stuck');
  });

  it('is stuck when no pots are left and a held pot can reach nothing', () => {
    expect(status((pick(boardOf(['BBB', 'BAB', 'BBB'], [[pot(A, 1)]], 2), 0) as { board: ReturnType<typeof boardOf> }).board)).toBe('stuck');
  });
});

describe('reachable', () => {
  it('counts per colour the pixels a pot could take now', () => {
    expect(reachable(boardOf(['BBB', 'BAB', 'BBB']))).toEqual([0, 8, 0]);
    expect(reachable(boardOf(['ABC']))).toEqual([1, 1, 1]);
  });
});
