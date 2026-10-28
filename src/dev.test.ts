import { describe, expect, it } from 'vitest';
import { isDevPort } from './dev.ts';

describe('dev mode', () => {
  it('is offered on a port above 5000 and nowhere else', () => {
    for (const port of ['5001', '5173', '5197', '8080', '65535']) expect(isDevPort(port), port).toBe(true);
    for (const port of ['', '80', '443', '5000', '4999', '0', 'abc', '50x1', ' 6000']) expect(isDevPort(port), port).toBe(false);
  });
});
