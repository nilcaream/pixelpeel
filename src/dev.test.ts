import { describe, expect, it } from 'vitest';
import { isDevHost } from './dev.ts';

describe('dev mode', () => {
  it('is offered on 127.0.0.1 and on no other host', () => {
    expect(isDevHost('127.0.0.1')).toBe(true);
    for (const host of ['localhost', '127.0.0.2', '::1', '[::1]', '0.0.0.0', '192.0.2.10', 'nilcaream.github.io', '']) {
      expect(isDevHost(host), host).toBe(false);
    }
  });
});
