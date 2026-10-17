// One worker of the bake: measures a picture's potential or bakes a level, as scripts/bake.ts asks.

import { parentPort } from 'node:worker_threads';
import { bakeLevel, potential, type LevelSpec } from '../src/bake.ts';
import { readPng } from './png.ts';

export type Task = { kind: 'potential'; spec: LevelSpec } | { kind: 'bake'; spec: LevelSpec };

parentPort?.on('message', ({ id, task }: { id: number; task: Task }) => {
  try {
    const image = readPng(task.spec.source.file);
    const result = task.kind === 'potential' ? potential(task.spec, image) : bakeLevel(task.spec, image);
    parentPort?.postMessage({ id, result });
  } catch (e) {
    parentPort?.postMessage({ id, error: e instanceof Error ? e.message : String(e) });
  }
});
