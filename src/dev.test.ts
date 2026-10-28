import { describe, expect, it } from 'vitest';
import { bandLabel, isDevPort, stepAt } from './dev.ts';

describe('dev mode', () => {
  it('is offered on a port above 5000 and nowhere else', () => {
    for (const port of ['5001', '5173', '5197', '8080', '65535']) expect(isDevPort(port), port).toBe(true);
    for (const port of ['', '80', '443', '5000', '4999', '0', 'abc', '50x1', ' 6000']) expect(isDevPort(port), port).toBe(false);
  });

  it('shows the band, and in dev mode the depth and the casual win share with it', () => {
    const level = { band: 'hard', depth: 3, casualWins: 26 } as const;
    expect(bandLabel(level, false)).toBe('(hard)');
    expect(bandLabel(level, true)).toBe('(hard d3 13%)');
  });

  it('steps back on the left third of the picture, on on the right third, and not elsewhere', () => {
    const box = { left: 10, top: 20, width: 90, height: 60 };
    expect([10, 39, 40, 69, 71, 100].map((x) => stepAt(x, 50, box))).toEqual([-1, -1, 0, 0, 1, 1]);
    expect([stepAt(9, 50, box), stepAt(101, 50, box), stepAt(20, 19, box), stepAt(90, 81, box)]).toEqual([0, 0, 0, 0]);
  });
});
