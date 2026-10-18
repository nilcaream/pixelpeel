// Bakes every level into src/levels.json, offline. For each block of ten levels it first measures how
// hard each of the block's pictures can be made, gives the hardest pictures to the hardest levels, and
// then bakes each level until its deal lands in its band. The bake is deterministic: the same sources
// and rules always give the same file, which is what `--check` holds the committed file to.
//
//   npm run bake            write src/levels.json
//   npm run bake -- --check  bake again and fail if src/levels.json differs
//   BACKGROUND=colour npm run bake   give every level a solid background to peel, not only the levels
//                                    scripts/sources.ts lists in SOLID_BACKGROUND

import { readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import type { LevelSpec } from '../src/bake.ts';
import { bandFor, structureFor, type Band, type Level, type Source } from '../src/levels.ts';
import type { Task } from './bake-worker.ts';
import { BLOCKS, SOLID_BACKGROUND } from './sources.ts';

const LEVELS_FILE = 'src/levels.json';
const allSolid = process.env.BACKGROUND === 'colour';
const backgroundOf = (level: number) => (allSolid || SOLID_BACKGROUND.includes(level) ? 'colour' : 'clear');
const check = process.argv.includes('--check');

/** The order a block's levels take its pictures in, hardest picture first. */
const HARDEST_FIRST: readonly Band[] = ['very hard', 'hard', 'medium', 'easy'];

/** Runs the tasks on a pool of workers and returns their results in the tasks' order. */
async function runAll<T>(tasks: Task[]): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let next = 0;
  const failed: string[] = [];
  const size = Math.min(availableParallelism(), tasks.length);
  await Promise.all(
    Array.from({ length: size }, async () => {
      const worker = new Worker(new URL('./bake-worker.ts', import.meta.url));
      try {
        while (next < tasks.length) {
          const id = next++;
          const reply = await new Promise<{ result?: T; error?: string }>((resolve) => {
            worker.once('message', resolve);
            worker.postMessage({ id, task: tasks[id] });
          });
          if (reply.error) failed.push(reply.error);
          else results[id] = reply.result as T;
        }
      } finally {
        await worker.terminate();
      }
    }),
  );
  if (failed.length) {
    for (const f of failed) console.error(f);
    console.error(`${failed.length} of ${tasks.length} tasks failed; nothing was written`);
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

// Pictures for each block: from its candidates whose animal no earlier block showed, or a repeat of an
// earlier block's pictures. The hardest ones go to the block's very hard, hard and medium levels,
// hardest first, and the easy levels take the easiest ones. A picture's potential is measured with the
// block's first level's background.
const started = Date.now();
const specs: LevelSpec[] = [];
const chosen: Source[][] = [];
const shown = new Set<string>();
for (const [b, block] of BLOCKS.entries()) {
  const first = b * 10 + 1;
  const structure = structureFor(first);
  const field = 'repeat' in block ? (chosen[block.repeat] as Source[]) : block.filter((c) => !shown.has(c.title));
  const potentials = await runAll<number>(
    field.map((source) => ({
      kind: 'potential',
      spec: { number: 0, band: 'easy', structure, source, background: backgroundOf(first) },
    })),
  );
  const ranked = field.map((source, i) => ({ source, potential: potentials[i] as number })).sort((x, y) => x.potential - y.potential);
  const numbers = Array.from({ length: 10 }, (_, i) => first + i).sort(
    (x, y) => HARDEST_FIRST.indexOf(bandFor(x)) - HARDEST_FIRST.indexOf(bandFor(y)) || x - y,
  );
  const easy = numbers.filter((n) => bandFor(n) === 'easy').length;
  const picks = [...ranked.slice(0, 10 - easy), ...ranked.slice(ranked.length - easy)];
  if (picks.length < 10) throw new Error(`block ${b + 1} has only ${field.length} pictures left for 10 levels`);
  chosen[b] = picks.map((p) => p.source);
  numbers.forEach((number, i) => {
    const { source, potential } = picks[i] as (typeof picks)[number];
    shown.add(source.title);
    console.log(`level ${number}: ${source.title}, ${bandFor(number)}, hardest share ${potential}`);
    specs.push({ number, band: bandFor(number), structure, source, background: backgroundOf(number) });
  });
}
specs.sort((x, y) => x.number - y.number);
const levels = await runAll<Level>(specs.map((spec) => ({ kind: 'bake', spec })));
for (const l of levels)
  console.log(
    `level ${String(l.number).padStart(2)} ${l.band.padEnd(9)} ${l.source.title.padEnd(9)} ${l.rows[0]?.length}x${l.rows.length} ` +
      `share ${l.winShare.toFixed(3)} seed ${l.seed} knobs ${JSON.stringify(l.knobs)} pots ${l.columns.flat().length}`,
  );
const text = format(levels);
console.log(`baked ${levels.length} levels in ${Math.round((Date.now() - started) / 1000)} s`);
if (check) {
  if (readFileSync(LEVELS_FILE, 'utf8') !== text) {
    console.error(`${LEVELS_FILE} is not what the bake makes: bake again and commit it`);
    process.exit(1);
  }
  console.log(`${LEVELS_FILE} matches the bake`);
} else writeFileSync(LEVELS_FILE, text);
