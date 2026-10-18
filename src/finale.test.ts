import { describe, expect, it } from 'vitest';
import { FINALE_TEXT, tapOpensMenu } from './finale.ts';

describe('the final screen', () => {
  it('congratulates', () => {
    expect(FINALE_TEXT).toBe('Congratulations!');
  });

  it('opens the menu on a tap anywhere', () => {
    expect(tapOpensMenu({ finale: true, menuOpen: false, handled: false })).toBe(true);
  });

  it('leaves a tap on a control to it, so the menu does not close and open again', () => {
    expect(tapOpensMenu({ finale: true, menuOpen: false, handled: true })).toBe(false);
    expect(tapOpensMenu({ finale: true, menuOpen: true, handled: false })).toBe(false);
  });

  it('does nothing while a level is in play or has just ended', () => {
    expect(tapOpensMenu({ finale: false, menuOpen: false, handled: false })).toBe(false);
  });
});
