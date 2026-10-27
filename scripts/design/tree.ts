// The whole game tree of one level, solved exactly: every position a game can reach is visited once, and what
// happens from it is counted over every way of playing on, rather than sampled game by game.
//
//   npm run design:tree -- 82            explore level 82, print the measures, write out/tree/82.json
//   npm run design:tree -- 82 --limit 5e6   give up once that many positions are found
//   npm run design:tree -- 82 --sensible    only the positions the sensible player reaches (S alone, no U)
//   npm run design:tree -- 82 --workers 14  spread each layer over 14 worker threads
//
// A position is what decides every game from it on: how many pots each column has given up, the pots in the
// buckets (colour and pixels still to lift, in the order they were picked, since they take turns in that order),
// and which squares are empty. The order of the picks matters beyond which pots were taken: a pot lifts the most
// exposed pixel of its colour at the time, so the same pots taken in another order can empty other squares.
// Picks only add, so every position sits at the depth of the picks it took, and the positions in order of
// discovery, layer by layer, are an order in which every pick goes forward.
//
// Two ways of choosing a pick weight the games:
//   - U: every column with pots is equally likely.
//   - S: the sensible player of src/generator.ts `play`: equally likely among the columns whose top pot's colour
//     reaches pixels now (reachable less what the held pots still have to lift), and among all columns when none does.
// Per pick, as in scripts/design/pressure.ts on branch difficulty: dig = the top pot's colour reaches nothing now;
// forced = a dig while no top pot reaches anything; blind = a dig whose column's 2nd and 3rd pots reach nothing
// either; free = buckets − pots held; a free run = picks in a row down one column, none a dig, counted at RUN or more.
// What a position adds: winnable = some line from it wins; a trap = winnable, and some pick from it is not; the
// fatal pick of a lost game = the one from a winnable position to one that is not; the dead-end distance = the
// picks made after it until the game is stuck.

import { writeFileSync } from 'node:fs';
import { Worker } from 'node:worker_threads';
import levelsFile from '../../src/levels.json' with { type: 'json' };
import { VISIBLE, type Level } from '../../src/levels.ts';
import { poolPicture, type Picture } from '../../src/picture.ts';
import { EMPTY, type Pot } from '../../src/rules.ts';
import { outDir } from './common.ts';

const RUN = 3;

function add(a: { [i: number]: number }, i: number, v: number): void {
  a[i] = (a[i] as number) + v;
}

/** The fixed part of a level: the picture, the deal, and what every position looks up. */
export class Game {
  readonly w: number;
  readonly h: number;
  readonly fw: number;
  readonly colours: number;
  readonly squares: Int16Array;
  /** The squares of each colour, in square order. */
  readonly byColour: Int32Array[];
  readonly pixels: number;
  readonly columns: Pot[][];
  readonly buckets: number;
  /** lift's work queue: a square enters it at most once per lift, each time its walk shortens. */
  private readonly queue: Int32Array;

  constructor(picture: Picture, columns: Pot[][], buckets: number) {
    this.queue = new Int32Array((picture.width + 2) * (picture.height + 2) * 4);
    this.columns = columns;
    this.buckets = buckets;
    this.w = picture.width;
    this.h = picture.height;
    this.fw = this.w + 2;
    this.colours = picture.palette.length;
    this.squares = Int16Array.from(picture.cells);
    const lists: number[][] = picture.palette.map(() => []);
    this.squares.forEach((c, sq) => c !== EMPTY && lists[c]?.push(sq));
    this.byColour = lists.map((l) => Int32Array.from(l));
    this.pixels = lists.reduce((n, l) => n + l.length, 0);
  }

  frame(sq: number): number {
    const x = sq % this.w;
    return ((sq - x) / this.w + 1) * this.fw + x + 1;
  }

  start(): Position {
    const p: Position = {
      depths: new Uint8Array(this.columns.length),
      held: [],
      cells: Int16Array.from(this.squares),
      dist: new Int32Array(0),
      left: this.pixels,
    };
    p.dist = this.distances(p.cells);
    return p;
  }

  /** The walk from the ring to every empty square of the frame, −1 on a pixel: one search from the whole ring. */
  distances(cells: Int16Array): Int32Array {
    const fw = this.fw;
    const fh = this.h + 2;
    const dist = new Int32Array(fw * fh).fill(-1);
    const queue = new Int32Array(fw * fh);
    let tail = 0;
    for (let fy = 0; fy < fh; fy++)
      for (let fx = 0; fx < fw; fx++)
        if (fx === 0 || fy === 0 || fx === fw - 1 || fy === fh - 1) {
          dist[fy * fw + fx] = 0;
          queue[tail++] = fy * fw + fx;
        }
    for (let head = 0; head < tail; head++) {
      const f = queue[head] as number;
      for (const n of [f - fw, f - 1, f + 1, f + fw]) {
        if (n < 0 || n >= dist.length || dist[n] !== -1) continue;
        const fx = n % fw;
        const fy = (n - fx) / fw;
        if (fx === 0 || fy === 0 || fx === fw - 1 || fy === fh - 1) continue;
        if (cells[(fy - 1) * this.w + fx - 1] !== EMPTY) continue;
        dist[n] = (dist[f] as number) + 1;
        queue[tail++] = n;
      }
    }
    return dist;
  }

