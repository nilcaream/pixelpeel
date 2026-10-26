// What difficulty a picture can reach: deals it as the bake does over a grid of buckets × strength × deal seed,
// and measures each deal with the bake's measures plus three of how it plays. One JSON line per deal, appended
// to out/deals/<OUT>.jsonl. A run cut short is resumed by running it again: deals already in the file are skipped.
//
//   npm run design:deals -- run 61,62,63     the grid for these pictures (numbers as levels; see common.ts)
//   npm run design:deals -- baked 41,42      the play measures of these levels as baked
//   npm run design:deals -- time 61          one deal of a picture, timed: size a run from it
//
// Per deal: casual = share of 200 sensible games won; thinkers = share won by a depth-d thinker on the visible
// pots (d = 1.. until one wins 0.85, at most MAXDEPTH); depth = that d; solved = what the solver finds;
// luck = what a thinker that sees every pot wins over the best visible one.
// How it plays, over the 200 sensible games: freeStart = share of the picture peeled before the first pick where
// some column's top pot can reach nothing (before it, every pick is safe); freeRun = the longest run of such
// no-choice picks, as a share of the game's picks; lossAt = share peeled when a lost game got stuck.
//
// Settings, from the environment:
//   OUT=name                 the deal file (default deals)
//   BUCKETS=5,4,3  STRENGTHS=0.5,0.75,…,2  DEALS=2      the grid
//   COLUMNS=4  POTMIN=10  POTMAX=40                       the structure
//   MIRROR=1                 level n's scene mirrored left to right, for reusing a level's picture
//   SCENE_SEED=2             the picture drawn with another seed (the bake's seeds are sceneSeed·1000 + …)
//   DEAL_FROM=3              the first deal seed, to add deals to a cell already measured
//   ONLY_CASUAL=0,0.04       run the thinkers only when casual is in that range (the band being looked for)
//   MAXDEPTH=4               the deepest thinker
// More deals where a band is close: the same picture again with DEAL_FROM=3 DEALS=4, then SCENE_SEED=2 and 3,
// into one OUT, with ONLY_CASUAL set to the band's casual range. A run that takes more than an hour is split
// into several runs of a few pictures each.

import { appendFileSync, readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker, isMainThread, parentPort } from 'node:worker_threads';
import { dealFor } from '../../src/bake.ts';
import type { Level } from '../../src/levels.ts';
import { VISIBLE } from '../../src/levels.ts';
import { poolPicture, type Picture } from '../../src/picture.ts';
import { seededRng } from '../../src/rng.ts';
import { EMPTY, createBoard, pick, reachable, status, type Pot } from '../../src/rules.ts';
import { sceneRows } from '../../src/scenes.ts';
import { solve, thinkerShare } from '../../src/thinker.ts';
import { mirrored, outDir, pictureAt, type Deal } from './common.ts';

const env = process.env;
const list = (v: string | undefined, fallback: string) => (v ?? fallback).split(',').map(Number);
const BUCKETS = list(env.BUCKETS, '5,4,3');
const STRENGTHS = list(env.STRENGTHS, '0.5,0.75,1,1.25,1.5,1.75,2');
const DEALS = Number(env.DEALS ?? 2);
const MIRROR = Boolean(env.MIRROR);
const SCENE_SEED = Number(env.SCENE_SEED ?? 1);
const DEAL_FROM = Number(env.DEAL_FROM ?? 1);
const ONLY_CASUAL = env.ONLY_CASUAL ? list(env.ONLY_CASUAL, '') : null;
const MAXDEPTH = Number(env.MAXDEPTH ?? 4);
const STRUCTURE = { columns: Number(env.COLUMNS ?? 4), potMin: Number(env.POTMIN ?? 10), potMax: Number(env.POTMAX ?? 40) };
const FILE = `${outDir('deals')}/${env.OUT ?? 'deals'}.jsonl`;
const GAMES = 200;
const THINKER_GAMES = 20;
const WINS = 0.85;
const r2 = (x: number) => Math.round(x * 100) / 100;
const mean = (a: number[]) => (a.length ? r2(a.reduce((s, x) => s + x, 0) / a.length) : null);

/** The sensible games, as the bake plays them, with how they play. */
function casual(picture: Picture, columns: Pot[][], buckets: number) {
  let wins = 0;
  const freeStart: number[] = [];
  const freeRun: number[] = [];
  const lossAt: number[] = [];
  const total = picture.cells.filter((c) => c >= 0).length;
  for (let seed = 1; seed <= GAMES; seed++) {
    const rng = seededRng(seed);
    let b = createBoard(picture, columns, buckets);
    const peeled = () => 1 - b.cells.filter((c) => c !== EMPTY).length / total;
    let picks = 0;
    let run = 0;
    let longest = 0;
    let start = -1;
    while (status(b) === 'playing') {
      let open = b.columns.flatMap((c, i) => (c.length ? [i] : []));
      const free = reachable(b);
      const sensible = open.filter((i) => (free[b.columns[i]![0]!.colour] ?? 0) > 0);
      const noChoice = sensible.length === open.length;
      if (!noChoice && start < 0) start = peeled();
      run = noChoice ? run + 1 : 0;
      longest = Math.max(longest, run);
      if (sensible.length) open = sensible;
      picks++;
      b = pick(b, open[Math.floor(rng() * open.length)]!)!.board;
    }
    if (status(b) === 'won') wins++;
    else lossAt.push(peeled());
    freeStart.push(start < 0 ? 1 : start);
    freeRun.push(longest / Math.max(1, picks));
  }
  return { casual: r2(wins / GAMES), freeStart: mean(freeStart) ?? 0, freeRun: mean(freeRun) ?? 0, lossAt: mean(lossAt) };
}

