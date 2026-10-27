// What a level gives away to careless play, and where in a game it stops asking anything: measured along sampled
// games, with the solver of scripts/design/tree.ts saying at each position met whether it can still be won and
// whether it can still be lost. The whole tree is out of reach on most levels; the positions games meet are not.
//
//   npm run design:rating -- measure 1-90 [--games 200]   measure the stored levels, one file each under out/rating/
//   npm run design:rating -- table                        a row per measured level, then the medians per band
//
// Players, each on games 1 to --games:
//   - U: any column with pots, equally likely (seeds from 1 000 001).
//   - S: the sensible player of src/generator.ts `play`, the casual player of the bake: equally likely among the
//     columns whose top pot's colour reaches pixels now, among all when none does. Same seeds and draws as `play`,
//     so its first 200 games are the games of a level's casual share.
//   - K: the sticky player of scripts/design/pressure.ts: the column of the last pick again while its top pot reaches
//     pixels, else as S.
// Per position, as in scripts/design/tree.ts: a trap = the position can still be won and one of the picks this
// player chooses among can no longer win; the chance of falling there = the share of those picks that lose; the
// fatal pick of a lost game = the pick from a position that can be won to one that cannot; the dead-end distance =
// the picks made after it until the game is stuck; the decided point of a won game = the share of the picture peeled
// at its first position from which every line wins (no line can lose any more); a dig = the top pot's colour
// reaches nothing now; free = buckets less pots held; a free run = picks in a row down one column, none a dig,
// counted when RUN or longer. Every search has a budget of calls: a position it gives up on counts as unknown, and
// a decided point it cannot prove is kept as the latest point proved and the earliest one not refuted.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import levelsFile from '../../src/levels.json' with { type: 'json' };
import { CASUAL_GAMES, type Band, type Level } from '../../src/levels.ts';
import { seededRng } from '../../src/rng.ts';
import type { Pot } from '../../src/rules.ts';
import { outDir } from './common.ts';
import { gameOf, Solver, type Game, type Position } from './tree.ts';

const levels = levelsFile as unknown as Level[];
const RUN = 3;
/**
 * Solver calls one search may make before it gives up. Proving that every line wins from the middle of a 40×30
 * level grows about threefold per pick back (level 82: 100 000 positions at 62% peeled); a loss, where there is
 * one, is found in a few hundred.
 */
const BUDGET = 20_000;
const REFUTE_BUDGET = 2_000;
/**
 * Positions the solver may remember, both searches together, before it forgets them all. Level 21 (40×30, 5
 * buckets) ran out of a 6 GB heap with no cap, and peaked at 3.6 GB of memory with a cap of 2 000 000.
 */
const CACHE = 1_000_000;

const OUT_OF_BUDGET = new Error('out of budget');

/**
 * The solver of scripts/design/tree.ts, made to give up after a number of calls; what it decided stays decided
 * until it remembers more than CACHE positions, and then it starts again from nothing.
 */
export class Budgeted extends Solver {
  left = Infinity;
  cleared = 0;

  override winnable(p: Position): boolean {
    if (--this.left < 0) throw OUT_OF_BUDGET;
    return super.winnable(p);
  }

  override allWin(p: Position): boolean {
    if (--this.left < 0) throw OUT_OF_BUDGET;
    return super.allWin(p);
  }

  /** The answer of a search, or null when it ran out of calls first. */
  within(calls: number, search: () => boolean): boolean | null {
    if (this.memo.size + this.sure.size > CACHE) {
      this.memo.clear();
      this.sure.clear();
      this.cleared += 1;
    }
    this.left = calls;
    try {
      return search();
    } catch (e) {
      if (e === OUT_OF_BUDGET) return null;
      throw e;
    } finally {
      this.left = Infinity;
    }
  }
}

export type PlayerName = 'U' | 'S' | 'K';

/** The columns a player chooses among at a position, given the column of its last pick (−1 before the first). */
function choices(game: Game, p: Position, who: PlayerName, last: number): number[] {
  const open = game.columns.flatMap((_, c) => (game.pot(p, c) ? [c] : []));
  if (who === 'U') return open;
  const free = game.free(p);
  const opens = (c: number) => (free[(game.pot(p, c) as Pot).colour] as number) > 0;
  if (who === 'K' && last >= 0 && game.pot(p, last) && opens(last)) return [last];
  const useful = open.filter(opens);
  return useful.length ? useful : open;
}

