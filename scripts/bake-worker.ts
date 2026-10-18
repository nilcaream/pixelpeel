// One worker of the bake: bakes the level scripts/bake.ts asks for, and passes on the bake's log lines.

import { parentPort } from 'node:worker_threads';
import { bakeLevel } from '../src/bake.ts';

parentPort?.on('message', ({ number }: { number: number }) => {
  try {
    const result = bakeLevel(number, (line) => parentPort?.postMessage({ log: line }));
    parentPort?.postMessage({ result });
  } catch (e) {
    parentPort?.postMessage({ error: e instanceof Error ? e.message : String(e) });
  }
});