  /** The walk to a pixel: one more than its nearest empty neighbour, or −1 when it touches none. */
  reach(p: Position, sq: number): number {
    const f = this.frame(sq);
    const d = p.dist;
    let best = 0x7fffffff;
    let v = d[f - this.fw] as number;
    if (v >= 0 && v < best) best = v;
    v = d[f - 1] as number;
    if (v >= 0 && v < best) best = v;
    v = d[f + 1] as number;
    if (v >= 0 && v < best) best = v;
    v = d[f + this.fw] as number;
    if (v >= 0 && v < best) best = v;
    return best === 0x7fffffff ? -1 : best + 1;
  }

  /** The most exposed pixel of a colour: shortest walk, then the lowest row, then the leftmost; −1 when none. */
  best(p: Position, colour: number): number {
    let at = -1;
    let atD = 0;
    let atRow = 0;
    for (const sq of this.byColour[colour] as Int32Array) {
      if (p.cells[sq] === EMPTY) continue;
      const d = this.reach(p, sq);
      if (d < 0) continue;
      const row = (sq / this.w) | 0;
      if (at < 0 || d < atD || (d === atD && row > atRow)) {
        at = sq;
        atD = d;
        atRow = row;
      }
    }
    return at;
  }

  /** Empties a square and shortens the walks that now go through it. */
  lift(p: Position, sq: number): void {
    const f = this.frame(sq);
    const d = p.dist;
    d[f] = this.reach(p, sq);
    p.cells[sq] = EMPTY;
    p.left -= 1;
    const queue = this.queue;
    queue[0] = f;
    for (let i = 0, tail = 1; i < tail; i++) {
      const u = queue[i] as number;
      const next = (d[u] as number) + 1;
      for (let k = 0; k < 4; k++) {
        const n = u + (k === 0 ? -this.fw : k === 1 ? -1 : k === 2 ? 1 : this.fw);
        if ((d[n] as number) > next) {
          d[n] = next;
          queue[tail++] = n;
        }
      }
    }
  }

  /** The pick of src/rules.ts `pick`, on a position: null when no bucket is free or the column is empty. */
  pick(p: Position, column: number): Position | null {
    const pots = this.columns[column] as Pot[];
    const depth = p.depths[column] as number;
    if (p.held.length >= this.buckets || depth >= pots.length) return null;
    const top = pots[depth] as Pot;
    const q: Position = {
      depths: p.depths.slice(),
      held: [...p.held.map((h) => ({ ...h })), { colour: top.colour, left: top.count }],
      cells: p.cells.slice(),
      dist: p.dist.slice(),
      left: p.left,
    };
    q.depths[column] = depth + 1;
    for (let moved = true; moved; ) {
      moved = false;
      for (const h of q.held) {
        if (h.left === 0) continue;
        const sq = this.best(q, h.colour);
        if (sq < 0) continue;
        this.lift(q, sq);
        h.left -= 1;
        moved = true;
      }
    }
    q.held = q.held.filter((h) => h.left > 0);
    return q;
  }

  status(p: Position): 'won' | 'stuck' | 'playing' {
    if (p.left === 0) return 'won';
    if (p.held.length < this.buckets && this.columns.some((c, i) => (p.depths[i] as number) < c.length)) return 'playing';
    return 'stuck';
  }

  /** src/rules.ts `reachable`: per colour, the pixels reachable now less what the held pots have still to lift. */
  free(p: Position): number[] {
    const counts = new Array<number>(this.colours).fill(0);
    for (let c = 0; c < this.colours; c++)
      for (const sq of this.byColour[c] as Int32Array) if (p.cells[sq] !== EMPTY && this.reach(p, sq) > 0) add(counts, c, 1);
    for (const h of p.held) add(counts, h.colour, -h.left);
    return counts;
  }

  /** The pot at a column's depth, the 0th being its top now. */
  pot(p: Position, column: number, below = 0): Pot | undefined {
    return this.columns[column]?.[(p.depths[column] as number) + below];
  }

  /** A position as a string: depths, the held pots, then a bit per square, set when empty. */
  key(p: Position): string {
    let s = String.fromCharCode(...p.depths, p.held.length);
    for (const h of p.held) s += String.fromCharCode(h.colour, h.left);
    const c = p.cells;
    for (let i = 0; i < c.length; i += 8) {
      let byte = 0;
      for (let j = 0; j < 8 && i + j < c.length; j++) if (c[i + j] === EMPTY) byte |= 1 << j;
      s += String.fromCharCode(byte);
    }
    return s;
  }

