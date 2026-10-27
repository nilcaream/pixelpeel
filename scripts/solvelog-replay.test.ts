import { describe, expect, it } from 'vitest';
import levelsFile from '../src/levels.json' with { type: 'json' };
import type { Level } from '../src/levels.ts';
import { encodeAttempt } from '../src/solvelog.ts';
import { replayLine } from './solvelog-replay.ts';

const levels = levelsFile as unknown as Level[];
const level = levels[0] as Level;
const line = (outcome: 'w' | 's' | 'l' | '-', picks: number[], id = level.id) =>
  encodeAttempt({ version: '1.4.1', level: level.number, id, n: 1, outcome, picks });

describe('solve log replay', () => {
  it('reaches the logged outcome on the winning order, and a game cut short is still playing', () => {
    const order = level.winningOrder;
    expect(replayLine(line('w', order), levels)).toMatchObject({ reached: 'w', ok: true, idMatches: true });
    expect(replayLine(line('l', order.slice(0, 3)), levels)).toMatchObject({ reached: '-', ok: true });
    expect(replayLine(line('-', order.slice(0, 3)), levels)?.ok).toBe(true);
  });

  it('says when the picks do not reach the logged outcome or the level changed', () => {
    expect(replayLine(line('w', level.winningOrder.slice(0, 3)), levels)?.ok).toBe(false);
    expect(replayLine(line('w', level.winningOrder, '00000000'), levels)?.idMatches).toBe(false);
    expect(replayLine('# a comment', levels)).toBeNull();
  });
});