function measure(picture: Picture, columns: Pot[][], buckets: number) {
  const c = casual(picture, columns, buckets);
  if (ONLY_CASUAL && (c.casual < ONLY_CASUAL[0]! || c.casual >= ONLY_CASUAL[1]!)) return { ...c, thinkers: [], skipped: true };
  const thinkers: number[] = [];
  let depth = 0;
  for (let d = 1; d <= MAXDEPTH && !depth; d++) {
    thinkers.push(thinkerShare(picture, columns, buckets, THINKER_GAMES, { sight: VISIBLE, depth: d }));
    if (thinkers[d - 1]! >= WINS) depth = d;
  }
  const solved = solve(picture, columns, buckets).result;
  const full = thinkerShare(picture, columns, buckets, THINKER_GAMES, { sight: Infinity, depth: depth || MAXDEPTH });
  return { ...c, thinkers, depth, solved, full, luck: r2(Math.max(0, full - Math.max(...thinkers))) };
}

interface Task { n: number; buckets: number; strength: number; deal: number }

function dealOne(t: Task): Deal {
  const scene = pictureAt(t.n);
  const rows = sceneRows(scene, SCENE_SEED);
  const picture = poolPicture(MIRROR ? mirrored(rows) : rows);
  const seed = SCENE_SEED * 1000 + t.buckets * 100 + 10 * Math.round(t.strength / 0.25) + t.deal;
  const { columns } = dealFor(picture, { ...STRUCTURE, buckets: t.buckets }, seed, t.strength);
  const mirror = MIRROR ? { mirror: true, title: scene.title } : {};
  return { ...t, sceneSeed: SCENE_SEED, ...mirror, seed, ...STRUCTURE, pots: columns.flat().length, ...measure(picture, columns, t.buckets) };
}

const key = (t: Task & { sceneSeed?: number; mirror?: boolean }) =>
  [t.n, t.buckets, t.strength, t.deal, t.sceneSeed ?? SCENE_SEED, t.mirror ?? MIRROR ? 'm' : ''].join(' ');

async function run(numbers: number[]) {
  let have = new Set<string>();
  try {
    have = new Set(readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map((l) => key(JSON.parse(l) as Deal)));
  } catch {
    // No file yet: nothing to skip.
  }
  const tasks = numbers
    .flatMap((n) => BUCKETS.flatMap((buckets) => STRENGTHS.flatMap((strength) => Array.from({ length: DEALS }, (_, i) => ({ n, buckets, strength, deal: DEAL_FROM + i })))))
    .filter((t) => !have.has(key(t)));
  let next = 0;
  let done = 0;
  const t0 = Date.now();
  const seconds = () => Math.round((Date.now() - t0) / 1000);
  await Promise.all(
    Array.from({ length: Math.min(Math.max(1, availableParallelism() - 2), tasks.length) }, async () => {
      const worker = new Worker(new URL(import.meta.url));
      while (next < tasks.length) {
        const t = tasks[next++]!;
        const deal = await new Promise<Deal>((resolve) => {
          worker.once('message', resolve);
          worker.postMessage(t);
        });
        appendFileSync(FILE, JSON.stringify(deal) + '\n');
        if (++done % 20 === 0) console.log(`${done}/${tasks.length} in ${seconds()} s`);
      }
      await worker.terminate();
    }),
  );
  console.log(`${tasks.length} deals in ${seconds()} s → ${FILE}${have.size ? ` (${have.size} were there already)` : ''}`);
}

function baked(numbers: number[]) {
  const levels = JSON.parse(readFileSync('src/levels.json', 'utf8')) as Level[];
  for (const l of levels.filter((l) => numbers.includes(l.number))) {
    const line = { n: l.number, band: l.band, buckets: l.structure.buckets, strength: l.strength, seed: l.seed, sceneSeed: l.sceneSeed, casualBaked: l.casualWins / 200, thinkers: l.thinkers, depth: l.depth, luck: l.luck, ...casual(poolPicture(l.rows), l.columns, l.structure.buckets) };
    appendFileSync(FILE, JSON.stringify(line) + '\n');
    console.log(JSON.stringify(line));
  }
}

if (!isMainThread) {
  parentPort?.on('message', (t: Task) => parentPort?.postMessage(dealOne(t)));
} else {
  const [mode, arg = ''] = process.argv.slice(2);
  const numbers = arg.split(',').filter(Boolean).map(Number);
  if (!numbers.length) throw new Error('usage: deals.ts run|baked|time <n,n,…>');
  if (mode === 'run') await run(numbers);
  else if (mode === 'baked') baked(numbers);
  else if (mode === 'time') {
    const t0 = Date.now();
    console.log(JSON.stringify(dealOne({ n: numbers[0]!, buckets: 4, strength: 1, deal: 1 })), `${Date.now() - t0} ms`);
  } else throw new Error('usage: deals.ts run|baked|time <n,n,…>');
}
