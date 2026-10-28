import { describe, expect, it } from 'vitest';
import { relayoutWhenShown, sharpCanvas } from './relayout.ts';

function page() {
  const doc = Object.assign(new EventTarget(), { visibilityState: 'hidden' as DocumentVisibilityState });
  // One query per density, as matchMedia gives: a change is sent to the query of the density that was.
  const queries = new Map<string, EventTarget>();
  const win = Object.assign(new EventTarget(), {
    devicePixelRatio: 2,
    matchMedia(query: string) {
      const q = queries.get(query) ?? new EventTarget();
      queries.set(query, q);
      return q;
    },
  });
  const canvas = new EventTarget();
  let layouts = 0;
  relayoutWhenShown({ doc, win, canvas }, () => layouts++);
  const density = (dpr: number) => {
    const was = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
    win.devicePixelRatio = dpr;
    was.dispatchEvent(new Event('change'));
  };
  return { doc, win, canvas, density, layouts: () => layouts };
}

/** A 2D context's transform, which a lost context forgets, its canvas keeping its size. */
function context() {
  const canvas = { width: 300, height: 150 };
  const ctx = {
    transform: [1, 0, 0, 1, 0, 0],
    setTransform(...m: number[]) {
      ctx.transform = m;
    },
    lose() {
      ctx.transform = [1, 0, 0, 1, 0, 0];
    },
  };
  return { canvas, ctx };
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

  it('when the canvas is given back after it was lost', () => {
    const p = page();
    p.canvas.dispatchEvent(new Event('contextrestored'));
    expect(p.layouts()).toBe(1);
  });

  it('at every change of the pixel density, not only the first', () => {
    const p = page();
    p.density(3);
    p.density(1);
    p.density(2);
    expect(p.layouts()).toBe(3);
  });
});

describe('the canvas stays sharp', () => {
  it('sizes its pixels for the density and draws in CSS pixels', () => {
    const { canvas, ctx } = context();
    sharpCanvas(canvas, ctx).fit(400, 800, 2.625);
    expect([canvas.width, canvas.height]).toEqual([1050, 2100]);
    expect(ctx.transform).toEqual([2.625, 0, 0, 2.625, 0, 0]);
  });

  it('draws at the full screen again when a context lost in the background comes back after the page was shown', () => {
    const { canvas, ctx } = context();
    const sharp = sharpCanvas(canvas, ctx);
    sharp.fit(400, 800, 2);
    // Put away: the context is lost. Back: visibilitychange measures the page, then the context comes back reset.
    ctx.lose();
    sharp.fit(400, 800, 2);
    ctx.lose();
    sharp.frame();
    expect(ctx.transform).toEqual([2, 0, 0, 2, 0, 0]);
    expect([canvas.width, canvas.height]).toEqual([800, 1600]);
  });
});
