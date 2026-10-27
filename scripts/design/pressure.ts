// What a level asks of a player's nerve, beside how far ahead they must look, and what it gives away for free:
// picks that hold a bucket because their colour cannot be reached yet, how few buckets are free when a pick is
// made, and runs of picks down one column that each lift pixels at once.
//
//   npm run design:pressure -- measure 60-90   measure the stored levels, one file each under out/pressure/
//   npm run design:pressure -- table           a row per measured level, the medians per band, and the rank
//                                              correlation of each measure with the band
//
// Per pick, on the board the player picks on:
//   - dig: the top pot's colour reaches no pixel now, so the pot holds its bucket and lifts nothing; it is taken to
//     get at the pots below it. In the rules a held pot has always lifted all it can, so every pot in a bucket at
//     pick time is one that is waiting: the buckets held are the buckets blocked.
//   - forced dig: a dig while no column's top pot reaches anything; a chosen dig: one while some top pot does.
//   - blind dig: a dig whose column shows no pot below it (the 2nd and 3rd of VISIBLE) that reaches anything now,
//     so it is made for what is off screen, or for what a later pick may open.
//   - free buckets: how many buckets are free when the pick is made, from 1 (a dig then fills the last one and
//     the game is lost) up to all of them; counted, not taken as a share of the buckets.
//   - free run: picks in a row from one column, each of them reaching pixels at once; a pick counts when its run
//     is RUN or longer.
// Lines measured: the solver's winning order; the fewest digs any winning line needs (a search over digs, with a
// budget); the sensible player on games 1–200; a sticky player on games 1–200, who picks the column of the last
// pick again while its top pot reaches pixels and otherwise plays as the sensible player; the thinker of the
// level's depth on games 1–20.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { play } from '../../src/generator.ts';
import levelsFile from '../../src/levels.json' with { type: 'json' };
import { CASUAL_GAMES, THINKER_GAMES, VISIBLE, type Band, type Level } from '../../src/levels.ts';
import { poolPicture, type Picture } from '../../src/picture.ts';
import { seededRng, type Rng } from '../../src/rng.ts';
import { createBoard, pick, reachable, status, type Board, type Pot } from '../../src/rules.ts';
import { thinkerPick } from '../../src/thinker.ts';
import { outDir } from './common.ts';

const levels = levelsFile as unknown as Level[];
const DIG_BUDGET = 200_000;
const RUN = 3;

interface Pick {
  column: number;
  dig: boolean;
  forced: boolean;
  blind: boolean;
  free: number;
}

/** What one pick is, on the board it is made on. */
function classify(b: Board, column: number): Pick {
  const free = reachable(b);
  const opens = (p: Pot | undefined) => !!p && (free[p.colour] as number) > 0;
  const col = b.columns[column] as Pot[];
  const dig = !opens(col[0]);
  return {
    column,
    dig,
    forced: dig && !b.columns.some((c) => opens(c[0])),
    blind: dig && !col.slice(1, VISIBLE).some(opens),
    free: b.buckets - b.held.length,
  };
}

/** Plays picks in turn and says what each one was. */
function line(picture: Picture, columns: Pot[][], buckets: number, picks: number[]): Pick[] {
  let b = createBoard(picture, columns, buckets);
  return picks.map((c) => {
    const p = classify(b, c);
    b = (pick(b, c) as { board: Board }).board;
    return p;
  });
}

/** Plays a game whose picks a chooser makes, and says what each one was. */
function game(picture: Picture, columns: Pot[][], buckets: number, choose: (b: Board, last: number) => number) {
  let b = createBoard(picture, columns, buckets);
  const picks: Pick[] = [];
  let last = -1;
  while (status(b) === 'playing') {
    last = choose(b, last);
    picks.push(classify(b, last));
    b = (pick(b, last) as { board: Board }).board;
  }
  return { won: status(b) === 'won', picks };
}

/** The sensible player's pick: a column whose top pot reaches pixels, else any, at random. */
function sensiblePick(b: Board, rng: Rng): number {
  const free = reachable(b);
  let open = b.columns.flatMap((c, i) => (c.length ? [i] : []));
  const useful = open.filter((i) => (free[(b.columns[i] as Pot[])[0]?.colour as number] as number) > 0);
  if (useful.length) open = useful;
  return open[Math.floor(rng() * open.length)] as number;
}

/** The free runs of a line: how many picks are in runs of RUN or more, and the longest run. */
function runs(picks: Pick[]): { inRuns: number; longest: number } {
  let inRuns = 0;
  let longest = 0;
  let run = 0;
  picks.forEach((p, i) => {
    run = p.dig ? 0 : i > 0 && picks[i - 1]?.column === p.column && run > 0 ? run + 1 : 1;
    longest = Math.max(longest, run);
    const ends = i === picks.length - 1 || picks[i + 1]?.column !== p.column || !!picks[i + 1]?.dig;
    if (ends && run >= RUN) inRuns += run;
  });
  return { inRuns, longest };
}

