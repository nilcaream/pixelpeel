// One worker of scripts/design/tree.ts: expands the positions it is sent, of the level it was started for, and
// keeps its own search for wins off the sensible player's games from one layer to the next.

import { parentPort, workerData } from 'node:worker_threads';
import levelsFile from '../../src/levels.json' with { type: 'json' };
import type { Level } from '../../src/levels.ts';
import { expand, gameOf, Solver } from './tree.ts';

const { number, only } = workerData as { number: number; only: 'S' | undefined };
const game = gameOf((levelsFile as unknown as Level[]).find((l) => l.number === number) as Level);
const solver = only ? new Solver(game) : null;

parentPort?.on('message', (keys: string[]) => {
  parentPort?.postMessage(keys.map((key) => expand(game, key, only, solver)));
});
