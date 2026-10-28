// When the page lays itself out again. A page loaded or reloaded while out of sight (the update's reload,
// src/update.ts) can be measured at a size it does not have on the screen; it is measured again whenever it
// comes back to the screen, as well as on every window resize, on a change of the screen's pixel density, and
// when the browser gives back a canvas it had taken away.
//
// That last one is why a canvas's scale is also set again before every frame. A browser may drop a canvas's
// drawing (when its GPU process restarts, or on a phone short of memory while the app is away) and give it back
// later, blank and with its settings reset, its size kept: the scale back at 1, the picture would be drawn
// one CSS pixel to each device pixel, into the top-left corner of the canvas.

/** The page's events this needs: the window's resize, pageshow and density, the document's visibility, the canvas's return. */
export interface Shown {
  doc: EventTarget & { readonly visibilityState: DocumentVisibilityState };
  win: EventTarget & { readonly devicePixelRatio: number; matchMedia(query: string): EventTarget };
  canvas: EventTarget;
}

/**
 * Calls `layout` on a window resize, on a pageshow, whenever the page becomes visible, whenever the screen's
 * pixel density changes, and when the canvas is given back after it was lost.
 */
export function relayoutWhenShown({ doc, win, canvas }: Shown, layout: () => void): void {
  win.addEventListener('resize', layout);
  win.addEventListener('pageshow', layout);
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') layout();
  });
  canvas.addEventListener('contextrestored', layout);
  // A query matches one density only, so each change watches for the next from the new one.
  const watchDensity = (): void => {
    win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`).addEventListener(
      'change',
      () => {
        layout();
        watchDensity();
      },
      { once: true },
    );
  };
  watchDensity();
}

/** The part of a 2D context the scale needs. */
export interface Scaled {
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
}

/** A canvas drawn in CSS pixels at the screen's density. */
export interface Sharp {
  /** Sizes the canvas for a box of this size in CSS pixels at this density. */
  fit(width: number, height: number, dpr: number): void;
  /** Sets the scale again, at the start of every frame. */
  frame(): void;
}

export function sharpCanvas(canvas: { width: number; height: number }, ctx: Scaled): Sharp {
  let scale = 1;
  const frame = (): void => ctx.setTransform(scale, 0, 0, scale, 0, 0);
  return {
    fit(width, height, dpr) {
      scale = dpr;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      frame();
    },
    frame,
  };
}
