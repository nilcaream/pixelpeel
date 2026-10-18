import { describe, expect, it } from 'vitest';
import { relayoutWhenShown } from './relayout.ts';

function page() {
  const doc = Object.assign(new EventTarget(), { visibilityState: 'hidden' as DocumentVisibilityState });
  const win = new EventTarget();
  let layouts = 0;
  relayoutWhenShown({ doc, win }, () => layouts++);
  return { doc, win, layouts: () => layouts };
}

describe('the page lays itself out again', () => {
  it('when it comes back to the screen, as after a reload while out of sight', () => {
    const p = page();
    p.doc.visibilityState = 'visible';
    p.doc.dispatchEvent(new Event('visibilitychange'));
    expect(p.layouts()).toBe(1);
  });

  it('not when it goes out of sight', () => {
    const p = page();
    p.doc.dispatchEvent(new Event('visibilitychange'));
    expect(p.layouts()).toBe(0);
  });

  it('on a pageshow and on a window resize', () => {
    const p = page();
    p.win.dispatchEvent(new Event('pageshow'));
    p.win.dispatchEvent(new Event('resize'));
    expect(p.layouts()).toBe(2);
  });
});
