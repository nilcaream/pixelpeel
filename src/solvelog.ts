// The solve log, which the player opts into from the menu: every attempt at a level, as the columns picked in
// order, how it ended, and how many attempts the level has taken since it was last peeled. The rules depend
// on nothing but the order of the picks, so an attempt replays exactly on the build that recorded it; the
// level's id pins its content. It holds nothing about the player or the device, and no time of any kind.
//
// Two keys keep it small to write. The finished attempts are one line each under LOG_KEY, written once when
// an attempt ends; the attempt in play is its own line under RUN_KEY, rewritten at every pick. LOG_KEY being
// there at all is the opt-in, and switching it off removes both. Past LOG_LIMIT the oldest attempts go.

export const LOG_KEY = 'pixelpeel.solvelog';
export const RUN_KEY = 'pixelpeel.solvelog.run';

/** The most characters the finished attempts keep: about 1,300 attempts at a whole level, a small share of the storage. */
export const LOG_LIMIT = 100_000;

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

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

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

/** The log with a line added at the end, the oldest lines dropped until it fits the limit. */
export function appendLine(log: string, line: string, limit = LOG_LIMIT): string {
  let lines = log ? log.split('\n') : [];
  lines.push(line);
  let size = lines.join('\n').length;
  while (lines.length > 1 && size > limit) {
    size -= (lines[0] as string).length + 1;
    lines = lines.slice(1);
  }
  return lines.join('\n');
}

/** The number the next attempt at a level gets: one more than the last one logged, or 1 after a win or none. */
export function nextAttempt(log: string, level: number, id: string): number {
  const lines = log ? log.split('\n') : [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const a = decodeAttempt(lines[i] as string);
    if (a && a.level === level && a.id === id) return a.outcome === 'w' ? 1 : a.n + 1;
  }
  return 1;
}

export interface SolveLog {
  enabled(): boolean;
  /** Opting in starts an empty log; opting out removes the log and the attempt in play. */
  setEnabled(on: boolean): void;
  /** Whether there is any attempt to share. */
  hasData(): boolean;
  /** A level opened with these picks already made: the attempt in play goes on if it is this one, else it was left. */
  open(level: number, id: string, picks: readonly number[]): void;
  /** A pick the game accepted, with every pick of the level so far (this one last) and, when it ended the game, how. */
  pick(picks: readonly number[], outcome?: 'w' | 's'): void;
  /** The file to share: the header, the finished attempts, and the one in play. */
  file(): string;
}

export function solveLog(store: Store | null, version: string): SolveLog {
  const get = (key: string): string | null => {
    try {
      return store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  const set = (key: string, value: string): void => {
    try {
      store?.setItem(key, value);
    } catch {
      // Storage is full or refused: the log just misses this.
    }
  };
  const remove = (key: string): void => {
    try {
      store?.removeItem(key);
    } catch {
      // Storage refused: nothing to remove.
    }
  };

  let level = 0;
  let id = '';
  let current: Attempt | null = null;
  const saved = get(RUN_KEY);
  if (saved) current = decodeAttempt(saved);

  const enabled = (): boolean => get(LOG_KEY) !== null;
  const finish = (outcome: Outcome): void => {
    if (!current) return;
    set(LOG_KEY, appendLine(get(LOG_KEY) ?? '', encodeAttempt({ ...current, outcome })));
    remove(RUN_KEY);
    current = null;
  };

  return {
    enabled,
    setEnabled(on) {
      if (on === enabled()) return;
      if (on) {
        set(LOG_KEY, '');
      } else {
        remove(LOG_KEY);
        remove(RUN_KEY);
        current = null;
      }
    },
    hasData: () => current !== null || !!get(LOG_KEY),
    open(n, levelId, picks) {
      level = n;
      id = levelId;
      if (!current) return;
      // A newer build may play differently, so an attempt goes on only on the build that started it.
      const same =
        current.version === version && current.level === n && current.id === levelId && current.picks.join() === picks.join();
      if (!same) finish('l');
    },
    pick(picks, outcome) {
      if (!enabled()) return;
      // Opted in part way through a level, the attempt still starts from its first pick.
      current ??= { version, level, id, n: nextAttempt(get(LOG_KEY) ?? '', level, id), outcome: '-', picks: [] };
      current.picks = picks.slice();
      if (outcome) finish(outcome);
      else set(RUN_KEY, encodeAttempt(current));
    },
    file() {
      const lines = [FILE_HEADER];
      const log = get(LOG_KEY);
      if (log) lines.push(log);
      if (current) lines.push(encodeAttempt(current));
      return `${lines.join('\n')}\n`;
    },
  };
}
