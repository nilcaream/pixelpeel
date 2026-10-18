import { describe, expect, it } from 'vitest';
import levelsFile from './levels.json';
import type { Level } from './levels.ts';
import { LOGO_TITLE, logoRows } from './logo.ts';

const level = (levelsFile as unknown as Level[]).find((l) => l.title === LOGO_TITLE) as Level;

describe('the logo', () => {
  it('is square, with the level picture unchanged in the middle', () => {
    const rows = logoRows(level.sceneSeed);
    expect(rows.length).toBe(rows[0]?.length);
    const pad = (rows.length - level.rows.length) / 2;
    expect(pad).toBeGreaterThan(0);
    expect(rows.slice(pad, pad + level.rows.length)).toEqual(level.rows);
  });

  it('goes on with the scene above and below: sky over it, sand under it, no empty squares', () => {
    const rows = logoRows(level.sceneSeed);
    const pad = (rows.length - level.rows.length) / 2;
    expect(rows.slice(0, pad).join('')).toMatch(/^s+$/);
    expect(rows.slice(-pad).join('')).toMatch(/^[yo]+$/);
  });
});
