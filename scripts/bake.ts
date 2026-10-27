// Bakes the scene levels into src/levels.json, offline, one worker per level. A baked level's deal is the level:
// it is kept as stored for as long as its scene draws the same squares, and a scene drawn in other letters
// relabels it (the same pots, renumbered), so a recolour never changes how a level plays. Only a level that is
// new, whose squares changed, or that is named is dealt and measured.
//
//   npm run bake                      keep or relabel the stored levels; bake the new and the changed ones
//   npm run bake -- 21 22             bake those levels again from their scenes; keep or relabel the others
//   npm run bake -- --check           fail if src/levels.json is not what `npm run bake` would make
//   npm run bake -- --judge [21 22]   judge the stored levels (or those) on their own deals and hold-out games under
//                                     the band rules as they are now, and say which they hold and which pass the
//                                     careless cap and the decided floor; writes nothing

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { gaugeMisreads, letterMap, relabel, type Gates, type Holdout, type Level } from '../src/levels.ts';
import { SCENES, sceneRows } from '../src/scenes.ts';

const LEVELS_FILE = 'src/levels.json';
const check = process.argv.includes('--check');
const judging = process.argv.includes('--judge');
const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);

type Job = { number: number } | { judge: Level };
type Judged = { holdout: Holdout; fit: string; gates: Gates; gatesFit: string };
type Reply = { result?: Level | Judged; error?: string };

/** Runs the jobs on a pool of workers and returns their results in order. */
async function runAll(jobs: Job[]): Promise<NonNullable<Reply['result']>[]> {
  const results: NonNullable<Reply['result']>[] = new Array(jobs.length);
  let next = 0;
  const failed: string[] = [];
  const size = Math.min(availableParallelism(), jobs.length);
  await Promise.all(
    Array.from({ length: size }, async () => {
      const worker = new Worker(new URL('./bake-worker.ts', import.meta.url));
      worker.on('message', (m: { log?: string }) => m.log && console.log(m.log));
      try {
        while (next < jobs.length) {
          const id = next++;
          const reply = await new Promise<Reply>((resolve) => {
            const done = (m: Reply & { log?: string }) => {
              if (m.log) return;
              worker.off('message', done);
              resolve(m);
            };
            worker.on('message', done);
            worker.postMessage(jobs[id]);
          });
          if (reply.error) failed.push(reply.error);
          else results[id] = reply.result as NonNullable<Reply['result']>;
        }
      } finally {
        await worker.terminate();
      }
    }),
  );
  if (failed.length) {
    for (const f of failed) console.error(f);
    console.error(`${failed.length} of ${jobs.length} levels failed; nothing was written`);
    process.exit(1);
  }
  return results;
}

function format(levels: Level[]): string {
  const field = ([k, v]: [string, unknown]) =>
    k === 'rows'
      ? `    "rows": [\n${(v as string[]).map((r) => `      ${JSON.stringify(r)}`).join(',\n')}\n    ]`
      : `    ${JSON.stringify(k)}: ${JSON.stringify(v)}`;
  return `[\n${levels.map((l) => `  {\n${Object.entries(l).map(field).join(',\n')}\n  }`).join(',\n')}\n]\n`;
}

/** A stored level as its scene draws it now: kept, relabelled, or null when its squares changed. */
function current(l: Level): Level | null {
  const scene = SCENES[l.number - 1];
  if (!scene || scene.title !== l.title) return null;
  const rows = sceneRows(scene, l.sceneSeed);
  const map = letterMap(l.rows, rows);
  if (!map) return null;
  const { overrides, ...level } = Object.entries(map).some(([from, to]) => from !== to) ? relabel(l, rows) : l;
  return scene.overrides ? { ...level, overrides: scene.overrides } : (level as Level);
}

const started = Date.now();
const stored = existsSync(LEVELS_FILE) ? (JSON.parse(readFileSync(LEVELS_FILE, 'utf8')) as Level[]) : [];
if (judging) {
  const named = stored.filter((l) => !only.length || only.includes(l.number));
  const judged = (await runAll(named.map((l) => ({ judge: l })))) as Judged[];
  const point = (x: number | null) => (x === null ? '–' : x.toFixed(2));
  named.forEach((l, i) => {
    const j = judged[i] as Judged;
    const g = j.gates;
    console.log(
      `level ${String(l.number).padStart(2)} ${l.band.padEnd(9)} casual ${l.casualWins} hold-out ${j.holdout.casualWins} ` +
        `thinkers ${l.thinkers.join(' ')} hold-out ${j.holdout.thinkers.join(' ')}: ${l.misses ? 'closest deal' : j.fit === 'in' ? 'holds' : `OUT, ${j.fit}`}; ` +
        `random ${g.randomWins} sticky ${g.stickyWins} decided ${point(g.decided)} line ${point(g.decidedLine)}: ${j.gatesFit === 'in' ? 'passes the gates' : `FAILS, ${j.gatesFit}`}` +
        (gaugeMisreads(g.randomWins, l.casualWins) ? '; the random player beats the casual share' : ''),
    );
  });
  const out = judged.filter((j) => j.fit !== 'in').length;
  const failed = judged.filter((j) => j.gatesFit !== 'in').length;
  console.log(`judged ${named.length} levels in ${Math.round((Date.now() - started) / 1000)} s; ${out} out of band, ${failed} failing a gate`);
  process.exit(0);
}
const all = SCENES.map((_, i) => i + 1);
const kept = new Map<number, Level>();
for (const l of stored) {
  const now = only.includes(l.number) ? null : current(l);
  if (now) kept.set(l.number, now);
}
const toBake = all.filter((n) => !kept.has(n));
if (check && toBake.length) {
  console.error(`levels ${toBake.join(', ')} must be baked: their scenes draw other squares, or they are new`);
  process.exit(1);
}
const baked = (await runAll(toBake.map((number) => ({ number })))) as Level[];
const levels = all.map((n) => kept.get(n) ?? (baked[toBake.indexOf(n)] as Level));
for (const l of levels)
  console.log(
    `level ${String(l.number).padStart(2)} ${l.band.padEnd(9)} ${l.title.padEnd(24)} buckets ${l.structure.buckets} ` +
      `strength ${l.strength} depth ${l.depth} casual ${(l.casualWins / 200).toFixed(3)} thinkers ${l.thinkers.join(' ')} ` +
      `full ${l.fullSight} luck ${l.luck} pots ${l.columns.flat().length}${l.misses ? ` MISSES ${l.misses}` : ''}`,
  );
const text = format(levels);
console.log(`made ${levels.length} levels in ${Math.round((Date.now() - started) / 1000)} s`);
if (check) {
  if (readFileSync(LEVELS_FILE, 'utf8') !== text) {
    console.error(`${LEVELS_FILE} is not what the bake makes: bake again and commit it`);
    process.exit(1);
  }
  console.log(`${LEVELS_FILE} matches the bake`);
} else writeFileSync(LEVELS_FILE, text);
