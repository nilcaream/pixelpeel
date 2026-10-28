import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ATTEMPTS, DB_NAME, KEEP_KEY, LOG_KEY, MOVED, RUN_KEY, STATE, idbKeeper, load, localKept, localKeeper, openDb, openKeep } from './keep.ts';
import { STORAGE_KEY } from './progress.ts';
import { savePick } from './save.ts';
import { FILE_HEADER, solveLog } from './solvelog.ts';

function memory(): Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

// As a player's 1.5.0 left localStorage: level 12 in play with two picks, three finished attempts (one a line
// no build reads), the attempt in play, and the dev switch, which is not the player's and stays.
const PROGRESS = { level: 12, reached: 14, run: { id: '176b3796', picks: [0, 1] } };
const LINES = ['1.4.0 3 aaaabbbb 1 s ab', '1.4.0 1 176b3796 1 15175.300000011921 a', '1.5.0 12 176b3796 1 l c'];
const RUN = '1.5.0 12 176b3796 2 - ab';
const FILE = [FILE_HEADER, ...LINES, RUN].join('\n') + '\n';

function seeded150() {
  const store = memory();
  store.data.set(STORAGE_KEY, JSON.stringify(PROGRESS));
  store.data.set(LOG_KEY, LINES.join('\n'));
  store.data.set(RUN_KEY, RUN);
  store.data.set('pixelpeel.dev', '1');
  return store;
}

/** What a start finds, through whichever keeper it got. */
async function start(idb: IDBFactory | undefined, store: ReturnType<typeof memory>) {
  const { kept, keeper } = await openKeep(idb, store, '1.5.1');
  return { kept, keeper, log: solveLog(kept, keeper, '1.5.1') };
}

afterEach(() => vi.restoreAllMocks());

