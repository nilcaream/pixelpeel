// When the page lays itself out again. A page loaded or reloaded while out of sight (the update's reload,
// src/update.ts) can be measured at a size it does not have on the screen; it is measured again whenever it
// comes back to the screen, as well as on every window resize.

/** The page's events this needs: the window's resize and pageshow, and the document's visibility. */
export interface Shown {
  doc: EventTarget & { readonly visibilityState: DocumentVisibilityState };
  win: EventTarget;
}

/** Calls `layout` on a window resize, on a pageshow, and whenever the page becomes visible. */
export function relayoutWhenShown({ doc, win }: Shown, layout: () => void): void {
  win.addEventListener('resize', layout);
  win.addEventListener('pageshow', layout);
  doc.addEventListener('visibilitychange', () => {
    if (doc.visibilityState === 'visible') layout();
  });
}