/** One game: what it met, pick by pick. */
export interface Played {
  won: boolean;
  picks: number;
  /** Traps met, and per trap the share of the player's picks there that lose, summed. */
  traps: number;
  falls: number;
  /** Lost games: the fatal pick's number (1 = the first pick), the share peeled after it, and the picks after it. */
  fatal: number;
  fatalPeeled: number;
  deadEnd: number;
  /**
   * Won games: the share peeled where no line can lose any more, as proved; and the earliest it can be, the same
   * unless a proof ran out of calls.
   */
  decided: number;
  decidedLow: number;
  /** Positions where a search ran out of calls, so that what they hold is not known. */
  unknown: number;
  /** Picks made with k buckets free, by k. */
  free: number[];
  digs: number;
  inRuns: number;
  longest: number;
}

/** Plays one game of a player and measures it. */
export function playOne(game: Game, solver: Budgeted, who: PlayerName, seed: number): Played {
  const rng = seededRng(seed);
  const line: Position[] = [game.start()];
  const out: Played = { won: false, picks: 0, traps: 0, falls: 0, fatal: NaN, fatalPeeled: NaN, deadEnd: NaN, decided: NaN, decidedLow: NaN, unknown: 0, free: new Array(game.buckets + 1).fill(0), digs: 0, inRuns: 0, longest: 0 };
  const peeled = (p: Position) => 1 - p.left / game.pixels;
  const winnable = (p: Position) => solver.within(BUDGET, () => solver.winnable(p));
  let last = -1;
  let run = 0;
  for (let p = line[0] as Position; game.status(p) === 'playing'; p = line[line.length - 1] as Position) {
    const set = choices(game, p, who, last);
    // The sticky player keeps to its column without a draw, as in scripts/design/pressure.ts.
    const column = who === 'K' && set.length === 1 && set[0] === last ? last : (set[Math.floor(rng() * set.length)] as number);
    const can = winnable(p);
    if (can === null) out.unknown += 1;
    if (can) {
      const after = set.map((c) => winnable(game.pick(p, c) as Position));
      if (after.includes(null)) out.unknown += 1;
      const lose = after.filter((w) => w === false).length;
      if (lose > 0) {
        out.traps += 1;
        out.falls += lose / set.length;
      }
    }
    const free = game.buckets - p.held.length;
    out.free[free] = (out.free[free] as number) + 1;
    const dig = (game.free(p)[(game.pot(p, column) as Pot).colour] as number) <= 0;
    if (dig) out.digs += 1;
    // A run grows down the same column while no pick digs; it counts once it reaches RUN, every pick of it.
    if (dig) run = 0;
    else run = column === last && run > 0 ? run + 1 : 1;
    if (run === RUN) out.inRuns += RUN;
    else if (run > RUN) out.inRuns += 1;
    out.longest = Math.max(out.longest, run);
    const q = game.pick(p, column) as Position;
    line.push(q);
    out.picks += 1;
    if (can && Number.isNaN(out.fatal) && winnable(q) === false) {
      out.fatal = out.picks;
      out.fatalPeeled = peeled(q);
    }
    last = column;
  }
  out.won = game.status(line[line.length - 1] as Position) === 'won';
  if (!out.won) out.deadEnd = out.picks - out.fatal;
  else if (who !== 'K') {
    // The sticky player is measured for its runs, and its decided points are left out to save the proofs.
    ({ decided: out.decided, low: out.decidedLow } = decidedOf(game, solver, line));
  }
  return out;
}

/**
 * Along a won line of positions, the share peeled where no line can lose any more: as proved, and the earliest it
 * can be. Every line winning holds from its first position to the end, so it is found from the end backwards; where
 * a proof runs out of calls, the search goes on back for a cheap loss, and the point lies between the two.
 */
function decidedOf(game: Game, solver: Budgeted, line: Position[]): { decided: number; low: number } {
  const peeled = (p: Position) => 1 - p.left / game.pixels;
  let sure = line.length - 1;
  let stuck = false;
  let j = sure - 1;
  for (; j >= 0; j--) {
    const p = line[j] as Position;
    const all = solver.within(stuck ? REFUTE_BUDGET : BUDGET, () => solver.allWin(p));
    if (all === false) break;
    if (all === true) {
      sure = j;
      stuck = false;
    } else stuck = true;
  }
  return { decided: peeled(line[sure] as Position), low: peeled(line[j + 1] as Position) };
}

