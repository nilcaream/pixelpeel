// Where the player's progress and solve log are kept: IndexedDB, which writes a transaction to disk as it
// completes when asked to (durability 'strict'), where localStorage leaves the moment to the browser. A win
// writes the progress and the attempt it ended in one transaction, so neither is ever kept without the other.
//
// The database is DB_NAME, and its names never change: STATE holds the progress, the attempt in play (a line)
// and MOVED; ATTEMPTS holds the finished attempts, a line each, under 1, 2, and on, oldest first. A later
// schema only adds stores, by a version upgrade.
//
// Up to 1.5.0 everything was in localStorage. The first start with IndexedDB moves it all in, with MOVED,
// in one transaction, and only once that is on disk removes the keys, so a stop at any point leaves either
// localStorage as it was (and the move runs again) or IndexedDB complete. Where IndexedDB cannot open (blocked,
// or not within OPEN_MS), the game plays on localStorage as 1.5.0 did, and the move runs at the next start
// that opens it. Once IndexedDB has been read, KEEP_KEY says so, and a start then waits for it however long it
// takes to open: localStorage, empty by then, would show the player level 1.

import { STORAGE_KEY, loadProgress, readProgress, saveProgress, type Progress } from './progress.ts';

export const DB_NAME = 'pixelpeel';
export const DB_VERSION = 1;
export const STATE = 'state';
export const ATTEMPTS = 'attempts';
/** In STATE: the version that moved localStorage in. */
export const MOVED = 'moved';

/** Where 1.4.0 to 1.5.0 kept the finished attempts, one line each, and the attempt in play. */
export const LOG_KEY = 'pixelpeel.solvelog';
export const RUN_KEY = 'pixelpeel.solvelog.run';

/** In localStorage, 'indexeddb' once IndexedDB has been read; nothing removes it. */
export const KEEP_KEY = 'pixelpeel.keep';

/** How long a start waits for IndexedDB to open before it plays on localStorage, until KEEP_KEY is set. */
export const OPEN_MS = 1000;

type LocalStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

/** What a start finds kept: the progress, the finished attempts' lines, and the attempt in play's line. */
export interface Kept {
  progress: Progress;
  lines: string[];
  run: string | null;
}

/** One write, all of it or none: the progress, a finished line added after the oldest `drop` go, the attempt in play (null: none). */
export interface Write {
  progress?: Progress | undefined;
  add?: { line: string; drop: number };
  run?: string | null;
}

export interface Keeper {
  readonly where: 'indexeddb' | 'localstorage';
  write(w: Write): void;
}

/** What localStorage holds, as 1.5.0 kept it. */
export function localKept(store: LocalStore | null): Kept {
  const get = (key: string): string | null => {
    try {
      return store?.getItem(key) ?? null;
    } catch {
      return null;
    }
  };
  const log = get(LOG_KEY);
  return { progress: loadProgress(store), lines: log ? log.split('\n') : [], run: get(RUN_KEY) };
}

/** Writes to localStorage as 1.5.0 did; `lines` is what it holds, which it keeps in step. */
export function localKeeper(store: LocalStore | null, lines: readonly string[]): Keeper {
  const log = lines.slice();
  const set = (key: string, value: string | null): void => {
    try {
      if (value === null) store?.removeItem(key);
      else store?.setItem(key, value);
    } catch {
      // Storage is full or refused: the game goes on, it just will not keep this.
    }
  };
  return {
    where: 'localstorage',
    write(w) {
      if (w.progress) saveProgress(store, w.progress);
      if (w.add) {
        log.splice(0, w.add.drop);
        log.push(w.add.line);
        set(LOG_KEY, log.join('\n'));
      }
      if (w.run !== undefined) set(RUN_KEY, w.run);
    },
  };
}

/** The browser's IndexedDB, or undefined where even asking for it throws. */
export function browserIdb(): IDBFactory | undefined {
  try {
    return globalThis.indexedDB;
  } catch {
    return undefined;
  }
}