  unkey(s: string): Position {
    const nc = this.columns.length;
    const depths = new Uint8Array(nc);
    for (let i = 0; i < nc; i++) depths[i] = s.charCodeAt(i);
    const nh = s.charCodeAt(nc);
    const held = [];
    for (let i = 0; i < nh; i++) held.push({ colour: s.charCodeAt(nc + 1 + 2 * i), left: s.charCodeAt(nc + 2 + 2 * i) });
    const cells = Int16Array.from(this.squares);
    const base = nc + 1 + 2 * nh;
    let left = this.pixels;
    for (let sq = 0; sq < cells.length; sq++)
      if (s.charCodeAt(base + (sq >> 3)) & (1 << (sq & 7)) && cells[sq] !== EMPTY) {
        cells[sq] = EMPTY;
        left -= 1;
      }
    return { depths, held, cells, dist: this.distances(cells), left };
  }
}

export interface Position {
  /** Pots taken from each column. */
  depths: Uint8Array;
  /** The pots in buckets, the earliest picked first. */
  held: { colour: number; left: number }[];
  cells: Int16Array;
  /** Game.distances of cells, kept up to date by lift. */
  dist: Int32Array;
  /** Pixels still in the picture. */
  left: number;
}

const PLAYING = 0;
const WON = 1;
const STUCK = 2;

/** The explored graph: every position by index, in an order where every pick goes forward. */
export interface Tree {
  size: number;
  columns: number;
  layer: Uint8Array;
  state: Uint8Array;
  pixelsLeft: Int16Array;
  free: Uint8Array;
  /** Per position and column, the index the pick leads to, or −1. */
  child: Int32Array;
  /** Bit per column: the pick is a dig, a blind dig. */
  dig: Uint8Array;
  blind: Uint8Array;
  /** Set when only the positions this player reaches were explored. */
  only?: 'S';
  /** Bit per column with pots. */
  open: Uint8Array;
  /** With only: bit per column the player never picks there, set when a win is still there after that pick. */
  offWin: Uint8Array;
  /** With only: the positions the search for a win visited off the player's games. */
  offPositions: number;
  layers: number[];
  seconds: number;
  complete: boolean;
}

/**
 * Whether some line from a position still wins: a depth-first search that tries the picks reaching pixels first,
 * deciding every position once.
 */
export class Solver {
  readonly memo = new Map<string, boolean>();
  private readonly game: Game;

  constructor(game: Game) {
    this.game = game;
  }

  winnable(p: Position): boolean {
    const s = this.game.status(p);
    if (s !== 'playing') return s === 'won';
    const key = this.game.key(p);
    const known = this.memo.get(key);
    if (known !== undefined) return known;
    const reach = this.game.free(p);
    const columns = [...this.game.columns.keys()].filter((c) => this.game.pot(p, c));
    const opens = (c: number) => (reach[(this.game.pot(p, c) as Pot).colour] as number) > 0;
    let win = false;
    for (const c of [...columns.filter(opens), ...columns.filter((c) => !opens(c))])
      if ((win = this.winnable(this.game.pick(p, c) as Position))) break;
    this.memo.set(key, win);
    return win;
  }

  readonly sure = new Map<string, boolean>();

  /** Whether every line from a position wins: the same search, trying the picks that dig first. */
  allWin(p: Position): boolean {
    const s = this.game.status(p);
    if (s !== 'playing') return s === 'won';
    const key = this.game.key(p);
    const known = this.sure.get(key);
    if (known !== undefined) return known;
    const reach = this.game.free(p);
    const columns = [...this.game.columns.keys()].filter((c) => this.game.pot(p, c));
    const opens = (c: number) => (reach[(this.game.pot(p, c) as Pot).colour] as number) > 0;
    let all = true;
    for (const c of [...columns.filter((c) => !opens(c)), ...columns.filter(opens)])
      if (!(all = this.allWin(this.game.pick(p, c) as Position))) break;
    this.sure.set(key, all);
    return all;
  }
}

/** The picks made with no choice left: from where on a line has one legal pick at each step to its end. */
export function forcedFrom(game: Game, p: Position): boolean {
  for (let q = p; ; ) {
    if (game.status(q) !== 'playing') return true;
    const open = game.columns.flatMap((_, c) => (game.pot(q, c) ? [c] : []));
    if (open.length !== 1) return false;
    q = game.pick(q, open[0] as number) as Position;
  }
}

/** What one position is and where its picks lead: the key of each pick's position, '' for a pick not followed. */
export interface Expansion {
  left: number;
  free: number;
  state: number;
  /** Bit per column with pots. */
  open: number;
  dig: number;
  blind: number;
  offWin: number;
  children: string[];
}

/** Expands the positions of one layer, in order: here, or spread over workers (scripts/design/tree-worker.ts). */
export type Expander = (keys: string[]) => Promise<Expansion[]>;