/** The decided point of a stored winning order, with the same budget. */
function solverLine(game: Game, solver: Budgeted, picks: number[]): { decided: number; low: number } {
  const line = [game.start()];
  for (const c of picks) line.push(game.pick(line[line.length - 1] as Position, c) as Position);
  return decidedOf(game, solver, line);
}

const SEED: Record<PlayerName, number> = { U: 1_000_000, S: 0, K: 0 };

export interface Summary {
  games: number;
  win: number;
  picksPerGame: number;
  trapsPerGame: number;
  trapsPerWonGame: number;
  trapsPerLostGame: number;
  /** Of the traps met, the share of the player's picks there that lose. */
  fallChance: number;
  /** Lost games: the mean and the spread of the picks after the fatal one, by count; the fatal pick by number. */
  deadEndMean: number;
  deadEnd: number[];
  fatalAt: number[];
  fatalPeeledMean: number;
  /** Won games: the decided point's mean, median, and spread by tenth of the picture peeled. */
  decidedMean: number;
  decidedMedian: number;
  decidedByTenth: number[];
  /** The same median and mean at the earliest the points can be, and the won games where a proof ran out. */
  decidedLowMedian: number;
  decidedLowMean: number;
  decidedOpen: number;
  /** Positions met a game where a search ran out of calls. */
  unknownPerGame: number;
  /** Share of picks with k buckets free, by k. */
  freeShare: number[];
  digsPerGame: number;
  inRunsShare: number;
  longestPerGame: number;
}

/** The mean of what is known: a game whose fatal pick a search could not place has no dead end. */
const mean = (v: number[]) => {
  const known = v.filter((x) => !Number.isNaN(x));
  return known.length ? known.reduce((s, x) => s + x, 0) / known.length : NaN;
};
const median = (v: number[]) => {
  const s = v.filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? (s[(s.length - 1) / 2] as number) : ((s[s.length / 2 - 1] as number) + (s[s.length / 2] as number)) / 2) : NaN;
};
const spread = (v: number[], size: number) => {
  const a = new Array<number>(size).fill(0);
  for (const x of v) a[Math.min(size - 1, x)] = (a[Math.min(size - 1, x)] as number) + 1 / v.length;
  return a;
};

export function summarise(games: Played[]): Summary {
  const won = games.filter((g) => g.won);
  const lost = games.filter((g) => !g.won);
  const picks = games.reduce((s, g) => s + g.picks, 0);
  const traps = games.reduce((s, g) => s + g.traps, 0);
  const free = games[0]?.free.map((_, k) => games.reduce((s, g) => s + (g.free[k] as number), 0) / picks) ?? [];
  const most = Math.max(1, ...games.map((g) => g.picks)) + 1;
  return {
    games: games.length,
    win: won.length / games.length,
    picksPerGame: picks / games.length,
    trapsPerGame: traps / games.length,
    trapsPerWonGame: mean(won.map((g) => g.traps)),
    trapsPerLostGame: mean(lost.map((g) => g.traps)),
    fallChance: traps ? games.reduce((s, g) => s + g.falls, 0) / traps : 0,
    deadEndMean: mean(lost.map((g) => g.deadEnd)),
    deadEnd: spread(lost.map((g) => g.deadEnd), most),
    fatalAt: spread(lost.map((g) => g.fatal), most),
    fatalPeeledMean: mean(lost.map((g) => g.fatalPeeled)),
    decidedMean: mean(won.map((g) => g.decided)),
    decidedMedian: median(won.map((g) => g.decided)),
    decidedByTenth: spread(won.map((g) => Math.floor(g.decided * 10 + 1e-9)), 11),
    decidedLowMedian: median(won.map((g) => g.decidedLow)),
    decidedLowMean: mean(won.map((g) => g.decidedLow)),
    decidedOpen: won.filter((g) => g.decidedLow < g.decided).length / Math.max(1, won.length),
    unknownPerGame: games.reduce((s, g) => s + g.unknown, 0) / games.length,
    freeShare: free,
    digsPerGame: games.reduce((s, g) => s + g.digs, 0) / games.length,
    inRunsShare: games.reduce((s, g) => s + g.inRuns, 0) / picks,
    longestPerGame: mean(games.map((g) => g.longest)),
  };
}

