import { describe, expect, it } from 'vitest';
import { replay } from './generator.ts';
import levelsFile from './levels.json';
import type { Level } from './levels.ts';
import { paintedPicture } from './picture.ts';
import { pick, status, type Board } from './rules.ts';
import { LOG_KEY, RUN_KEY, appendLine, decodeAttempt, encodeAttempt, nextAttempt, solveLog, type Attempt } from './solvelog.ts';
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
    log.setEnabled(true);
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
    log.setEnabled(true);
    log.open(5, LEVELS[4]!.id, []);
    log.pick([2]);
    log.pick([2, 0]);
    expect(store.data.get(RUN_KEY)).toBe(`1.4.0 5 ${LEVELS[4]!.id} 1 - ca`);
  });

  it('counts the attempts at a level until it is peeled, and starts again after', () => {
    const store = memory();
    const log = solveLog(store, '1.4.0');
    log.setEnabled(true);
    log.open(1, L1.id, []);
    log.pick([0], 's');
    log.open(1, L1.id, []);
    log.pick([1]);
    log.open(1, L1.id, []);
    log.pick([2], 'w');
    log.open(1, L1.id, []);
    log.pick([3], 's');
    expect(attempts(log.file()).map((a) => `${a.n}${a.outcome}`)).toEqual(['1s', '2l', '3w', '1s']);
    expect(nextAttempt(store.data.get(LOG_KEY)!, 1, L1.id)).toBe(2);
    expect(nextAttempt(store.data.get(LOG_KEY)!, 2, LEVELS[1]!.id)).toBe(1);
  });

  it('goes on with the attempt in play after a reload', () => {
    const store = memory();
    const first = solveLog(store, '1.4.0');
    first.setEnabled(true);
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
    log.setEnabled(true);
    log.open(1, L1.id, []);
    log.pick([0]);
    log.open(1, L1.id, []);
    log.pick([2]);
    const newer = solveLog(store, '1.4.1');
    newer.open(1, L1.id, [2]);
    expect(attempts(newer.file()).map((a) => `${a.outcome} ${a.picks.join()}`)).toEqual(['l 0', 'l 2']);
  });

  it('logs the picks made before opting in, from the first', () => {
    const store = memory();
    const log = solveLog(store, '1.4.0');
    log.open(1, L1.id, []);
    log.pick([3]);
    expect(log.hasData()).toBe(false);
    log.setEnabled(true);
    log.pick([3, 1]);
    expect(store.data.get(RUN_KEY)).toBe(`1.4.0 1 ${L1.id} 1 - db`);
  });

  it('is off by default, is not cleared by sharing, and is cleared by opting out', () => {
    const store = memory();
    const log = solveLog(store, '1.4.0');
    expect(log.enabled()).toBe(false);
    log.setEnabled(true);
    expect(log.hasData()).toBe(false);
    playOut(log, L1, 7);
    log.open(2, LEVELS[1]!.id, []);
    log.pick([0]);
    const file = log.file();
    expect(log.file()).toBe(file);
    expect(log.hasData()).toBe(true);
    log.setEnabled(false);
    expect(store.data.has(LOG_KEY)).toBe(false);
    expect(store.data.has(RUN_KEY)).toBe(false);
    expect(log.hasData()).toBe(false);
    log.pick([0, 1]);
    expect(store.data.size).toBe(0);
  });

  it('drops the oldest whole attempts past the limit', () => {
    let log = '';
    for (let i = 0; i < 10; i++) log = appendLine(log, `1.4.0 ${i + 1} 0000000${i} 1 l ab`, 100);
    expect(log.length).toBeLessThanOrEqual(100);
    expect(log.split('\n').map((l) => decodeAttempt(l)?.level)).toEqual([7, 8, 9, 10]);
  });

  it('encodes and decodes an attempt to the same', () => {
    const a: Attempt = { version: '1.4.0', level: 90, id: 'deadbeef', n: 12, outcome: 'w', picks: [3, 0, 0, 2] };
    expect(encodeAttempt(a)).toBe('1.4.0 90 deadbeef 12 w daac');
    expect(decodeAttempt(encodeAttempt(a))).toEqual(a);
    expect(decodeAttempt('nonsense')).toBeNull();
  });
});