interface Tally {
  games: number;
  won: number;
  picks: number;
  digs: number;
  forced: number;
  blind: number;
  /** Picks made with exactly 1 and exactly 2 buckets free. */
  free1: number;
  free2: number;
  inRuns: number;
  /** The longest free run of each game, summed, and the longest of all. */
  longest: number;
  maxRun: number;
}

function tally(lines: { won: boolean; picks: Pick[] }[]): Tally {
  const all = lines.flatMap((l) => l.picks);
  const r = lines.map((l) => runs(l.picks));
  return {
    games: lines.length,
    won: lines.filter((l) => l.won).length,
    picks: all.length,
    digs: all.filter((p) => p.dig).length,
    forced: all.filter((p) => p.forced).length,
    blind: all.filter((p) => p.blind).length,
    free1: all.filter((p) => p.free === 1).length,
    free2: all.filter((p) => p.free === 2).length,
    inRuns: r.reduce((n, x) => n + x.inRuns, 0),
    longest: r.reduce((n, x) => n + x.longest, 0),
    maxRun: Math.max(0, ...r.map((x) => x.longest)),
  };
}

/**
 * The fewest digs a winning line needs: a depth-first search that allows k digs, for k = 0, 1, …, positions seen
 * with no fewer digs left pruned. Null when the budget runs out first; also returns that line.
 */
function fewestDigs(picture: Picture, columns: Pot[][], buckets: number): { digs: number; picks: number[] } | null {
  let nodes = 0;
  for (let k = 0; k <= 60; k++) {
    const seen = new Map<string, number>();
    const picks: number[] = [];
    const key = (b: Board) => {
      let h = 0x811c9dc5;
      for (const c of b.cells) h = Math.imul(h ^ (c + 2), 0x01000193) >>> 0;
      return `${b.columns.map((c) => c.length).join(',')}|${b.held.map((p) => `${p.colour}:${p.left}`).join(',')}|${h}`;
    };
    const dfs = (b: Board, left: number): boolean | null => {
      const s = status(b);
      if (s === 'won') return true;
      if (s === 'stuck') return false;
      const id = key(b);
      if ((seen.get(id) ?? -1) >= left) return false;
      seen.set(id, left);
      const free = reachable(b);
      let unknown = false;
      for (let c = 0; c < b.columns.length; c++) {
        const top = (b.columns[c] as Pot[])[0];
        if (!top) continue;
        const dig = (free[top.colour] as number) <= 0;
        if (dig && left === 0) continue;
        if (++nodes > DIG_BUDGET) return null;
        picks.push(c);
        const r = dfs((pick(b, c) as { board: Board }).board, dig ? left - 1 : left);
        if (r === true) return true;
        picks.pop();
        if (r === null) unknown = true;
      }
      return unknown ? null : false;
    };
    const r = dfs(createBoard(picture, columns, buckets), k);
    if (r === true) return { digs: k, picks };
    if (r === null) return null;
  }
  return null;
}

function measureLevel(l: Level) {
  const picture = poolPicture(l.rows);
  const b = l.structure.buckets;
  const solver = tally([{ won: true, picks: line(picture, l.columns, b, l.winningOrder) }]);
  const few = fewestDigs(picture, l.columns, b);
  const fewest = few && tally([{ won: true, picks: line(picture, l.columns, b, few.picks) }]);
  const sensible = tally(
    Array.from({ length: CASUAL_GAMES }, (_, i) => {
      const g = play(picture, l.columns, b, i + 1, 'sensible');
      return { won: g.won, picks: line(picture, l.columns, b, g.picks) };
    }),
  );
  const sticky = tally(
    Array.from({ length: CASUAL_GAMES }, (_, i) => {
      const rng = seededRng(i + 1);
      return game(picture, l.columns, b, (board, last) => {
        const top = board.columns[last]?.[0];
        return top && (reachable(board)[top.colour] as number) > 0 ? last : sensiblePick(board, rng);
      });
    }),
  );
  const thinker = tally(
    Array.from({ length: THINKER_GAMES }, (_, i) => {
      const rng = seededRng(i + 1);
      return game(picture, l.columns, b, (board) => thinkerPick(board, { sight: VISIBLE, depth: l.depth }, rng));
    }),
  );
  return { number: l.number, band: l.band, buckets: b, casual: l.casualWins / CASUAL_GAMES, depth: l.depth, solver, fewest, sensible, sticky, thinker };
}

type Row = ReturnType<typeof measureLevel>;

function range(arg: string): number[] {
  return arg.split(',').flatMap((part) => {
    const [a, z] = part.split('-').map(Number) as [number, number?];
    return z === undefined ? [a] : Array.from({ length: z - a + 1 }, (_, i) => a + i);
  });
}

const BANDS: Band[] = ['easy', 'medium', 'hard', 'very hard'];
const per = (t: Tally | null, k: keyof Tally, by: keyof Tally) => (t ? (t[k] as number) / Math.max(1, t[by] as number) : NaN);