/** A player's games 1 to `games`, measured. */
export function sample(game: Game, solver: Budgeted, who: PlayerName, games: number): Summary {
  return summarise(Array.from({ length: games }, (_, i) => playOne(game, solver, who, SEED[who] + i + 1)));
}

export function measureLevel(l: Level, games: number) {
  const game = gameOf(l);
  const solver = new Budgeted(game);
  const per = {} as Record<PlayerName, Summary>;
  for (const who of ['U', 'S', 'K'] as const) per[who] = sample(game, solver, who, games);
  return {
    number: l.number,
    band: l.band,
    buckets: l.structure.buckets,
    pixels: game.pixels,
    casual: l.casualWins / CASUAL_GAMES,
    depth: l.depth,
    thinkers: l.thinkers,
    solverLine: solverLine(game, solver, l.winningOrder),
    positionsSolved: solver.memo.size,
    cacheCleared: solver.cleared,
    per,
  };
}

export type Row = ReturnType<typeof measureLevel>;

function range(arg: string): number[] {
  return arg.split(',').flatMap((part) => {
    const [a, z] = part.split('-').map(Number) as [number, number?];
    return z === undefined ? [a] : Array.from({ length: z - a + 1 }, (_, i) => a + i);
  });
}

const BANDS: Band[] = ['easy', 'medium', 'hard', 'very hard'];

/** The measures of a row, by name, as the table prints them; what JSON stored as null (NaN) is NaN again. */
function measures(r: Row): Record<string, number> {
  const { U, S, K } = r.per;
  const m: Record<string, number | null> = {
    casual: r.casual,
    'U win': U.win,
    'S win': S.win,
    'U−S': U.win - S.win,
    'K win': K.win,
    'decided S': S.decidedMedian,
    'S low': S.decidedLowMedian,
    'decided U': U.decidedMedian,
    'U low': U.decidedLowMedian,
    'decided line': r.solverLine.decided,
    'line low': r.solverLine.low,
    'traps S': S.trapsPerGame,
    'fall S': S.fallChance,
    'traps U': U.trapsPerGame,
    'fall U': U.fallChance,
    'dead end S': S.deadEndMean,
    'fatal peeled S': S.fatalPeeledMean,
    buckets: r.buckets,
    '1 free S': S.freeShare[1] as number,
    '1 free U': U.freeShare[1] as number,
    'runs S': S.inRunsShare,
    'runs K': K.inRunsShare,
  };
  return Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v ?? NaN]));
}

function main(argv: string[]): void {
  const [command, arg = ''] = argv;
  const flag = argv.indexOf('--games');
  const games = flag >= 0 ? Number(argv[flag + 1]) : CASUAL_GAMES;
  const dir = outDir('rating');
  if (command === 'measure') {
    for (const n of range(arg)) {
      const l = levels.find((x) => x.number === n);
      if (!l) throw new Error(`no level ${n}`);
      const started = Date.now();
      const row = measureLevel(l, games);
      writeFileSync(`${dir}/${n}.json`, JSON.stringify(row));
      console.log(`level ${n} in ${Math.round((Date.now() - started) / 1000)} s, ${row.positionsSolved} positions solved`);
    }
  } else if (command === 'table') {
    const rows = readdirSync(dir)
      .filter((f) => /^\d+\.json$/.test(f))
      .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as Row)
      .sort((a, b) => a.number - b.number);
    const names = Object.keys(measures(rows[0] as Row));
    const f = (x: number) => (Number.isNaN(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(2));
    console.log(['level', 'band', ...names].join(' | '));
    for (const r of rows) console.log([r.number, r.band, ...Object.values(measures(r)).map(f)].join(' | '));
    console.log('\nmedian per band');
    console.log(['band', 'levels', ...names].join(' | '));
    for (const band of BANDS) {
      const of = rows.filter((r) => r.band === band).map(measures);
      if (of.length) console.log([band, of.length, ...names.map((k) => f(median(of.map((m) => m[k] as number))))].join(' | '));
    }
  } else throw new Error('usage: rating.ts measure 1-90 [--games N] | table');
}

if (import.meta.main) main(process.argv.slice(2));
