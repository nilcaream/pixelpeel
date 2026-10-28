// Dev mode: tools for trying levels while the game is worked on. It is offered only where the game is served
// for work, on a port above 5000 (the dev server and the previews on the LAN), and never on the site, which
// is served on the default port; once switched on, it stays on there. While on, the level's band shows what
// the bake measured, and a tap on the picture's left or right third opens the level before or after.

import { CASUAL_GAMES, type Level } from './levels.ts';

export const DEV_KEY = 'pixelpeel.dev';

/** True only for a port above 5000, as `location.port` gives it: empty on the default port. */
export function isDevPort(port: string): boolean {
  return /^\d+$/.test(port) && Number(port) > 5000;
}

/** The band under the level's name: "(hard)", and in dev mode its depth and casual win share, "(hard d3 13%)". */
export function bandLabel(level: Pick<Level, 'band' | 'depth' | 'casualWins'>, dev: boolean): string {
  if (!dev) return `(${level.band})`;
  return `(${level.band} d${level.depth} ${Math.round((level.casualWins / CASUAL_GAMES) * 100)}%)`;
}

/** Where a tap falls on the picture: -1 on its left third, 1 on its right third, else 0. */
export function stepAt(x: number, y: number, box: { left: number; top: number; width: number; height: number }): -1 | 0 | 1 {
  if (y < box.top || y > box.top + box.height || x < box.left || x > box.left + box.width) return 0;
  const third = (x - box.left) / box.width;
  return third < 1 / 3 ? -1 : third > 2 / 3 ? 1 : 0;
}
