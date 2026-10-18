// Bakes the scene levels into src/levels.json, offline, one worker per level. The bake is deterministic:
// the same scenes and rules always give the same file, which is what `--check` holds the committed file to.
//
//   npm run bake              write src/levels.json
//   npm run bake -- 21 22     bake only those levels and keep the others as the file has them
//   npm run bake -- --check   bake again and fail if src/levels.json differs

import { readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import type { Level } from '../src/levels.ts';
import { SCENES } from '../src/scenes.ts';

const LEVELS_FILE = 'src/levels.json';
const check = process.argv.includes('--check');
const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);

/** Bakes the levels on a pool of workers and returns them in order. */
async function bakeAll(numbers: number[]): Promise<Level[]> {
  const results: Level[] = new Array(numbers.length);
  let next = 0;
  const failed: string[] = [];
  const size = Math.min(availableParallelism(), numbers.length);
  await Promise.all(
    Array.from({ length: size }, async () => {
      const worker = new Worker(new URL('./bake-worker.ts', import.meta.url));
      worker.on('message', (m: { log?: string }) => m.log && console.log(m.log));
      try {
        while (next < numbers.length) {
          const id = next++;
          const reply = await new Promise<{ result?: Level; error?: string }>((resolve) => {
            const done = (m: { result?: Level; error?: string; log?: string }) => {
              if (m.log) return;
              worker.off('message', done);
              resolve(m);
            };
            worker.on('message', done);
            worker.postMessage({ number: numbers[id] });
          });
          if (reply.error) failed.push(reply.error);
          else results[id] = reply.result as Level;
        }
      } finally {
        await worker.terminate();
      }
    }),
  );
  if (failed.length) {
    for (const f of failed) console.error(f);
    console.error(`${failed.length} of ${numbers.length} levels failed; nothing was written`);
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

const started = Date.now();
const all = SCENES.map((_, i) => i + 1);
const kept = only.length ? (JSON.parse(readFileSync(LEVELS_FILE, 'utf8')) as Level[]) : [];
const baked = await bakeAll(only.length ? only : all);
const levels = all.map((n) => baked.find((l) => l.number === n) ?? kept.find((l) => l.number === n)).filter((l): l is Level => !!l);
for (const l of levels)
  console.log(
    `level ${String(l.number).padStart(2)} ${l.band.padEnd(9)} ${l.title.padEnd(24)} buckets ${l.structure.buckets} ` +
      `strength ${l.strength} depth ${l.depth} casual ${(l.casualWins / 200).toFixed(3)} thinkers ${l.thinkers.join(' ')} ` +
      `full ${l.fullSight} luck ${l.luck} pots ${l.columns.flat().length}${l.misses ? ` MISSES ${l.misses}` : ''}`,
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
