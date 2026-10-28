import { describe, expect, it } from 'vitest';
import { winningLine } from '../src/bake.ts';
import levelsFile from '../src/levels.json' with { type: 'json' };
import type { Level } from '../src/levels.ts';
import { encodeAttempt } from '../src/solvelog.ts';
import { replayLine } from './solvelog-replay.ts';

const levels = levelsFile as unknown as Level[];
const level = levels[0] as Level;
const order = winningLine(level);
const line = (outcome: 'w' | 's' | 'l' | '-', picks: number[], id = level.id) =>
  encodeAttempt({ version: '1.4.1', level: level.number, id, n: 1, outcome, picks });

describe('solve log replay', () => {
  it("reaches the logged outcome on the solver's line, and a game cut short is still playing", () => {
    expect(replayLine(line('w', order), levels)).toMatchObject({ reached: 'w', ok: true, idMatches: true });
    expect(replayLine(line('l', order.slice(0, 3)), levels)).toMatchObject({ reached: '-', ok: true });
    expect(replayLine(line('-', order.slice(0, 3)), levels)?.ok).toBe(true);
  });

  it('says when the picks do not reach the logged outcome or the level changed', () => {
    expect(replayLine(line('w', order.slice(0, 3)), levels)?.ok).toBe(false);
    expect(replayLine(line('w', order, '00000000'), levels)?.idMatches).toBe(false);
    expect(replayLine('# a comment', levels)).toBeNull();
  });
});
