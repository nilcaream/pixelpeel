// The end of a level that has no choice left in it: once at most one column holds pots, the pots can
// only go in one order, so the game picks them itself, as soon as a bucket is free, and runs faster.

import type { Board } from './rules.ts';
import { freeSlot, type Scene } from './scene.ts';

/** How much faster the game runs once the autopilot has taken over. */
export const AUTOPILOT_SPEED = 3;

/** True once the player has nothing left to decide: at most one column still holds pots. */
export function onAutopilot(b: Pick<Board, 'columns'>): boolean {
  return b.columns.filter((c) => c.length > 0).length <= 1;
}

/** The column the autopilot picks now: the one left, when a bucket is free on screen; otherwise −1. */
export function autopilotPick(b: Pick<Board, 'columns'>, s: Scene): number {
  if (!onAutopilot(b) || freeSlot(s) < 0) return -1;
  return b.columns.findIndex((c) => c.length > 0);
}
