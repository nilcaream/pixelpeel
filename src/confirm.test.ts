import { describe, expect, it } from 'vitest';
import { CONFIRM_MS, confirmTaps } from './confirm.ts';

describe('a button that asks before it acts', () => {
  it('acts on a second tap within a second of the first', () => {
    const c = confirmTaps();
    expect(c.tap(5000)).toBe('arm');
    expect(c.tap(5000 + CONFIRM_MS - 1)).toBe('act');
    // Having acted, it asks again.
    expect(c.tap(5000 + CONFIRM_MS)).toBe('arm');
  });

  it('goes back to asking once a second has passed with no tap', () => {
    const c = confirmTaps();
    c.tap(5000);
    expect(c.armed(5000 + CONFIRM_MS - 1)).toBe(true);
    expect(c.armed(5000 + CONFIRM_MS)).toBe(false);
    expect(c.tap(5000 + CONFIRM_MS)).toBe('arm');
  });

  it('asks again after a reset', () => {
    const c = confirmTaps();
    c.tap(5000);
    c.reset();
    expect(c.tap(5001)).toBe('arm');
  });

  it('waits one second', () => {
    expect(CONFIRM_MS).toBe(1000);
  });
});
