// One worker of the bake: bakes the level scripts/bake.ts asks for, or judges a stored level again, and passes on
// the bake's log lines. The decided floor uses the exact solver of the design tools.

import { parentPort } from 'node:worker_threads';
import { bakeLevel, rejudge } from '../src/bake.ts';
import type { Level } from '../src/levels.ts';
import { decidedPoints } from './design/rating.ts';

parentPort?.on('message', (job: { number: number } | { judge: Level }) => {
  try {
    const result = 'judge' in job ? rejudge(job.judge, decidedPoints) : bakeLevel(job.number, decidedPoints, (line) => parentPort?.postMessage({ log: line }));
    parentPort?.postMessage({ result });
  } catch (e) {
    parentPort?.postMessage({ error: e instanceof Error ? e.message : String(e) });
  }
});
