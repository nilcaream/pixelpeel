// How a picture plays before any deal is made, from its letters alone.
//
// Rounds: round 0 is what each colour's own pots can peel from the start (its groups that touch the edge,
// flooded through that colour only); round r is the same once every square of an earlier round is gone. A
// square's round is how many layers of other colours lie over it.
// blind = the largest share of the picture one colour can peel in round 0 (a pick that needs no looking);
// filler = the share peeled in round 0 outside the subject; subject = the subject's share (masks in pictures.ts);
// late = the share of round 2 or later. Patterns: checker = 2×2 windows `a b / b a`; straight = area edges of
// 8 squares or more in a straight line (a colour two squares deep on its side).

import { SUBJECT } from './pictures.ts';

const STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;

export function patterns(rows: readonly string[]): { checker: number; straight: number } {
  let checker = 0;
  let straight = 0;
  const H = rows.length;
  const W = rows[0]!.length;
  const at = (x: number, y: number) => rows[y]?.[x];
  for (let y = 0; y + 1 < H; y++)
    for (let x = 0; x + 1 < W; x++) if (at(x, y) === at(x + 1, y + 1) && at(x + 1, y) === at(x, y + 1) && at(x, y) !== at(x + 1, y)) checker++;
  const runs = (len: number, pair: (i: number) => string | null) => {
    let run = 0;
    let prev: string | null = null;
    for (let i = 0; i <= len; i++) {
      const p = i < len ? pair(i) : null;
      if (p !== null && p === prev) run++;
      else {
        if (prev !== null && run >= 8) straight++;
        run = p === null ? 0 : 1;
      }
      prev = p;
    }
  };
  for (let y = 0; y + 1 < H; y++) {
    runs(W, (x) => (at(x, y) !== at(x, y + 1) && at(x, y - 1) === at(x, y) ? at(x, y)! : null));
    runs(W, (x) => (at(x, y) !== at(x, y + 1) && at(x, y + 2) === at(x, y + 1) ? at(x, y + 1)! : null));
  }
  for (let x = 0; x + 1 < W; x++) {
    runs(H, (y) => (at(x, y) !== at(x + 1, y) && at(x - 1, y) === at(x, y) ? at(x, y)! : null));
    runs(H, (y) => (at(x, y) !== at(x + 1, y) && at(x + 2, y) === at(x + 1, y) ? at(x + 1, y)! : null));
  }
  return { checker, straight };
}

/** Each square's round, row by row. */
export function rounds(rows: readonly string[]): Int32Array {
  const H = rows.length;
  const W = rows[0]!.length;
  const round = new Int32Array(W * H).fill(-1);
  const open = (x: number, y: number) => x < 0 || y < 0 || x >= W || y >= H || round[y * W + x]! >= 0;
  for (let r = 0, left = W * H; left > 0; r++) {
    const seen = new Uint8Array(W * H);
    const queue: number[] = [];
    for (let i = 0; i < W * H; i++) {
      if (round[i]! >= 0) continue;
      const x = i % W;
      const y = (i / W) | 0;
      if (STEPS.some(([dx, dy]) => open(x + dx, y + dy))) {
        seen[i] = 1;
        queue.push(i);
      }
    }
    for (let h = 0; h < queue.length; h++) {
      const i = queue[h]!;
      const x = i % W;
      const y = (i / W) | 0;
      for (const [dx, dy] of STEPS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const j = ny * W + nx;
        if (seen[j] || round[j]! >= 0 || rows[ny]![nx] !== rows[y]![x]) continue;
        seen[j] = 1;
        queue.push(j);
      }
    }
    for (const i of queue) round[i] = r;
    left -= queue.length;
  }
  return round;
}

/** Groups of three or more squares of one colour, 4-connected. */
export function groupCount(rows: readonly string[]): number {
  const H = rows.length;
  const W = rows[0]!.length;
  const seen = new Uint8Array(W * H);
  let n = 0;
  for (let s = 0; s < W * H; s++) {
    if (seen[s]) continue;
    const c = rows[(s / W) | 0]![s % W];
    const stack = [s];
    seen[s] = 1;
    let size = 0;
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % W;
      const y = (i / W) | 0;
      for (const [dx, dy] of STEPS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen[ny * W + nx] || rows[ny]![nx] !== c) continue;
        seen[ny * W + nx] = 1;
        stack.push(ny * W + nx);
      }
    }
    if (size >= 3) n++;
  }
  return n;
}

export function measure(title: string, rows: readonly string[]) {
  const H = rows.length;
  const W = rows[0]!.length;
  const N = W * H;
  const round = rounds(rows);
  const letter = (i: number) => rows[(i / W) | 0]![i % W]!;
  const colours = [...new Set(rows.join(''))];
  let blind = 0;
  let maxRound = 0;
  let late = 0;
  const lateColours = new Set<string>();
  for (const c of colours) {
    let first = 0;
    for (let i = 0; i < N; i++) if (letter(i) === c && round[i] === 0) first++;
    blind = Math.max(blind, first / N);
  }
  for (let i = 0; i < N; i++) {
    maxRound = Math.max(maxRound, round[i]!);
    if (round[i]! >= 2) {
      late++;
      lateColours.add(letter(i));
    }
  }
  let subject = NaN;
  let filler = NaN;
  const parts = SUBJECT[title];
  if (parts) {
    let s = 0;
    let f = 0;
    for (let i = 0; i < N; i++) {
      const x = i % W;
      const y = (i / W) | 0;
      if (parts.some(([cs, [x0, y0, x1, y1]]) => cs.includes(letter(i)) && x >= x0 && x <= x1 && y >= y0 && y <= y1)) s++;
      else if (round[i] === 0) f++;
    }
    subject = s / N;
    filler = f / N;
  }
  return { colours, blind, filler, subject, rounds: maxRound + 1, late: late / N, lateColours: lateColours.size, groups: groupCount(rows), ...patterns(rows) };
}
