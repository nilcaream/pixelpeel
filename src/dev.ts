// Dev mode: tools for trying levels while the game is worked on. It is offered only on the machine the
// game is worked on, reached as 127.0.0.1, and nowhere else; once switched on, it stays on there.

export const DEV_HOST = '127.0.0.1';

export const DEV_KEY = 'pixelpeel.dev';

/** True only for exactly 127.0.0.1: not localhost, not another loopback address, not a published site. */
export function isDevHost(hostname: string): boolean {
  return hostname === DEV_HOST;
}
