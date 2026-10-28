// Dev mode: tools for trying levels while the game is worked on. It is offered only where the game is served
// for work, on a port above 5000 (the dev server and the previews on the LAN), and never on the site, which
// is served on the default port; once switched on, it stays on there.

export const DEV_KEY = 'pixelpeel.dev';

/** True only for a port above 5000, as `location.port` gives it: empty on the default port. */
export function isDevPort(port: string): boolean {
  return /^\d+$/.test(port) && Number(port) > 5000;
}
