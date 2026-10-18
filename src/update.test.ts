import { describe, expect, it } from 'vitest';
import { mayReload, type Moment } from './update.ts';

const at = (m: Partial<Moment>): boolean => mayReload({ updated: true, busy: true, hidden: false, leaving: false, ...m });

describe('when the page reloads onto a newer build', () => {
  it('never while the build it runs is the latest', () => {
    expect(at({ updated: false, busy: false })).toBe(false);
    expect(at({ updated: false, hidden: true })).toBe(false);
    expect(at({ updated: false, leaving: true })).toBe(false);
  });

  it('not in the middle of a level on screen', () => {
    expect(at({})).toBe(false);
  });

  it('at once when the screen shows nothing a reload would not bring back', () => {
    expect(at({ busy: false })).toBe(true);
  });

  it('when the page is out of sight, even in the middle of a level', () => {
    expect(at({ hidden: true })).toBe(true);
  });

  it('when the player leaves a finished level', () => {
    expect(at({ leaving: true })).toBe(true);
  });
});
