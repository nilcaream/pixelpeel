import { describe, expect, it } from 'vitest';
import { AT_BUCKET, EMPTY, createState, findTarget, pick, status, tick, type Pot, type State } from './engine.ts';
import { parsePicture } from './picture.ts';

const COLOURS = { A: '#ff0000', B: '#ffff00' };
const A = 0;
const B = 1;

function stateOf(rows: string[], columns: Pot[][] = [], buckets = 1): State {
  return createState(parsePicture(rows, COLOURS), columns, buckets);
}

function run(s: State, ticks: number): State {
  for (let i = 0; i < ticks; i++) s = tick(s);
  return s;
}

describe('reachability', () => {
  it('cannot take a pixel that other pixels surround', () => {
    expect(findTarget(stateOf(['BBB', 'BAB', 'BBB']), 0, A)).toBeNull();
  });

  it('takes a surrounded pixel once an emptied square joins it to the outside', () => {
    const s = stateOf(['BBB', 'BAB', 'BBB']);
    s.cells[1] = EMPTY;
    expect(findTarget(s, 0, A)?.square).toBe(4);
  });

  it('walks round the outside of the picture to reach a pixel on its far side', () => {
    const t = findTarget(stateOf(['BAB', 'BBB']), 0, A);
    expect(t?.square).toBe(1);
    // Under the bucket, two steps right, up the side, two steps left along the top, then down onto the pixel.
    expect(t?.path.length).toBe(9);
  });
});

describe('the closest pixel', () => {
  it('goes for the pixel right above the bucket first', () => {
    expect(findTarget(stateOf(['AAAAA']), 0, A)?.square).toBe(2);
  });

  it('breaks a tie between rows in favour of the lowest row', () => {
    expect(findTarget(stateOf(['BBBA', 'ABBB', 'BBBB']), 0, A)?.square).toBe(4);
  });

  it('breaks a tie within a row in favour of the leftmost pixel', () => {
    expect(findTarget(stateOf(['ABA', 'BBB']), 0, A)?.square).toBe(0);
  });

  it('leaves a pixel alone while another dot is on its way to it', () => {
    const s = stateOf(['AAAAA']);
    s.claimed[2] = 1;
    expect(findTarget(s, 0, A)?.square).toBe(1);
  });
});

describe('buckets', () => {
  it('puts the top pot of a column into the leftmost free bucket', () => {
    const s = pick(stateOf(['AB'], [[{ colour: B, count: 1 }, { colour: A, count: 1 }]], 2), 0);
    expect(s.buckets[0]).toMatchObject({ colour: B, count: 1 });
    expect(s.buckets[1]).toBeNull();
    expect(s.columns[0]).toEqual([{ colour: A, count: 1 }]);
  });

  it('takes no pot when every bucket is full', () => {
    const s = pick(stateOf(['AB'], [[{ colour: A, count: 1 }, { colour: B, count: 1 }]]), 0);
    expect(pick(s, 0)).toBe(s);
  });

  it('sends each dot out of the bucket and back into it', () => {
    const s = tick(pick(stateOf(['AAA'], [[{ colour: A, count: 3 }]]), 0));
    const route = s.dots[0]?.route ?? [];
    expect(route[0]).toBe(AT_BUCKET);
    expect(route[route.length - 1]).toBe(AT_BUCKET);
    expect(route.filter((step) => step === AT_BUCKET).length).toBe(2);
  });

  it('counts down at each pickup and frees itself only when its last dot is home', () => {
    let s = pick(stateOf(['AAA'], [[{ colour: A, count: 3 }]]), 0);
    const shown: number[] = [];
    let freedWhileOut = false;
    for (let i = 0; i < 40 && status(s) === 'playing'; i++) {
      s = tick(s);
      const b = s.buckets[0];
      if (b) shown.push(b.count - b.pickedUp);
      else if (s.dots.length > 0) freedWhileOut = true;
    }
    expect([...new Set(shown)]).toEqual([3, 2, 1, 0]);
    expect(freedWhileOut).toBe(false);
    expect(s.buckets[0]).toBeNull();
  });
});

describe('the end', () => {
  it('is won when the picture is empty and every dot is home', () => {
    let s = pick(stateOf(['AA'], [[{ colour: A, count: 2 }]]), 0);
    while (s.cells.some((c) => c !== EMPTY)) s = tick(s);
    expect(s.dots.length).toBeGreaterThan(0);
    expect(status(s)).toBe('playing');
    s = run(s, 40);
    expect(status(s)).toBe('won');
  });

  it('is stuck when every bucket holds red but a yellow wall four pixels thick hides all the red', () => {
    const wall = 'BBBB';
    const rows = [
      ...Array.from({ length: 4 }, () => 'B'.repeat(13)),
      ...Array.from({ length: 5 }, () => `${wall}AAAAA${wall}`),
      ...Array.from({ length: 4 }, () => 'B'.repeat(13)),
    ];
    const reds = [7, 6, 6, 6].map((count) => [{ colour: A, count }, { colour: B, count: 36 }]);
    let s = stateOf(rows, reds, 4);
    for (let c = 0; c < 4; c++) s = pick(s, c);
    s = run(s, 5);
    expect(status(s)).toBe('stuck');
  });

  it('is not stuck while a bucket is free and a pot is left to pick', () => {
    expect(status(stateOf(['BA'], [[{ colour: A, count: 1 }]]))).toBe('playing');
  });
});