export function expand(game: Game, key: string, only: 'S' | undefined, solver: Solver | null): Expansion {
  const nc = game.columns.length;
  const p = game.unkey(key);
  const s = game.status(p);
  const e: Expansion = {
    left: p.left,
    free: game.buckets - p.held.length,
    state: s === 'won' ? WON : s === 'stuck' ? STUCK : PLAYING,
    open: 0,
    dig: 0,
    blind: 0,
    offWin: 0,
    children: new Array<string>(nc).fill(''),
  };
  if (s !== 'playing') return e;
  const reach = game.free(p);
  const opens = (pot: Pot | undefined) => !!pot && (reach[pot.colour] as number) > 0;
  let open = 0;
  for (let c = 0; c < nc; c++) {
    if (!game.pot(p, c)) continue;
    open |= 1 << c;
    e.open = open;
    if (!opens(game.pot(p, c))) {
      e.dig |= 1 << c;
      let seen = false;
      for (let j = 1; j < VISIBLE; j++) seen ||= opens(game.pot(p, c, j));
      if (!seen) e.blind |= 1 << c;
    }
  }
  const chosen = only === 'S' ? open & ~e.dig || open : open;
  for (let c = 0; c < nc; c++) {
    if (!(open & (1 << c))) continue;
    const q = game.pick(p, c) as Position;
    if (chosen & (1 << c)) e.children[c] = game.key(q);
    // A pick the player never makes: only whether a win is still there after it is needed.
    else if ((solver as Solver).winnable(q)) e.offWin |= 1 << c;
  }
  return e;
}

/**
 * Every position a game reaches, layer by layer. With only = 'S', just the positions the sensible player reaches;
 * after a pick it never makes there, a search says whether a win is still there.
 */
