// The end of a level that has no choice left in it: once at most one column holds pots, the pots can
// only go in one order, so the game picks them itself, as soon as a bucket is free, and runs faster.

import type { State } from './engine.ts';

/** How much faster the game runs once the autopilot has taken over. */
export const AUTOPILOT_SPEED = 3;

/** True once the player has nothing left to decide: at most one column still holds pots. */
export function onAutopilot(s: State): boolean {
  return s.columns.filter((c) => c.length > 0).length <= 1;
}

/** The column the autopilot picks now: the one left, when a bucket is free; otherwise −1. */
export function autopilotPick(s: State): number {
  if (!onAutopilot(s) || !s.buckets.includes(null)) return -1;
  return s.columns.findIndex((c) => c.length > 0);
}