describe('keeping in IndexedDB', () => {
  it('moves what 1.5.0 kept in localStorage in once: the same progress, the same share file, and the keys gone', async () => {
    const idb = new IDBFactory();
    const store = seeded150();
    expect(solveLog(localKept(store), localKeeper(store, LINES), '1.5.0').file()).toBe(FILE);
    const first = await start(idb, store);
    expect(first.keeper.where).toBe('indexeddb');
    expect(first.kept.progress).toEqual(PROGRESS);
    expect(first.log.file()).toBe(FILE);
    expect([...store.data.keys()]).toEqual(['pixelpeel.dev', KEEP_KEY]);
    expect(store.data.get(KEEP_KEY)).toBe('indexeddb');
    const again = await start(idb, store);
    expect(again.kept).toEqual(first.kept);
    expect(again.log.file()).toBe(FILE);
  });

  // Five puts move it: the progress, three lines, the attempt in play, then the mark is the sixth.
  it.each([
    ['part way through', 3],
    ['after the last write, before the commit', 6],
  ])('leaves localStorage as it was when the move stops %s, and moves it all at the next start', async (_, at) => {
    const idb = new IDBFactory();
    const store = seeded150();
    const put = IDBObjectStore.prototype.put;
    let n = 0;
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      if (++n < at) return put.apply(this, args);
      if (n > at) throw new Error('stopped');
      const r = put.apply(this, args);
      this.transaction.abort();
      return r;
    });
    const stopped = await start(idb, store);
    expect(stopped.keeper.where).toBe('localstorage');
    expect(stopped.log.file()).toBe(FILE);
    expect(store.data).toEqual(seeded150().data);
    vi.restoreAllMocks();
    const db = (await openDb(idb)) as IDBDatabase;
    const count = await new Promise((resolve) => {
      const r = db.transaction(ATTEMPTS).objectStore(ATTEMPTS).count();
      r.onsuccess = () => resolve(r.result);
    });
    expect(count).toBe(0);
    db.close();
    const next = await start(idb, store);
    expect(next.keeper.where).toBe('indexeddb');
    expect(next.log.file()).toBe(FILE);
  });

  it('moves nothing twice when the keys outlive the move, as when the page stops between the two', async () => {
    const idb = new IDBFactory();
    await start(idb, seeded150());
    const again = await start(idb, seeded150());
    expect(again.log.file()).toBe(FILE);
    expect(again.kept.progress).toEqual(PROGRESS);
  });

  it('plays on localStorage where IndexedDB is missing or does not open in time, and moves it in later', async () => {
    const store = seeded150();
    const missing = await start(undefined, store);
    expect(missing.keeper.where).toBe('localstorage');
    missing.log.open(12, '176b3796', [0, 1]);
    savePick(missing.log, PROGRESS, [0, 1, 3], 'w');
    const hanging = { open: () => ({}) } as unknown as IDBFactory;
    const t = Date.now();
    const { keeper } = await openKeep(hanging, store, '1.5.1', 30);
    expect(keeper.where).toBe('localstorage');
    expect(Date.now() - t).toBeLessThan(500);
    const later = await start(new IDBFactory(), store);
    expect(later.keeper.where).toBe('indexeddb');
    expect(later.kept.progress).toEqual({ level: 13, reached: 14, run: null });
    // 1.5.1 goes on with no attempt 1.5.0 started: that one was left, and the win is the next.
    expect(later.log.file()).toBe([FILE_HEADER, ...LINES, '1.5.0 12 176b3796 2 l ab', '1.5.1 12 176b3796 3 w abd'].join('\n') + '\n');
  });

  it('waits for IndexedDB however long it takes once it has been read, and falls back only when it cannot open', async () => {
    const store = memory();
    store.data.set(KEEP_KEY, 'indexeddb');
    const hanging = { open: () => ({}) } as unknown as IDBFactory;
    const waited = await Promise.race([openKeep(hanging, store, '1.5.1', 30).then(() => 'fell back'), new Promise((r) => setTimeout(() => r('waiting'), 200))]);
    expect(waited).toBe('waiting');
    const failing = { open: () => { throw new Error('blocked'); } } as unknown as IDBFactory;
    expect((await openKeep(failing, store, '1.5.1', 30)).keeper.where).toBe('localstorage');
  });

  it('writes a win, the progress and the attempt it ended, in one transaction', async () => {
    const idb = new IDBFactory();
    const db = (await openDb(idb)) as IDBDatabase;
    const { kept, first, next } = await load(db, seeded150(), '1.5.1');
    const log = solveLog(kept, idbKeeper(db, first, next), '1.5.1');
    log.open(12, '176b3796', [0, 1]);
    const transactions = vi.spyOn(db, 'transaction');
    savePick(log, PROGRESS, [0, 1, 3], 'w');
    expect(transactions).toHaveBeenCalledTimes(1);
    db.close();
    const after = await start(idb, memory());
    expect(after.kept).toEqual({ progress: { level: 13, reached: 14, run: null }, lines: [...LINES, '1.5.0 12 176b3796 2 l ab', '1.5.1 12 176b3796 3 w abd'], run: null });
  });

  it('drops the oldest lines by their keys, and goes on numbering after them', async () => {
    const idb = new IDBFactory();
    const db = (await openDb(idb)) as IDBDatabase;
    const { first, next } = await load(db, seeded150(), '1.5.1');
    const keeper = idbKeeper(db, first, next);
    keeper.write({ add: { line: 'x', drop: 2 } });
    keeper.write({ add: { line: 'y', drop: 1 } });
    db.close();
    expect((await start(idb, memory())).kept.lines).toEqual(['x', 'y']);
    const db2 = (await openDb(idb)) as IDBDatabase;
    const keys = await new Promise((resolve) => {
      const r = db2.transaction(ATTEMPTS).objectStore(ATTEMPTS).getAllKeys();
      r.onsuccess = () => resolve(r.result);
    });
    expect(keys).toEqual([4, 5]);
    db2.close();
  });

  it('keeps its names', () => {
    expect([DB_NAME, STATE, ATTEMPTS, MOVED, KEEP_KEY, STORAGE_KEY, LOG_KEY, RUN_KEY]).toEqual([
      'pixelpeel',
      'state',
      'attempts',
      'moved',
      'pixelpeel.keep',
      'pixelpeel.progress',
      'pixelpeel.solvelog',
      'pixelpeel.solvelog.run',
    ]);
  });
});
