import { describe, expect, it } from 'vitest';
import levelsFile from '../../src/levels.json' with { type: 'json' };
import type { Level } from '../../src/levels.ts';
import { poolPicture } from '../../src/picture.ts';
import { seededRng } from '../../src/rng.ts';
import { createBoard, pick, reachable, status, type Board } from '../../src/rules.ts';
import { explore, Game, gameOf, lineOf, solve, type Position } from './tree.ts';

const levels = levelsFile as unknown as Level[];

describe('Game', () => {
  it('picks as src/rules.ts does, pick for pick, on random games of shipped levels', () => {
    for (const number of [1, 30, 60, 77, 82, 90]) {
      const level = levels.find((l) => l.number === number) as Level;
      const game = gameOf(level);
      for (let seed = 1; seed <= 3; seed++) {
        const rng = seededRng(seed);
        let b: Board = createBoard(poolPicture(level.rows), level.columns, level.structure.buckets);
        let p: Position = game.start();
        while (status(b) === 'playing') {
          expect(game.status(p)).toBe('playing');
          expect(game.free(p)).toEqual(reachable(b));
          const open = b.columns.flatMap((c, i) => (c.length ? [i] : []));
          const column = open[Math.floor(rng() * open.length)] as number;
          b = (pick(b, column) as { board: Board }).board;
          p = game.pick(p, column) as Position;
          expect([...p.cells]).toEqual([...b.cells]);
          expect(p.held).toEqual(b.held.map((h) => ({ colour: h.colour, left: h.left })));
          expect([...p.depths]).toEqual(level.columns.map((c, i) => c.length - (b.columns[i] as unknown[]).length));
          expect(game.unkey(game.key(p))).toEqual(p);
        }
        expect(game.status(p)).toBe(status(b));
      }
    }
  }, 20_000);
});

describe('explore and solve', () => {
  // A red square shut in by eight yellow ones; column 0: red 1, yellow 4; column 1: yellow 4.
  // Red first is a dig and holds a bucket until a yellow pot opens it.
  const picture = poolPicture(['yyy', 'yry', 'yyy']);
  const yellow = picture.cells[0] as number;
  const red = picture.cells[4] as number;
  const columns = [
    [
      { colour: red, count: 1 },
      { colour: yellow, count: 4 },
    ],
    [{ colour: yellow, count: 4 }],
  ];

  it('counts every game and wins only through the order that opens red', async () => {
    const one = new Game(picture, columns, 1);
    const tree = await explore(one);
    const m = solve(one, tree);
    // With one bucket, red first is stuck at once; yellow first opens red from below, then red, then yellow wins.
    expect(m.terminal).toEqual({ won: 1, stuck: 1 });
    expect(10 ** m.log10Games).toBeCloseTo(2);
    expect(10 ** m.log10Wins).toBeCloseTo(1);
    expect(m.per.U?.win).toBeCloseTo(0.5);
    expect(m.per.S?.win).toBeCloseTo(1);
    expect(m.traps).toBe(1);
    expect(m.per.U?.deadEnd[0]).toBeCloseTo(1);
    expect(m.per.U?.digs).toBeCloseTo(0.5);
    // After the first yellow pot, 4 of 9 squares are gone, only column 0 is left, and every line from there wins.
    expect(m.per.U?.forcedWon.mean).toBeCloseTo(4 / 9);
    expect(m.per.U?.decided.mean).toBeCloseTo(4 / 9);
    expect(m.per.U?.forcedLost.mean).toBeCloseTo(0);
    expect(lineOf(one, [1, 0, 0])).toEqual({ forced: 4 / 9, decided: 4 / 9 });
  });

  it('measures the sensible player the same on its own positions as on the whole tree', async () => {
    for (const buckets of [1, 2]) {
      const game = new Game(picture, columns, buckets);
      const whole = solve(game, await explore(game));
      const own = solve(game, await explore(game, Infinity, () => {}, 'S'));
      expect(own.per.U).toBeUndefined();
      // Whether every line wins needs the picks it never makes, so that one point is left out.
      expect(own.per.S?.decided.mean).toBeNaN();
      expect({ ...own.per.S, decided: null }).toEqual({ ...whole.per.S, decided: null });
    }
  });

  it('lets a second bucket hold the dig, so every game wins', async () => {
    const two = new Game(picture, columns, 2);
    const m = solve(two, await explore(two));
    expect(m.per.U?.win).toBeCloseTo(1);
    expect(m.traps).toBe(0);
    expect(10 ** m.log10Games).toBeCloseTo(3);
  });
});
