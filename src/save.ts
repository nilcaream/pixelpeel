// What a pick the rules accepted writes, all in one step: the progress, moved on to the next level when the
// pick won the level, and the solve log, which on a win ends the attempt. Nothing waits for the screen to
// catch up: a level that took days is kept the moment it is won.

import { peeled, type Progress } from './progress.ts';
import type { SolveLog } from './solvelog.ts';

/** Saves a pick with every pick of the level so far (this one last) and, when it ended the level, how; gives back the progress. */
export function savePick(log: SolveLog, p: Progress, picks: readonly number[], outcome?: 'w' | 's'): Progress {
  const next = outcome === 'w' ? peeled(p) : p;
  log.pick(picks, outcome, next);
  return next;
}