/** The measures of a row, by name: counts per game, and shares of picks. */
function measures(r: Row): Record<string, number> {
  return {
    casual: r.casual,
    depth: r.depth,
    'solver digs': r.solver.digs,
    'solver blind': r.solver.blind,
    'solver 1 free': per(r.solver, 'free1', 'picks'),
    'solver in runs': per(r.solver, 'inRuns', 'picks'),
    'solver longest run': r.solver.maxRun,
    'fewest digs': r.fewest?.digs ?? NaN,
    'fewest blind': r.fewest?.blind ?? NaN,
    'fewest 1 free': per(r.fewest, 'free1', 'picks'),
    'sensible digs/game': per(r.sensible, 'digs', 'games'),
    'sensible 1 free': per(r.sensible, 'free1', 'picks'),
    'sensible 2 free': per(r.sensible, 'free2', 'picks'),
    'sensible in runs': per(r.sensible, 'inRuns', 'picks'),
    'sticky wins': per(r.sticky, 'won', 'games'),
    'sticky in runs': per(r.sticky, 'inRuns', 'picks'),
    'sticky longest run/game': per(r.sticky, 'longest', 'games'),
    'thinker wins': per(r.thinker, 'won', 'games'),
    'thinker digs/game': per(r.thinker, 'digs', 'games'),
    'thinker chosen digs/game': (r.thinker.digs - r.thinker.forced) / r.thinker.games,
    'thinker blind/game': per(r.thinker, 'blind', 'games'),
    'thinker 1 free': per(r.thinker, 'free1', 'picks'),
    'thinker 2 free': per(r.thinker, 'free2', 'picks'),
    'thinker in runs': per(r.thinker, 'inRuns', 'picks'),
  };
}

/** Spearman's rank correlation, ties at their mean rank. */
function spearman(xs: number[], ys: number[]): number {
  const rank = (v: number[]) => {
    const order = v.map((x, i) => [x, i] as const).sort((a, b) => a[0] - b[0]);
    const r = new Array<number>(v.length);
    for (let i = 0; i < order.length; ) {
      let j = i;
      while (j + 1 < order.length && order[j + 1]?.[0] === order[i]?.[0]) j++;
      for (let k = i; k <= j; k++) r[(order[k] as readonly [number, number])[1]] = (i + j) / 2;
      i = j + 1;
    }
    return r;
  };
  const a = rank(xs);
  const b = rank(ys);
  const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / v.length;
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += ((a[i] as number) - ma) * ((b[i] as number) - mb);
    da += ((a[i] as number) - ma) ** 2;
    db += ((b[i] as number) - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

const [command, arg = ''] = process.argv.slice(2);
const dir = outDir('pressure');
if (command === 'measure') {
  for (const n of range(arg)) {
    const l = levels.find((x) => x.number === n);
    if (!l) throw new Error(`no level ${n}`);
    const started = Date.now();
    writeFileSync(`${dir}/${n}.json`, JSON.stringify(measureLevel(l)));
    console.log(`level ${n} in ${Math.round((Date.now() - started) / 1000)} s`);
  }
} else if (command === 'table') {
  const rows = readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as Row)
    .sort((a, b) => a.number - b.number);
  const names = Object.keys(measures(rows[0] as Row));
  const f = (x: number) => (Number.isNaN(x) ? '–' : Number.isInteger(x) ? String(x) : x.toFixed(2));
  console.log(['level', 'band', 'buckets', ...names].join(' | '));
  for (const r of rows) console.log([r.number, r.band, r.buckets, ...Object.values(measures(r)).map(f)].join(' | '));
  console.log('\nmedian per band');
  console.log(['band', 'levels', ...names].join(' | '));
  for (const band of BANDS) {
    const of = rows.filter((r) => r.band === band).map(measures);
    if (!of.length) continue;
    const median = (k: string) => {
      const v = of.map((m) => m[k] as number).filter((x) => !Number.isNaN(x)).sort((a, b) => a - b);
      return v.length ? (v[Math.floor((v.length - 1) / 2)] as number) : NaN;
    };
    console.log([band, of.length, ...names.map((k) => f(median(k)))].join(' | '));
  }
  console.log('\nSpearman with the band (easy 0 … very hard 3), and with the casual share');
  const bandRank = rows.map((r) => BANDS.indexOf(r.band));
  for (const k of names) {
    const pairs = rows.map((r, i) => [measures(r)[k] as number, bandRank[i] as number, r.casual] as const).filter(([x]) => !Number.isNaN(x));
    const xs = pairs.map((p) => p[0]);
    console.log(`${k}: band ${spearman(xs, pairs.map((p) => p[1])).toFixed(2)}, casual ${spearman(xs, pairs.map((p) => p[2])).toFixed(2)} (n ${pairs.length})`);
  }
} else throw new Error('usage: pressure.ts measure 60-90 | table');
