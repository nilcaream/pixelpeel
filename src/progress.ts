// What the browser keeps between visits: the level the player has reached, and the picks of the level
// in play, saved after every pick. The rules depend on nothing but the order of the picks, so the
// columns picked, in turn, bring the game back to exactly where it was left. Storage may be missing or
// refuse (a private window, blocked site data); then the game plays on without saving.

export interface Progress {
  /** The level the player is on: the first one not yet peeled, counting from 1. */
  level: number;
  /** The level in play, by its id, and the columns picked in it so far. */
  run: { id: string; picks: number[] } | null;
}

export const STORAGE_KEY = 'pixelpeel.progress';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

const FRESH: Progress = { level: 1, run: null };

function isPick(p: unknown): p is number {
  return Number.isInteger(p) && (p as number) >= 0;
}

export function loadProgress(store: Store | null): Progress {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return FRESH;
    const p = JSON.parse(raw) as Progress;
    const level = Number.isInteger(p.level) && p.level >= 1 ? p.level : 1;
    const run =
      p.run && typeof p.run.id === 'string' && Array.isArray(p.run.picks) && p.run.picks.every(isPick)
        ? { id: p.run.id, picks: p.run.picks }
        : null;
    return { level, run };
  } catch {
    return FRESH;
  }
}

export function saveProgress(store: Store | null, p: Progress): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Storage is full or refused: the game goes on, it just will not resume.
  }
}

/** The browser's storage, or null where even asking for it throws. */
export function browserStore(): Store | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
