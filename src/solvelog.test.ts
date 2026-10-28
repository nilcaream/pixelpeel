import { describe, expect, it } from 'vitest';
import { replay } from './generator.ts';
import levelsFile from './levels.json';
import type { Level } from './levels.ts';
import { paintedPicture } from './picture.ts';
import { pick, status, type Board } from './rules.ts';
import { LOG_KEY, RUN_KEY, localKept, localKeeper } from './keep.ts';
import { FILE_HEADER, LOG_LIMIT, decodeAttempt, encodeAttempt, nextAttempt, solveLog as logOver, toDrop, type Attempt } from './solvelog.ts';
import { seededRng } from './rng.ts';

const LEVELS = levelsFile as unknown as Level[];
const L1 = LEVELS[0] as Level;

function memory(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

/** The log as a start finds it in localStorage; IndexedDB keeps the same lines (keep.test.ts). */
function solveLog(store: ReturnType<typeof memory>, version: string) {
  const kept = localKept(store);
  return logOver(kept, localKeeper(store, kept.lines), version);
}

function boardAfter(level: Level, picks: number[]): Board {
  return replay(paintedPicture(level.rows, level.overrides), level.columns, level.structure.buckets, picks);
}

/** The attempts in a shared file, without its header. */
function attempts(file: string): Attempt[] {
  return file
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => decodeAttempt(l) as Attempt);
}

/** Plays a level to its end with random picks, as main.ts does, logging each pick; gives back the picks and the board. */
function playOut(log: ReturnType<typeof solveLog>, level: Level, seed: number) {
  const rng = seededRng(seed);
  let board = boardAfter(level, []);
  const picks: number[] = [];
  log.open(level.number, level.id, picks);
  while (status(board) === 'playing') {
    const open = board.columns.flatMap((c, i) => (c.length ? [i] : []));
    const column = open[Math.floor(rng() * open.length)] as number;
    const r = pick(board, column);
    if (!r) break;
    board = r.board;
    picks.push(column);
    const s = status(board);
    log.pick(picks, s === 'won' ? 'w' : s === 'stuck' ? 's' : undefined);
  }
  return { picks, board };
}

