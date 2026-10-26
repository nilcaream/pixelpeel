// Players that think, for telling skill from luck. A thinker looks a few picks ahead before each pick,
// on the pots it can see: the top `sight` of each column, as the page shows them (or all of them, to
// measure what the hidden pots are worth). And a solver that says whether a deal can be won at all.
//
// A thinker tries every line of up to `depth` picks among the pots it sees, and takes the first pick of
// the best line. A line that wins is best and one that gets stuck worst (stuck later beats stuck
// sooner); otherwise a line is worth the pixels lifted plus FREE_BUCKET per free bucket. Ties go to the
// seed. A pot it cannot see is not there for it: it never plans with a pot under the visible ones.

import type { Picture } from './picture.ts';
import { seededRng, type Rng } from './rng.ts';
import { EMPTY, createBoard, pick, reachable, status, type Board, type Pot } from './rules.ts';

/** What a free bucket is worth to a thinker, in pixels. */
const FREE_BUCKET = 30;
const WIN = 1e9;
const STUCK = -1e9;
/** The most positions a thinker looks at for one pick. */
const LOOK_BUDGET = 4000;
/** The most positions the solver looks at before it says it does not know. */
export const SOLVE_BUDGET = 20000;

export interface Thinker {
  /** How many pots of each column it sees, top first; Infinity sees them all. */
  sight: number;
  /** How many picks ahead it looks. */
  depth: number;
}

function lifted(b: Board): number {
  let n = 0;
  for (const c of b.cells) if (c === EMPTY) n++;
  return n;
}

function search(b: Board, depth: number, budget: { left: number }): number {
  if (b.cells.every((c) => c === EMPTY)) return WIN;
  if (b.held.length >= b.buckets) return STUCK + lifted(b);
  const open = b.columns.flatMap((c, i) => (c.length ? [i] : []));
  if (depth === 0 || open.length === 0 || budget.left <= 0) return lifted(b) + FREE_BUCKET * (b.buckets - b.held.length);
  let best = -Infinity;
  for (const c of open) {
    budget.left--;
    const s = search((pick(b, c) as { board: Board }).board, depth - 1, budget);
    if (s > best) best = s;
    if (best >= WIN) break;
  }
  return best;
}

/** The column a thinker picks on board b. */
export function thinkerPick(b: Board, t: Thinker, rng: Rng): number {
  const seen: Board = { ...b, columns: b.columns.map((c) => c.slice(0, t.sight)) };
  let best = -Infinity;
  let tied: number[] = [];
  seen.columns.forEach((c, i) => {
    if (!c.length) return;
    const s = search((pick(seen, i) as { board: Board }).board, t.depth - 1, { left: LOOK_BUDGET });
    if (s > best) {
      best = s;
      tied = [i];
    } else if (s === best) tied.push(i);
  });
  return tied[Math.floor(rng() * tied.length)] as number;
}

/** The share of `games` games a thinker wins, seeds `first` to first + games − 1. */
export function thinkerShare(picture: Picture, columns: Pot[][], buckets: number, games: number, t: Thinker, first = 1): number {
  let wins = 0;
  for (let seed = first; seed < first + games; seed++) {
    const rng = seededRng(seed);
    let b = createBoard(picture, columns, buckets);
    while (status(b) === 'playing') b = (pick(b, thinkerPick(b, t, rng)) as { board: Board }).board;
    if (status(b) === 'won') wins++;
  }
  return wins / games;
}

export type Solved = { result: 'win'; picks: number[] } | { result: 'lose' | 'unknown' };

/**
 * Whether a deal can be won, by a depth-first search over every pick with full sight, positions seen once.
 * Picks whose colour reaches pixels now go first, the most they can lift first. 'unknown' when the
 * budget runs out first.
 */
export function solve(picture: Picture, columns: Pot[][], buckets: number, budget = SOLVE_BUDGET): Solved {
  const seen = new Set<string>();
  const line: number[] = [];
  let nodes = 0;
  const key = (b: Board) => {
    let h = 0x811c9dc5;
    for (const c of b.cells) h = Math.imul(h ^ (c + 2), 0x01000193) >>> 0;
    return `${b.columns.map((c) => c.length).join(',')}|${b.held.map((p) => `${p.colour}:${p.left}`).join(',')}|${h}`;
  };
  const dfs = (b: Board): boolean | null => {
    const s = status(b);
    if (s === 'won') return true;
    if (s === 'stuck') return false;
    const k = key(b);
    if (seen.has(k)) return false;
    seen.add(k);
    const free = reachable(b);
    const moves = b.columns
      .flatMap((c, i) => (c.length ? [i] : []))
      .map((i) => {
        const top = (b.columns[i] as Pot[])[0] as Pot;
        const reach = free[top.colour] as number;
        return { i, score: reach > 0 ? Math.min(reach, top.count) : -1 };
      })
      .sort((x, y) => y.score - x.score);
    let unknown = false;
    for (const { i } of moves) {
      if (++nodes > budget) return null;
      line.push(i);
      const r = dfs((pick(b, i) as { board: Board }).board);
      if (r === true) return true;
      line.pop();
      if (r === null) unknown = true;
    }
    return unknown ? null : false;
  };
  const r = dfs(createBoard(picture, columns, buckets));
  return r === true ? { result: 'win', picks: line } : { result: r === false ? 'lose' : 'unknown' };
}
