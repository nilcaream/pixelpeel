import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadProgress, saveProgress } from './progress.ts';

function memory(): Pick<Storage, 'getItem' | 'setItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('progress', () => {
  it('starts at level 1 with nothing in play', () => {
    expect(loadProgress(memory())).toEqual({ level: 1, run: null });
    expect(loadProgress(null)).toEqual({ level: 1, run: null });
  });

  it('gives back what was saved', () => {
    const store = memory();
    const p = { level: 7, run: { id: 'abc12345', picks: [{ tick: 0, column: 2 }, { tick: 14, column: 0 }] } };
    saveProgress(store, p);
    expect(loadProgress(store)).toEqual(p);
  });

  it('starts fresh from a damaged record rather than failing', () => {
    const store = memory();
    store.data.set(STORAGE_KEY, '{not json');
    expect(loadProgress(store)).toEqual({ level: 1, run: null });
    store.data.set(STORAGE_KEY, JSON.stringify({ level: 4, run: { id: 'x', picks: [{ tick: 'soon' }] } }));
    expect(loadProgress(store)).toEqual({ level: 4, run: null });
    store.data.set(STORAGE_KEY, JSON.stringify({ level: -3, run: null }));
    expect(loadProgress(store)).toEqual({ level: 1, run: null });
  });

  it('goes on without saving when storage refuses', () => {
    const refusing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(() => saveProgress(refusing, { level: 2, run: null })).not.toThrow();
    expect(loadProgress(refusing)).toEqual({ level: 1, run: null });
  });
});
