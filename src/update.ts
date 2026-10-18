// Keeps an installed app on the latest build. The service worker (sw.ts) keeps the build for offline use;
// the browser checks for a newer one on every start, and the page asks again whenever it comes back to the
// screen, since coming back to an installed app loads nothing. Once a newer build has taken over, the page
// reloads onto it at the first moment that loses nothing. Every step fails silently: without it the page
// runs the build it has.

/** What the page is doing when a reload onto a newer build is considered. */
export interface Moment {
  /** A newer build has taken over from the one this page runs. */
  updated: boolean;
  /** The screen shows something a reload would not bring back: a pick since the level opened, or the menu. */
  busy: boolean;
  /** The page is out of sight. */
  hidden: boolean;
  /** The player is leaving a finished level, by Next or Retry. */
  leaving: boolean;
}

/** Whether the page may reload onto a newer build now. */
export function mayReload(m: Moment): boolean {
  return m.updated && (!m.busy || m.hidden || m.leaving);
}

/**
 * Registers the service worker and reloads the page onto each newer build at a safe moment. Returns the
 * check for the moments only the page knows of: the level left (leaving) or the screen no longer busy.
 */
export function keepUpdated(busy: () => boolean): (leaving?: boolean) => void {
  let updated = false;
  const reloadIfSafe = (leaving = false): void => {
    const hidden = document.visibilityState === 'hidden';
    if (!mayReload({ updated, busy: busy(), hidden, leaving })) return;
    updated = false;
    location.reload();
  };
  try {
    const sw = navigator.serviceWorker;
    if (!sw) return reloadIfSafe;
    // The first worker to take over keeps the very build this page runs: nothing to reload for.
    let controlled = sw.controller !== null;
    sw.addEventListener('controllerchange', () => {
      updated = controlled;
      controlled = true;
      reloadIfSafe();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') reloadIfSafe();
      else sw.getRegistration().then((r) => r?.update()).catch(() => {});
    });
    sw.register('/sw.js').catch(() => {});
  } catch {
    // No service worker here: the page runs the build it has.
  }
  return reloadIfSafe;
}
