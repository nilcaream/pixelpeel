// The solve log, always kept: every attempt at a level, as the columns picked in order, how it ended, and how
// many attempts the level has taken since it was last peeled. The rules depend on nothing but the order of
// the picks, so an attempt replays exactly on the build that recorded it; the level's id pins its content. It
// holds nothing about the player or the device, and no time of any kind. Nothing in the game clears it.
//
// The finished attempts are one line each, written once when an attempt ends; the attempt in play is its own
// line, rewritten at every pick. Where they are kept is keep.ts. Past LOG_LIMIT the oldest attempts go.
//
// The log outlives every update: a line is kept and shared exactly as it was written, by whatever version
// (its first field), and a line this build cannot read is kept all the same.

import type { Keeper } from './keep.ts';
import type { Progress } from './progress.ts';

/** The most characters the finished attempts keep: about 13,000 attempts at a whole level. */
export const LOG_LIMIT = 1_000_000;

/** Won, stuck, left before the end, or still in play. */
export type Outcome = 'w' | 's' | 'l' | '-';

export interface Attempt {
  version: string;
  level: number;
  id: string;
  /** Which attempt at the level this is, counting from 1 after the level was last peeled. */
  n: number;
  outcome: Outcome;
  /** The columns picked, in order, counting from 0. */
  picks: number[];
}

const COLUMNS = 'abcdefghijklmnopqrstuvwxyz';

export const FILE_HEADER = [
  '# Pixel Peel solve log, format 1',
  '# version level id attempt outcome picks. Attempt: which try at the level since it was last peeled.',
  '# Outcome: w won, s stuck, l left, - in play. Picks: the columns picked in order, a is the first.',
].join('\n');

/** One attempt as one line, e.g. "1.4.0 12 176b3796 2 w abcadd". */
export function encodeAttempt(a: Attempt): string {
  return `${a.version} ${a.level} ${a.id} ${a.n} ${a.outcome} ${a.picks.map((c) => COLUMNS[c]).join('')}`;
}

/** The attempt a line holds, or null when it is not one. */
export function decodeAttempt(line: string): Attempt | null {
  const m = /^(\S+) (\d+) ([0-9a-f]{8}) (\d+) ([wsl-]) ([a-z]*)$/.exec(line);
  if (!m) return null;
  return {
    version: m[1] as string,
    level: Number(m[2]),
    id: m[3] as string,
    n: Number(m[4]),
    outcome: m[5] as Outcome,
    picks: [...(m[6] as string)].map((c) => COLUMNS.indexOf(c)),
  };
}

/**
 * How many of the oldest lines go when a line is added, so that all of them, joined into one log, fit the
 * limit. The line added always stays, whatever its size.
 */
export function toDrop(lines: readonly string[], line: string, limit = LOG_LIMIT): number {
  let size = lines.reduce((n, l) => n + l.length + 1, line.length);
  let drop = 0;
  while (size > limit && drop < lines.length) size -= (lines[drop++] as string).length + 1;
  return drop;
}

/** The number the next attempt at a level gets: one more than the last one logged, or 1 after a win or none. */
export function nextAttempt(lines: readonly string[], level: number, id: string): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    const a = decodeAttempt(lines[i] as string);
    if (a && a.level === level && a.id === id) return a.outcome === 'w' ? 1 : a.n + 1;
  }
  return 1;
}

export interface SolveLog {
  /** Whether there is any attempt to share. */
  hasData(): boolean;
  /** A level opened with these picks already made: the attempt in play goes on if it is this one, else it was left. */
  open(level: number, id: string, picks: readonly number[]): void;
  /**
   * A pick the game accepted, with every pick of the level so far (this one last) and, when it ended the game,
   * how; written in one step with the progress, when one is given.
   */
  pick(picks: readonly number[], outcome?: 'w' | 's', progress?: Progress): void;
  /** The file to share: the header, the finished attempts, and the one in play. */
  file(): string;
}

/** The log over the finished lines and the attempt in play as they were kept, writing through the keeper. */
export function solveLog(kept: { lines: readonly string[]; run: string | null }, keeper: Keeper, version: string): SolveLog {
  let level = 0;
  let id = '';
  let current: Attempt | null = kept.run ? decodeAttempt(kept.run) : null;
  const lines = kept.lines.slice();

  const finish = (outcome: Outcome, progress?: Progress): void => {
    if (!current) return;
    const line = encodeAttempt({ ...current, outcome });
    const drop = toDrop(lines, line);
    lines.splice(0, drop);
    lines.push(line);
    keeper.write({ progress, add: { line, drop }, run: null });
    current = null;
  };

  return {
    hasData: () => current !== null || lines.length > 0,
    open(n, levelId, picks) {
      level = n;
      id = levelId;
      if (!current) return;
      // A newer build may play differently, so an attempt goes on only on the build that started it.
      const same =
        current.version === version && current.level === n && current.id === levelId && current.picks.join() === picks.join();
      if (!same) finish('l');
    },
    pick(picks, outcome, progress) {
      // Updated from a build without the log part way through a level, the attempt still starts from its first pick.
      current ??= { version, level, id, n: nextAttempt(lines, level, id), outcome: '-', picks: [] };
      current.picks = picks.slice();
      if (outcome) finish(outcome, progress);
      else keeper.write({ progress, run: encodeAttempt(current) });
    },
    file() {
      const out = [FILE_HEADER, ...lines];
      if (current) out.push(encodeAttempt(current));
      return `${out.join('\n')}\n`;
    },
  };
}