describe('solve log', () => {
  it('replays every logged attempt to the very board and outcome it recorded', () => {
    const store = memory();
    const log = solveLog(store, '1.4.0');
    const played = [1, 30, 60, 90].map((n, i) => ({ level: LEVELS[n - 1] as Level, ...playOut(log, LEVELS[n - 1] as Level, i + 1) }));
    const back = attempts(log.file());
    expect(back).toHaveLength(played.length);
    back.forEach((a, i) => {
      const { level, picks, board } = played[i] as (typeof played)[number];
      expect([a.version, a.level, a.id, a.n]).toEqual(['1.4.0', level.number, level.id, 1]);
      expect(a.picks).toEqual(picks);
      const again = boardAfter(level, a.picks);
      expect(again.cells).toEqual(board.cells);
      expect(a.outcome).toBe(status(again) === 'won' ? 'w' : 's');
    });
  });

  it('holds no time: a line is the version, level, id, attempt, outcome and one letter per pick', () => {
    const store = memory();
    const log = solveLog(store, '1.4.0');
    log.open(5, LEVELS[4]!.id, []);
    log.pick([2]);
    log.pick([2, 0]);
    expect(store.data.get(RUN_KEY)).toBe(`1.4.0 5 ${LEVELS[4]!.id} 1 - ca`);
  });

  it('counts the attempts at a level until it is peeled, and starts again after', () => {
    const store = memory();
    const log = solveLog(store, '1.4.0');
    log.open(1, L1.id, []);
    log.pick([0], 's');
    log.open(1, L1.id, []);
    log.pick([1]);
    log.open(1, L1.id, []);
    log.pick([2], 'w');
    log.open(1, L1.id, []);
    log.pick([3], 's');
    expect(attempts(log.file()).map((a) => `${a.n}${a.outcome}`)).toEqual(['1s', '2l', '3w', '1s']);
    expect(nextAttempt(store.data.get(LOG_KEY)!.split('\n'), 1, L1.id)).toBe(2);
    expect(nextAttempt(store.data.get(LOG_KEY)!.split('\n'), 2, LEVELS[1]!.id)).toBe(1);
  });

  it('goes on with the attempt in play after a reload', () => {
    const store = memory();
    const first = solveLog(store, '1.4.0');
    first.open(1, L1.id, []);
    first.pick([1]);
    const second = solveLog(store, '1.4.0');
    second.open(1, L1.id, [1]);
    second.pick([1, 3]);
    expect(attempts(second.file())).toEqual([{ version: '1.4.0', level: 1, id: L1.id, n: 1, outcome: '-', picks: [1, 3] }]);
  });

  it('marks an attempt left when another level, a retry or a newer build opens instead', () => {
    const store = memory();
    const log = solveLog(store, '1.4.0');
    log.open(1, L1.id, []);
    log.pick([0]);
    log.open(1, L1.id, []);
    log.pick([2]);
    const newer = solveLog(store, '1.4.1');
    newer.open(1, L1.id, [2]);
    expect(attempts(newer.file()).map((a) => `${a.outcome} ${a.picks.join()}`)).toEqual(['l 0', 'l 2']);
  });

  it('is always kept, from the first pick, and sharing leaves it as it is', () => {
    const store = memory();
    const log = solveLog(store, '1.4.0');
    expect(log.hasData()).toBe(false);
    log.open(1, L1.id, []);
    log.pick([3]);
    expect(log.hasData()).toBe(true);
    expect(store.data.get(RUN_KEY)).toBe(`1.4.0 1 ${L1.id} 1 - d`);
    playOut(log, LEVELS[1]!, 7);
    const file = log.file();
    expect(log.file()).toBe(file);
    expect(solveLog(store, '1.4.0').file()).toBe(file);
  });

  it('keeps the keys it has always had in localStorage: a log 1.5.0 wrote goes on, verbatim and oldest first', () => {
    expect([LOG_KEY, RUN_KEY, LOG_LIMIT]).toEqual(['pixelpeel.solvelog', 'pixelpeel.solvelog.run', 1_000_000]);
    const store = memory();
    // As 1.4.0 to 1.5.0 left it, with a line no build reads (a hot-reload window of the first preview).
    const old = [`1.4.0 1 ${L1.id} 1 s ab`, '1.4.0 1 176b3796 1 15175.300000011921 a', `1.5.0 1 ${L1.id} 2 l c`];
    store.data.set(LOG_KEY, old.join('\n'));
    store.data.set(RUN_KEY, `1.5.0 1 ${L1.id} 3 - ab`);
    const log = solveLog(store, '1.5.1');
    expect(log.hasData()).toBe(true);
    log.open(1, L1.id, [0, 1]);
    log.pick([0, 1, 2]);
    expect(log.file()).toBe(
      [FILE_HEADER, ...old, `1.5.0 1 ${L1.id} 3 l ab`, `1.5.1 1 ${L1.id} 4 - abc`].join('\n') + '\n',
    );
    expect(store.data.get(LOG_KEY)).toBe([...old, `1.5.0 1 ${L1.id} 3 l ab`].join('\n'));
    expect(store.data.get(RUN_KEY)).toBe(`1.5.1 1 ${L1.id} 4 - abc`);
  });

  it('drops the oldest whole attempts past the limit, and keeps the one added whatever its size', () => {
    let lines: string[] = [];
    for (let i = 0; i < 10; i++) {
      const line = `1.4.0 ${i + 1} 0000000${i} 1 l ab`;
      lines = [...lines.slice(toDrop(lines, line, 100)), line];
    }
    expect(lines.join('\n').length).toBeLessThanOrEqual(100);
    expect(lines.map((l) => decodeAttempt(l)?.level)).toEqual([7, 8, 9, 10]);
    expect(toDrop(lines, 'x'.repeat(200), 100)).toBe(4);
    expect(toDrop(lines, 'x', 100)).toBe(0);
  });

  it('encodes and decodes an attempt to the same', () => {
    const a: Attempt = { version: '1.4.0', level: 90, id: 'deadbeef', n: 12, outcome: 'w', picks: [3, 0, 0, 2] };
    expect(encodeAttempt(a)).toBe('1.4.0 90 deadbeef 12 w daac');
    expect(decodeAttempt(encodeAttempt(a))).toEqual(a);
    expect(decodeAttempt('nonsense')).toBeNull();
  });
});