/** The database, or null when it cannot open within the time (Infinity: when it cannot open). */
export function openDb(idb: IDBFactory | undefined, ms = OPEN_MS): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    let late = false;
    const timer = Number.isFinite(ms)
      ? setTimeout(() => {
          late = true;
          resolve(null);
        }, ms)
      : undefined;
    const done = (db: IDBDatabase | null): void => {
      clearTimeout(timer);
      if (!late) resolve(db);
      else db?.close();
    };
    try {
      const req = (idb as IDBFactory).open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STATE)) db.createObjectStore(STATE);
        if (!db.objectStoreNames.contains(ATTEMPTS)) db.createObjectStore(ATTEMPTS);
      };
      req.onsuccess = () => {
        // A newer build in another tab may upgrade the database: this one lets it, and keeps no more.
        req.result.onversionchange = () => req.result.close();
        done(req.result);
      };
      req.onerror = () => done(null);
    } catch {
      done(null);
    }
  });
}

/**
 * What the database keeps, after moving localStorage in when it never was, in one transaction; with the key
 * of the oldest finished line and the next key.
 */
export function load(db: IDBDatabase, local: LocalStore | null, version: string): Promise<{ kept: Kept; first: number; next: number }> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STATE, ATTEMPTS], 'readwrite', { durability: 'strict' });
    const state = tx.objectStore(STATE);
    const attempts = tx.objectStore(ATTEMPTS);
    let result: { kept: Kept; first: number; next: number };
    let moving = false;
    const marker = state.get(MOVED);
    marker.onsuccess = () => {
      if (marker.result === undefined) {
        const kept = localKept(local);
        try {
          state.put(kept.progress, 'progress');
          kept.lines.forEach((line, i) => attempts.put(line, i + 1));
          if (kept.run !== null) state.put(kept.run, 'run');
          state.put(version, MOVED);
        } catch (e) {
          // None of it is kept: a part moved would be read as all of it.
          try {
            tx.abort();
          } catch {
            // Already aborted.
          }
          reject(e);
          return;
        }
        moving = true;
        result = { kept, first: 1, next: kept.lines.length + 1 };
        return;
      }
      const progress = state.get('progress');
      const run = state.get('run');
      const keys = attempts.getAllKeys();
      const lines = attempts.getAll();
      lines.onsuccess = () => {
        const k = keys.result as number[];
        result = {
          kept: { progress: readProgress(progress.result), lines: lines.result as string[], run: (run.result as string | undefined) ?? null },
          first: k[0] ?? 1,
          next: (k.at(-1) ?? 0) + 1,
        };
      };
    };
    tx.oncomplete = () => {
      if (moving) for (const key of [STORAGE_KEY, LOG_KEY, RUN_KEY]) forget(local, key);
      try {
        local?.setItem(KEEP_KEY, 'indexeddb');
      } catch {
        // Storage refused: the next start waits for IndexedDB only OPEN_MS.
      }
      resolve(result);
    };
    tx.onabort = () => reject(tx.error);
  });
}

function forget(store: LocalStore | null, key: string): void {
  try {
    store?.removeItem(key);
  } catch {
    // Storage refused: the keys stay, and IndexedDB, marked moved, is what is read.
  }
}

/** Writes each Write as one transaction, durable before it completes. */
export function idbKeeper(db: IDBDatabase, first: number, next: number): Keeper {
  return {
    where: 'indexeddb',
    write(w) {
      try {
        const tx = db.transaction([STATE, ATTEMPTS], 'readwrite', { durability: 'strict' });
        const state = tx.objectStore(STATE);
        if (w.progress) state.put(w.progress, 'progress');
        if (w.add) {
          const attempts = tx.objectStore(ATTEMPTS);
          for (let i = 0; i < w.add.drop; i++) attempts.delete(first++);
          attempts.put(w.add.line, next++);
        }
        if (w.run === null) state.delete('run');
        else if (w.run !== undefined) state.put(w.run, 'run');
      } catch {
        // The database closed or refused: the game goes on, it just will not keep this.
      }
    },
  };
}

/** The keeper a start writes through and what it found kept: IndexedDB when it opens, else localStorage. */
export async function openKeep(idb: IDBFactory | undefined, local: LocalStore | null, version: string, ms = OPEN_MS): Promise<{ kept: Kept; keeper: Keeper }> {
  let read = false;
  try {
    read = local?.getItem(KEEP_KEY) === 'indexeddb';
  } catch {
    // Storage refused: the start waits OPEN_MS.
  }
  const db = await openDb(idb, read ? Infinity : ms);
  if (db) {
    try {
      const { kept, first, next } = await load(db, local, version);
      return { kept, keeper: idbKeeper(db, first, next) };
    } catch {
      db.close();
    }
  }
  const kept = localKept(local);
  return { kept, keeper: localKeeper(local, kept.lines) };
}
