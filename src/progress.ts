// What the browser keeps between visits: the level the player has reached, the level in play (which may
// be one already peeled, played again from the menu), and the picks of the level in play, saved after
// every pick. The rules depend on nothing but the order of the picks, so the
// columns picked, in turn, bring the game back to exactly where it was left. Storage may be missing or
// refuse (a private window, blocked site data); then the game plays on without saving.

export interface Progress {
  /** The level in play, counting from 1. */
  level: number;
  /** The first level not yet peeled: every level before it can be played again. Never below level. */
  reached: number;
  /** The level in play, by its id, and the columns picked in it so far. */
  run: { id: string; picks: number[] } | null;
}

export const STORAGE_KEY = 'pixelpeel.progress';

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export const FRESH: Progress = { level: 1, reached: 1, run: null };

const isLevel = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 1;

function isPick(p: unknown): p is number {
  return Number.isInteger(p) && (p as number) >= 0;
}

export function loadProgress(store: Store | null): Progress {
  try {
    const raw = store?.getItem(STORAGE_KEY);
    if (!raw) return FRESH;
    const p = JSON.parse(raw) as Progress;
    const level = isLevel(p.level) ? p.level : 1;
    const reached = Math.max(level, isLevel(p.reached) ? p.reached : 1);
    const run =
      p.run && typeof p.run.id === 'string' && Array.isArray(p.run.picks) && p.run.picks.every(isPick)
        ? { id: p.run.id, picks: p.run.picks }
        : null;
    return { level, reached, run };
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

/** The progress once the level in play is peeled: on to the next level, and the reach grows with it. */
export function peeled(p: Progress): Progress {
  return { level: p.level + 1, reached: Math.max(p.reached, p.level + 1), run: null };
}

/** The levels the menu offers: every one peeled, and the first one not yet peeled, if there is one. */
export function playable(p: Progress, total: number): number[] {
  return Array.from({ length: Math.min(p.reached, total) }, (_, i) => i + 1);
}

/** The browser's storage, or null where even asking for it throws. */
export function browserStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
