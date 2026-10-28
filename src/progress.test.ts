import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadProgress, peeled, playable, saveProgress } from './progress.ts';

function memory(): Pick<Storage, 'getItem' | 'setItem'> & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
}

describe('progress', () => {
  it('starts at level 1 with nothing in play', () => {
    expect(loadProgress(memory())).toEqual({ level: 1, reached: 1, run: null });
    expect(loadProgress(null)).toEqual({ level: 1, reached: 1, run: null });
  });

  it('gives back what was saved', () => {
    const store = memory();
    const p = { level: 3, reached: 7, run: { id: 'abc12345', picks: [2, 0, 1] } };
    saveProgress(store, p);
    expect(loadProgress(store)).toEqual(p);
  });

  it('reads what 1.5.0 saved, under the same key, unchanged', () => {
    expect(STORAGE_KEY).toBe('pixelpeel.progress');
    const store = memory();
    store.data.set(STORAGE_KEY, '{"level":42,"reached":57,"run":{"id":"176b3796","picks":[0,2,1,3]}}');
    expect(loadProgress(store)).toEqual({ level: 42, reached: 57, run: { id: '176b3796', picks: [0, 2, 1, 3] } });
    store.data.set(STORAGE_KEY, '{"level":101,"reached":101,"run":null}');
    expect(loadProgress(store)).toEqual({ level: 101, reached: 101, run: null });
  });

  it('starts fresh from a damaged record rather than failing', () => {
    const store = memory();
    store.data.set(STORAGE_KEY, '{not json');
    expect(loadProgress(store)).toEqual({ level: 1, reached: 1, run: null });
    store.data.set(STORAGE_KEY, JSON.stringify({ level: 4, reached: 4, run: { id: 'x', picks: [1, 'soon'] } }));
    expect(loadProgress(store)).toEqual({ level: 4, reached: 4, run: null });
    store.data.set(STORAGE_KEY, JSON.stringify({ level: 4, reached: 4, run: { id: 'x', picks: [{ tick: 0, column: 2 }] } }));
    expect(loadProgress(store)).toEqual({ level: 4, reached: 4, run: null });
    store.data.set(STORAGE_KEY, JSON.stringify({ level: -3, reached: 1, run: null }));
    expect(loadProgress(store)).toEqual({ level: 1, reached: 1, run: null });
  });

  it('never has the player reach less than the level in play', () => {
    const store = memory();
    store.data.set(STORAGE_KEY, JSON.stringify({ level: 6, reached: 2, run: null }));
    expect(loadProgress(store)).toEqual({ level: 6, reached: 6, run: null });
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
    expect(() => saveProgress(refusing, { level: 2, reached: 2, run: null })).not.toThrow();
    expect(loadProgress(refusing)).toEqual({ level: 1, reached: 1, run: null });
  });

  it('keeps how far the player got when a level already peeled is peeled again', () => {
    expect(peeled({ level: 3, reached: 7, run: null })).toEqual({ level: 4, reached: 7, run: null });
    expect(peeled({ level: 7, reached: 7, run: { id: 'x', picks: [1] } })).toEqual({ level: 8, reached: 8, run: null });
  });

  it('offers every level peeled and the next one, and no level past the last', () => {
    expect(playable({ level: 1, reached: 1, run: null }, 10)).toEqual([1]);
    expect(playable({ level: 2, reached: 4, run: null }, 10)).toEqual([1, 2, 3, 4]);
    expect(playable({ level: 11, reached: 11, run: null }, 10)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
