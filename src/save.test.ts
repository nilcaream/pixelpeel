import { describe, expect, it } from 'vitest';
import { loadProgress, STORAGE_KEY, type Progress } from './progress.ts';
import { savePick } from './save.ts';
import { LOG_KEY, RUN_KEY, solveLog } from './solvelog.ts';

function memory(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'> & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    key: (i) => [...data.keys()][i] ?? null,
    get length() {
      return data.size;
    },
  };
}

describe('a pick is saved', () => {
  it('and a win moves the progress on and ends the logged attempt, both before the call returns', () => {
    const store = memory();
    const log = solveLog(store, '1.5.1');
    // As src/main.ts holds them: the run's picks are the level's picks, added to at each one.
    const picks: number[] = [];
    let p: Progress = { level: 7, reached: 7, run: { id: 'aaaabbbb', picks } };
    log.open(7, 'aaaabbbb', picks);
    picks.push(2);
    p = savePick(store, log, p, picks);
    expect(loadProgress(store)).toEqual({ level: 7, reached: 7, run: { id: 'aaaabbbb', picks: [2] } });
    picks.push(0);
    p = savePick(store, log, p, picks, 'w');
    expect(p).toEqual({ level: 8, reached: 8, run: null });
    expect(loadProgress(store)).toEqual({ level: 8, reached: 8, run: null });
    expect(store.data.get(`${LOG_KEY}.1`)).toBe('1.5.1 7 aaaabbbb 1 w ca');
    expect(store.data.has(RUN_KEY)).toBe(false);
  });

  it('keeps the reach when a level already peeled is won again', () => {
    const store = memory();
    const log = solveLog(store, '1.5.1');
    log.open(3, 'ccccdddd', []);
    const p = savePick(store, log, { level: 3, reached: 9, run: { id: 'ccccdddd', picks: [] } }, [1], 'w');
    expect(JSON.parse(store.data.get(STORAGE_KEY)!)).toEqual({ level: 4, reached: 9, run: null });
    expect(p.reached).toBe(9);
  });

  it('and a stuck level stays where it is, its attempt logged', () => {
    const store = memory();
    const log = solveLog(store, '1.5.1');
    log.open(5, 'eeeeffff', []);
    const p = savePick(store, log, { level: 5, reached: 5, run: { id: 'eeeeffff', picks: [] } }, [3], 's');
    expect(p.level).toBe(5);
    expect(store.data.get(`${LOG_KEY}.1`)).toBe('1.5.1 5 eeeeffff 1 s d');
  });
});
