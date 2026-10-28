// The solve log, always kept: every attempt at a level, as the columns picked in order, how it ended, and how
// many attempts the level has taken since it was last peeled. The rules depend on nothing but the order of
// the picks, so an attempt replays exactly on the build that recorded it; the level's id pins its content. It
// holds nothing about the player or the device, and no time of any kind. Nothing in the game clears it.
//
// The keys keep it small to write. Chrome writes the storage to disk in batches whose pace it slows down by
// the size of every value changed, so the finished attempts are one line each in chunks of at most
// CHUNK_LIMIT characters, under pixelpeel.solvelog.1, .2, and on; an attempt's end rewrites only the last
// chunk. The attempt in play is its own line under RUN_KEY, rewritten at every pick. Past LOG_LIMIT the
// oldest attempts go.
//
// The log outlives every update: the keys never change their names, a line is kept and shared exactly as it
// was written, by whatever version (its first field), and a line this build cannot read is kept all the
// same. LOG_KEY is where the finished attempts were kept before the chunks (1.4.0 to 1.5.0): it is read as
// the oldest chunk and never added to; past the limit, its oldest lines go first.

export const LOG_KEY = 'pixelpeel.solvelog';
export const RUN_KEY = 'pixelpeel.solvelog.run';

/** The most characters the finished attempts keep: about 13,000 attempts at a whole level. */
export const LOG_LIMIT = 1_000_000;

/** The most characters a chunk holds: about 130 attempts at a whole level. */
export const CHUNK_LIMIT = 10_000;

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

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

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

/** Some of the finished attempts, one line each: the storage key they are kept under, and the lines. */
export interface Chunk {
  key: string;
  text: string;
}

/** A chunk key's number, which orders the chunks; LOG_KEY, the oldest, is 0. */
export function chunkNumber(key: string): number {
  const m = /^pixelpeel\.solvelog\.(\d+)$/.exec(key);
  return m ? Number(m[1]) : key === LOG_KEY ? 0 : -1;
}

/**
 * The chunks with a line added at the end, in a new chunk when the last one is full or is LOG_KEY, and the
 * oldest lines dropped until all the chunks fit the limit. The one line left at the end always stays.
 */
export function addLine(chunks: readonly Chunk[], line: string, limit = LOG_LIMIT, chunkLimit = CHUNK_LIMIT): Chunk[] {
  const out = chunks.map((c) => ({ ...c }));
  const last = out.at(-1);
  if (last && last.key !== LOG_KEY && last.text.length + 1 + line.length <= chunkLimit) last.text += `\n${line}`;
  else out.push({ key: `${LOG_KEY}.${last ? chunkNumber(last.key) + 1 : 1}`, text: line });
  // As the lines would be joined into one log.
  let size = out.reduce((n, c) => n + c.text.length + 1, -1);
  while (size > limit && (out.length > 1 || (out[0] as Chunk).text.includes('\n'))) {
    const first = out[0] as Chunk;
    const cut = first.text.indexOf('\n');
    if (cut < 0) {
      size -= first.text.length + 1;
      out.shift();
    } else {
      size -= cut + 1;
      first.text = first.text.slice(cut + 1);
    }
  }
  return out;
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

  // The chunks there are, oldest first; an empty one has nothing to keep.
  let chunks: Chunk[] = [];
  try {
    for (let i = 0; store && i < store.length; i++) {
      const key = store.key(i);
      const text = key !== null && chunkNumber(key) >= 0 ? get(key) : null;
      if (key !== null && text) chunks.push({ key, text });
    }
  } catch {
    // Storage refused: the log starts empty.
  }
  chunks.sort((a, b) => chunkNumber(a.key) - chunkNumber(b.key));

  const finished = (): string => chunks.map((c) => c.text).join('\n');
  const finish = (outcome: Outcome): void => {
    if (!current) return;
    const next = addLine(chunks, encodeAttempt({ ...current, outcome }));
    for (const c of chunks) if (!next.some((n) => n.key === c.key)) remove(c.key);
    for (const n of next) if (chunks.find((c) => c.key === n.key)?.text !== n.text) set(n.key, n.text);
    chunks = next;
    remove(RUN_KEY);
    current = null;
  };

  return {
    hasData: () => current !== null || chunks.length > 0,
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
      // Updated from a build without the log part way through a level, the attempt still starts from its first pick.
      current ??= { version, level, id, n: nextAttempt(finished(), level, id), outcome: '-', picks: [] };
      current.picks = picks.slice();
      if (outcome) finish(outcome);
      else set(RUN_KEY, encodeAttempt(current));
    },
    file() {
      const lines = [FILE_HEADER];
      if (chunks.length) lines.push(finished());
      if (current) lines.push(encodeAttempt(current));
      return `${lines.join('\n')}\n`;
    },
  };
}