export async function explore(
  game: Game,
  limit = Infinity,
  log: (line: string) => void = () => {},
  only?: 'S',
  expander?: Expander,
): Promise<Tree> {
  const t0 = Date.now();
  const nc = game.columns.length;
  const solver = only ? new Solver(game) : null;
  const local: Expander = async (keys) => keys.map((k) => expand(game, k, only, solver));
  const run = expander ?? local;
  let cap = 1 << 16;
  let layer = new Uint8Array(cap);
  let state = new Uint8Array(cap);
  let pixelsLeft = new Int16Array(cap);
  let free = new Uint8Array(cap);
  let child = new Int32Array(cap * nc).fill(-1);
  let dig = new Uint8Array(cap);
  let blind = new Uint8Array(cap);
  let offWin = new Uint8Array(cap);
  let open = new Uint8Array(cap);
  const grow = () => {
    cap *= 2;
    const g = <T extends Uint8Array | Int16Array | Int32Array>(a: T, n: number, fill = 0): T => {
      const b = new (a.constructor as new (n: number) => T)(n);
      b.fill(fill as never);
      b.set(a as never);
      return b;
    };
    layer = g(layer, cap);
    state = g(state, cap);
    pixelsLeft = g(pixelsLeft, cap);
    free = g(free, cap);
    child = g(child, cap * nc, -1);
    dig = g(dig, cap);
    blind = g(blind, cap);
    offWin = g(offWin, cap);
    open = g(open, cap);
  };
  const layers: number[] = [];
  let size = 1;
  let current: string[] = [game.key(game.start())];
  let first = 0;
  let complete = true;
  for (let k = 0; current.length; k++) {
    layers.push(first);
    const next = new Map<string, number>();
    const nextKeys: string[] = [];
    const expansions = await run(current);
    for (let i = 0; i < current.length; i++) {
      const at = first + i;
      const e = expansions[i] as Expansion;
      layer[at] = k;
      pixelsLeft[at] = e.left;
      free[at] = e.free;
      state[at] = e.state;
      dig[at] = e.dig;
      blind[at] = e.blind;
      offWin[at] = e.offWin;
      open[at] = e.open;
      for (let c = 0; c < nc; c++) {
        const kq = e.children[c];
        if (!kq) continue;
        let to = next.get(kq);
        if (to === undefined) {
          to = first + current.length + nextKeys.length;
          next.set(kq, to);
          nextKeys.push(kq);
          while (to >= cap) grow();
        }
        child[at * nc + c] = to;
      }
    }
    log(`layer ${k}: ${current.length} positions, ${size} so far, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    first += current.length;
    size = first + nextKeys.length;
    current = nextKeys;
    if (size > limit && current.length) {
      complete = false;
      log(`stopped at ${size} positions`);
      break;
    }
  }
  const offPositions = expander ? -1 : (solver?.memo.size ?? 0);
  return { size: first, columns: nc, layer, state, pixelsLeft, free, child, dig, blind, only, open, offWin, offPositions, layers, seconds: (Date.now() - t0) / 1000, complete };
}

export type Weighting = 'U' | 'S';

/** The picks a player of the weighting chooses among at a position: a bit per column. */
export function choices(t: Tree, at: number, w: Weighting): number {
  let open = 0;
  for (let c = 0; c < t.columns; c++) if ((t.child[at * t.columns + c] as number) >= 0) open |= 1 << c;
  if (w === 'U') return open;
  const useful = open & ~(t.dig[at] as number);
  return useful || open;
}

function bits(m: number): number {
  let n = 0;
  for (; m; m &= m - 1) n++;
  return n;
}

export interface Measures {
  positions: number;
  layers: number;
  terminal: { won: number; stuck: number };
  winnable: number;
  traps: number;
  /** log10 of the number of games and of winning games (U counts every sequence of picks). */
  log10Games: number;
  log10Wins: number;
  /** Winning games over all games, every sequence of picks counted once. */
  winningGames: number;
  /** U is left out when only the sensible player's positions were explored. */
  per: Partial<Record<Weighting, PerWeighting>>;
}

export interface PerWeighting {
  win: number;
  picksPerGame: number;
  /** Positions this player can reach at all. */
  seen: number;
  /** Probability that a game ends stuck after k picks, by k; and by pixels left, in tenths of the picture. */
  stuckByPicks: number[];
  stuckByPixelsLeft: number[];
  /** Expected visits per game to traps the weighting can fall into, and the chance of falling at one. */
  trapsPerGame: number;
  trapsPerWonGame: number;
  trapsPerLostGame: number;
  fallChance: number;
  /** Lost games, by the picks made after the fatal one (index = picks), as a share of lost games. */
  deadEnd: number[];
  deadEndMean: number;
  fatalAtPick: number[];
  pixelsLeftAtFatal: number;
  pixelsLeftAtStuck: number;
  digs: number;
  chosenDigs: number;
  forcedDigs: number;
  blindDigs: number;
  /** Share of picks made with k buckets free, by k. */
  freeShare: number[];
  inRunsShare: number;
  /**
   * Peeled share of the picture where a game has no choice left (one legal pick at each step to the end), in won
   * and in lost games; where no line can lose any more (won games); and where this player can no longer lose.
   */
  forcedWon: Point;
  forcedLost: Point;
  decided: Point;
  playerDecided: Point;
}

export function solve(game: Game, t: Tree): Measures {
  const n = t.size;
  const nc = t.columns;
  const winnable = new Uint8Array(n);
  const games = new Float64Array(n);
  const wins = new Float64Array(n);
  const pWin: Record<Weighting, Float64Array> = { U: new Float64Array(n), S: new Float64Array(n) };
  for (let at = n - 1; at >= 0; at--) {
    if (t.state[at] === WON) {
      winnable[at] = 1;
      games[at] = 1;
      wins[at] = 1;
      pWin.U[at] = 1;
      pWin.S[at] = 1;
      continue;
    }
    if (t.state[at] === STUCK) {
      games[at] = 1;
      continue;
    }
    for (let c = 0; c < nc; c++) {
      const to = t.child[at * nc + c] as number;
      if (to < 0) continue;
      winnable[at] = (winnable[at] as number) | (winnable[to] as number);
      add(games, at, games[to] as number);
      add(wins, at, wins[to] as number);
    }
    if (t.offWin[at]) winnable[at] = 1;
    for (const w of ['U', 'S'] as const) {
      const m = choices(t, at, w);
      let sum = 0;
      for (let c = 0; c < nc; c++) if (m & (1 << c)) sum += pWin[w][t.child[at * nc + c] as number] as number;
      pWin[w][at] = sum / bits(m);
    }
  }
  // Forced: one legal pick at each step from here to the end. Sure: every line from here wins.
  const forced = new Uint8Array(n);
  const sure = new Uint8Array(n);
  for (let at = n - 1; at >= 0; at--) {
    if (t.state[at] !== PLAYING) {
      forced[at] = 1;
      sure[at] = t.state[at] === WON ? 1 : 0;
      continue;
    }
    const open = t.open[at] as number;
    let all = 1;
    for (let c = 0; c < nc; c++) {
      if (!(open & (1 << c))) continue;
      const to = t.child[at * nc + c] as number;
      if (bits(open) === 1) forced[at] = forced[to] as number;
      if (to < 0 || !sure[to]) all = 0;
    }
    sure[at] = all;
  }
  // With only the sensible player's positions, the picks it never makes are not followed: sure is not known.
  const marks = { winnable, forced, sure: t.only ? null : sure };
  let traps = 0;
  const isTrap = (at: number, m: number) => {
    if (!winnable[at]) return false;
    for (let c = 0; c < nc; c++) if (m & (1 << c) && !winnable[t.child[at * nc + c] as number]) return true;
    return false;
  };
  for (let at = 0; at < n; at++) if (t.state[at] === PLAYING && isTrap(at, choices(t, at, 'U'))) traps++;
  const per = {
    ...(t.only ? {} : { U: forward(game, t, 'U', marks, pWin.U) }),
    S: forward(game, t, 'S', marks, pWin.S),
  };
  let won = 0;
  let stuck = 0;
  for (let at = 0; at < n; at++) {
    if (t.state[at] === WON) won++;
    if (t.state[at] === STUCK) stuck++;
  }
  return {
    positions: n,
    layers: t.layers.length,
    terminal: { won, stuck },
    winnable: winnable.reduce((a, b) => a + b, 0),
    traps,
    log10Games: Math.log10(games[0] as number),
    log10Wins: Math.log10(wins[0] as number),
    winningGames: (wins[0] as number) / (games[0] as number),
    per,
  };
}

/** Everything that is counted along games: a pass forward with the chance of reaching each position. */
function forward(
  game: Game,
  t: Tree,
  w: Weighting,
  marks: { winnable: Uint8Array; forced: Uint8Array; sure: Uint8Array | null },
  pWin: Float64Array,
): PerWeighting {
  const { winnable, forced, sure } = marks;
  const n = t.size;
  const nc = t.columns;
  const reach = new Float64Array(n);
  reach[0] = 1;
  const points = { forcedWon: point(), forcedLost: point(), decided: point(), playerDecided: point() };
  const peeled = (at: number) => 1 - (t.pixelsLeft[at] as number) / game.pixels;
  // The first position of a game that is forced, sure, or that this player can no longer lose from.
  const arrive = (from: number, to: number, mass: number) => {
    if (forced[to] && (from < 0 || !forced[from])) mark(winnable[to] ? points.forcedWon : points.forcedLost, peeled(to), mass);
    if (sure?.[to] && (from < 0 || !sure[from])) mark(points.decided, peeled(to), mass);
    if (pWin[to] === 1 && (from < 0 || pWin[from] !== 1)) mark(points.playerDecided, peeled(to), mass);
  };
  arrive(-1, 0, 1);
  // Per position, the chance of being there with the last pick down column c in a free run of length r (1..RUN,
  // RUN standing for RUN or more), at index c * RUN + r − 1; no entry for a run of 0.
  const runs = new Map<number, Float64Array>();
  // Per position that cannot be won, the chance of being there by the pick index of the fatal pick.
  const fatal = new Map<number, Float64Array>();
  const maxPicks = t.layers.length + 1;
  const out: PerWeighting = {
    win: pWin[0] as number,
    picksPerGame: 0,
    seen: 0,
    stuckByPicks: new Array(maxPicks).fill(0),
    stuckByPixelsLeft: new Array(10).fill(0),
    trapsPerGame: 0,
    trapsPerWonGame: 0,
    trapsPerLostGame: 0,
    fallChance: 0,
    deadEnd: new Array(maxPicks).fill(0),
    deadEndMean: 0,
    fatalAtPick: new Array(maxPicks).fill(0),
    pixelsLeftAtFatal: 0,
    pixelsLeftAtStuck: 0,
    digs: 0,
    chosenDigs: 0,
    forcedDigs: 0,
    blindDigs: 0,
    freeShare: new Array(game.buckets + 1).fill(0),
    inRunsShare: 0,
    forcedWon: point(),
    forcedLost: point(),
    decided: point(),
    playerDecided: point(),
  };
  let trapWinMass = 0;
  let fallMass = 0;
  let inRuns = 0;
  for (let at = 0; at < n; at++) {
    const r = reach[at] as number;
    const run = runs.get(at);
    runs.delete(at);
    const fat = fatal.get(at);
    fatal.delete(at);
    if (r === 0) continue;
    out.seen += 1;
    if (t.state[at] !== PLAYING) {
      if (t.state[at] === STUCK) {
        const k = t.layer[at] as number;
        add(out.stuckByPicks, k, r);
        const share = (t.pixelsLeft[at] as number) / game.pixels;
        add(out.stuckByPixelsLeft, Math.min(9, Math.floor(share * 10)), r);
        out.pixelsLeftAtStuck += r * (t.pixelsLeft[at] as number);
        if (fat) fat.forEach((v, f) => add(out.deadEnd, k - f, v));
      }
      continue;
    }
    const m = choices(t, at, w);
    const each = r / bits(m);
    const digs = t.dig[at] as number;
    const anyOpen = (choices(t, at, 'U') & ~digs) !== 0;
    out.picksPerGame += r;
    add(out.freeShare, t.free[at] as number, r);
    let trap = false;
    let lose = 0;
    for (let c = 0; c < nc; c++) {
      if (!(m & (1 << c))) continue;
      const to = t.child[at * nc + c] as number;
      add(reach, to, each);
      arrive(at, to, each);
      const isDig = (digs >> c) & 1;
      if (isDig) {
        out.digs += each;
        if (anyOpen) out.chosenDigs += each;
        else out.forcedDigs += each;
        if (((t.blind[at] as number) >> c) & 1) out.blindDigs += each;
      } else {
        // A pick that reaches pixels: the run down column c grows, or starts at 1.
        let into = runs.get(to);
        if (!into) runs.set(to, (into = new Float64Array(nc * RUN)));
        let start = each;
        if (run) {
          for (let len = 1; len <= RUN; len++) {
            const v = run[c * RUN + len - 1] as number;
            if (!v) continue;
            start -= v / bits(m);
            const grown = Math.min(RUN, len + 1);
            add(into, c * RUN + grown - 1, v / bits(m));
            if (len + 1 === RUN) inRuns += (RUN * v) / bits(m);
            else if (len === RUN) inRuns += v / bits(m);
          }
        }
        add(into, c * RUN, start);
      }
      if (winnable[at] && !winnable[to]) {
        trap = true;
        lose += each;
        let into = fatal.get(to);
        if (!into) fatal.set(to, (into = new Float64Array(maxPicks)));
        add(into, (t.layer[at] as number) + 1, each);
        add(out.fatalAtPick, (t.layer[at] as number) + 1, each);
        out.pixelsLeftAtFatal += each * (t.pixelsLeft[to] as number);
      } else if (fat) {
        let into = fatal.get(to);
        if (!into) fatal.set(to, (into = new Float64Array(maxPicks)));
        for (let f = 0; f < maxPicks; f++) add(into, f, (fat[f] as number) / bits(m));
      }
    }
    if (trap) {
      out.trapsPerGame += r;
      fallMass += lose;
      // The chance of winning from here, weighted by being here: the visits that belong to won games.
      trapWinMass += r * (winnable[at] ? (pWin[at] as number) : 0);
    }
  }
  const lost = 1 - out.win;
  out.trapsPerWonGame = out.win > 0 ? trapWinMass / out.win : 0;
  out.trapsPerLostGame = lost > 0 ? (out.trapsPerGame - trapWinMass) / lost : 0;
  out.fallChance = out.trapsPerGame > 0 ? fallMass / out.trapsPerGame : 0;
  out.deadEndMean = lost > 0 ? out.deadEnd.reduce((s, v, d) => s + v * d, 0) / lost : 0;
  if (lost > 0) {
    out.deadEnd = out.deadEnd.map((v) => v / lost);
    out.fatalAtPick = out.fatalAtPick.map((v) => v / lost);
    out.pixelsLeftAtFatal /= lost;
    out.pixelsLeftAtStuck /= lost;
  }
  out.freeShare = out.freeShare.map((v) => v / out.picksPerGame);
  out.inRunsShare = inRuns / out.picksPerGame;
  out.forcedWon = close(points.forcedWon, out.win);
  out.forcedLost = close(points.forcedLost, lost);
  out.decided = sure ? close(points.decided, out.win) : { byTenth: [], mean: NaN };
  out.playerDecided = close(points.playerDecided, out.win);
  return out;
}

/** Where in a game a point falls: the share of the picture peeled there, by tenths, and its mean. */
export interface Point {
  byTenth: number[];
  mean: number;
}

function point(): Point {
  return { byTenth: new Array(11).fill(0), mean: 0 };
}

function mark(p: Point, peeled: number, mass: number): void {
  add(p.byTenth, Math.floor(peeled * 10 + 1e-9), mass);
  p.mean += peeled * mass;
}

/** As shares of the games it belongs to. */
function close(p: Point, games: number): Point {
  return games > 0 ? { byTenth: p.byTenth.map((v) => v / games), mean: p.mean / games } : p;
}

export function gameOf(l: Level): Game {
  return new Game(poolPicture(l.rows), l.columns, l.structure.buckets);
}

/** Along one line of picks: the share peeled where it has no choice left, and where it can no longer lose. */
export function lineOf(game: Game, picks: number[]): { forced: number; decided: number } {
  const solver = new Solver(game);
  const line = [game.start()];
  for (const c of picks) line.push(game.pick(line[line.length - 1] as Position, c) as Position);
  // Both hold from their point to the end, so they are found from the end backwards, where the searches are short.
  const first = (holds: (p: Position) => boolean) => {
    let i = line.length;
    while (i > 0 && holds(line[i - 1] as Position)) i--;
    return i < line.length ? 1 - (line[i] as Position).left / game.pixels : NaN;
  };
  return { forced: first((p) => forcedFrom(game, p)), decided: first((p) => solver.allWin(p)) };
}

/** Workers that expand a layer's positions between them, each a slice in order. */
function workers(number: number, only: 'S' | undefined, size: number): { expand: Expander; close: () => void } {
  const pool = Array.from({ length: size }, () => new Worker(new URL('./tree-worker.ts', import.meta.url), { workerData: { number, only } }));
  const one = (w: Worker, keys: string[]) =>
    new Promise<Expansion[]>((resolve, reject) => {
      const fail = (e: Error) => reject(e);
      w.once('error', fail);
      w.once('message', (out: Expansion[]) => {
        w.off('error', fail);
        resolve(out);
      });
      w.postMessage(keys);
    });
  const expand: Expander = async (keys) => {
    const per = Math.ceil(keys.length / size);
    const parts = await Promise.all(pool.map((w, i) => one(w, keys.slice(i * per, (i + 1) * per))));
    return parts.flat();
  };
  return { expand, close: () => pool.forEach((w) => void w.terminate()) };
}

async function main(args: string[]): Promise<void> {
  const number = Number(args[0]);
  const option = (name: string, otherwise: number) => (args.includes(name) ? Number(args[args.indexOf(name) + 1]) : otherwise);
  const limit = option('--limit', Infinity);
  const threads = option('--workers', 1);
  const level = (levelsFile as unknown as Level[]).find((l) => l.number === number);
  if (!level) throw new Error(`no level ${args[0]}`);
  const only = args.includes('--sensible') ? 'S' : undefined;
  const game = gameOf(level);
  const pool = threads > 1 ? workers(number, only, threads) : null;
  const tree = await explore(game, limit, (line) => console.log(line), only, pool?.expand);
  pool?.close();
  const searched = tree.offPositions >= 0 ? `searched ${tree.offPositions}` : 'searched in each worker';
  console.log(
    `explored ${tree.size} positions${only ? ` the sensible player reaches, and ${searched} off its games,` : ''} in ${tree.seconds.toFixed(1)} s${tree.complete ? '' : ' (stopped: incomplete)'}`,
  );
  console.log(`solver line: ${JSON.stringify(lineOf(game, level.winningOrder))}`);
  if (!tree.complete) return;
  const m = solve(game, tree);
  const file = `${outDir('tree')}/${number}${only ? '-sensible' : ''}.json`;
  writeFileSync(file, JSON.stringify({ level: number, band: level.band, buckets: game.buckets, pixels: game.pixels, only, offPositions: tree.offPositions, seconds: tree.seconds, layerStarts: tree.layers, ...m }, null, 1));
  console.log(report(m, game));
}

/** The measures as lines a person reads; shares as percentages, distributions as their nonzero entries. */
function report(m: Measures, game: Game): string {
  const pc = (v: number) => `${(100 * v).toFixed(1)}%`;
  const dist = (a: number[], label: (i: number) => string) =>
    a.flatMap((v, i) => (v >= 0.0005 ? [`${label(i)} ${pc(v)}`] : [])).join(', ');
  const lines = [
    `${m.positions} positions in ${m.layers} layers; ${m.winnable} winnable, ${m.traps} traps; ${m.terminal.stuck} stuck ends`,
    `games 10^${m.log10Games.toFixed(2)}, winning 10^${m.log10Wins.toFixed(2)} (${pc(m.winningGames)} of all sequences of picks)`,
  ];
  for (const w of ['U', 'S'] as const) {
    const p = m.per[w];
    if (!p) continue;
    lines.push(
      `${w}: wins ${pc(p.win)}, reaches ${p.seen} positions, ${p.picksPerGame.toFixed(1)} picks a game`,
      `  traps met a game ${p.trapsPerGame.toFixed(2)} (won games ${p.trapsPerWonGame.toFixed(2)}, lost ${p.trapsPerLostGame.toFixed(2)}), each lost by ${pc(p.fallChance)} of the picks made there`,
      `  stuck after picks: ${dist(p.stuckByPicks, (i) => `${i}`)}`,
      `  stuck with pixels left: ${dist(p.stuckByPixelsLeft, (i) => `${i * 10}–${i * 10 + 10}%`)}`,
      `  fatal pick (of lost games): ${dist(p.fatalAtPick, (i) => `#${i}`)}`,
      `  picks between fatal and stuck: ${dist(p.deadEnd, (i) => `${i}`)}; mean ${p.deadEndMean.toFixed(2)}; pixels left ${p.pixelsLeftAtFatal.toFixed(0)} → ${p.pixelsLeftAtStuck.toFixed(0)} of ${game.pixels}`,
      `  digs a game ${p.digs.toFixed(2)} (chosen ${p.chosenDigs.toFixed(2)}, forced ${p.forcedDigs.toFixed(2)}, blind ${p.blindDigs.toFixed(3)})`,
      `  picks with k of ${game.buckets} buckets free: ${dist(p.freeShare, (i) => `${i}`)}; picks in free runs ${pc(p.inRunsShare)}`,
      ...(
        [
          ['no choice left, won games', p.forcedWon],
          ['no choice left, lost games', p.forcedLost],
          ['no line can lose, won games', p.decided],
          [`${w} can no longer lose, won games`, p.playerDecided],
        ] as const
      ).map(([what, q]) => `  peeled where ${what}: mean ${pc(q.mean)}; ${dist(q.byTenth, (i) => (i === 10 ? '100%' : `${i * 10}–${i * 10 + 10}%`))}`),
    );
  }
  return lines.join('\n');
}

if (import.meta.main) await main(process.argv.slice(2));
