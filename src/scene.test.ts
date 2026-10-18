import { describe, expect, it } from 'vitest';
import { deal, perturb, play } from './generator.ts';
import { HOUSE, HOUSE_RULES } from './level.ts';
import { parsePicture } from './picture.ts';
import { seededRng } from './rng.ts';
import { createBoard, pick, EMPTY, type Board } from './rules.ts';
import { AT_BUCKET, createScene, freeSlot, idle, place, squareOf, tick, type Scene } from './scene.ts';

const COLOURS = { A: '#ff0000', B: '#ffff00' };
const A = 0;
const B = 1;

/** Picks a column on the board and shows it on the scene, as the page does. */
function both(board: Board, scene: Scene, column: number): [Board, Scene] {
  const r = pick(board, column);
  if (!r) throw new Error('no pick');
  return [r.board, place(scene, r.pot, r.lifts)];
}

function settle(scene: Scene, limit = 5000): Scene {
  let s = scene;
  for (let i = 0; i < limit && !idle(s); i++) s = tick(s);
  return s;
}

describe('the scene', () => {
  it('sends a dot out of its bucket to each lifted pixel, and the dot and the pixel vanish together', () => {
    let board = createBoard(parsePicture(['AAA'], COLOURS), [[{ colour: A, count: 3 }]], 1);
    let scene = createScene(board);
    [board, scene] = both(board, scene, 0);
    scene = tick(scene);
    const route = scene.dots[0]?.route ?? [];
    expect(route[0]).toBe(AT_BUCKET);
    const pixel = squareOf(scene, route.at(-1) as number);
    expect(pixel).toBeGreaterThanOrEqual(0);
    while (scene.cells[pixel] !== EMPTY) {
      expect(scene.dots.some((d) => d.route === route)).toBe(true);
      scene = tick(scene);
    }
    expect(scene.dots.some((d) => d.route.at(-1) === route.at(-1))).toBe(false);
    expect(Array.from(settle(scene).cells)).toEqual(Array.from(board.cells));
  });

  it('counts down as its dots leave and is gone the moment the last one has left', () => {
    let board = createBoard(parsePicture(['AAA'], COLOURS), [[{ colour: A, count: 3 }]], 1);
    let scene = createScene(board);
    [board, scene] = both(board, scene, 0);
    const shown: number[] = [];
    let freedWhileOut = false;
    for (let i = 0; i < 40 && !idle(scene); i++) {
      scene = tick(scene);
      const slot = scene.slots[0];
      if (slot) shown.push(slot.count - slot.sent);
      else if (scene.dots.length > 0) freedWhileOut = true;
    }
    expect([...new Set(shown)]).toEqual([2, 1]);
    expect(freedWhileOut).toBe(true);
    expect(freeSlot(scene)).toBe(0);
  });

  it('holds a dot in its bucket until the pixels on its way are lifted on screen', () => {
    // Red waits inside yellow; the yellow pot's dots open the way, and only then does red's dot go.
    const picture = parsePicture(['BBB', 'BAB', 'BBB'], COLOURS);
    let board = createBoard(picture, [[{ colour: A, count: 1 }, { colour: B, count: 8 }]], 2);
    let scene = createScene(board);
    [board, scene] = both(board, scene, 0);
    [board, scene] = both(board, scene, 0);
    while (!scene.dots.some((d) => d.colour === A)) scene = tick(scene);
    expect(scene.cells[7]).toBe(EMPTY);
  });

  it('plays any game out to exactly the picture the rules left, each dot going out over emptied squares only', () => {
    const columns = perturb(deal(HOUSE, HOUSE_RULES).columns.flat(), 4, { spread: 40, reverse: 1.5, merge: 0.3 }, seededRng(3));
    for (let seed = 1; seed <= 5; seed++) {
      const game = play(HOUSE, columns, 4, seed, 'random');
      let board = createBoard(HOUSE, columns, 4);
      let scene = createScene(board);
      for (const column of game.picks) {
        while (freeSlot(scene) < 0) scene = tick(scene);
        [board, scene] = both(board, scene, column);
        scene = tick(scene);
        // A dot that has just set off is at the start of its route; dots set off at the end of a tick.
        for (const dot of scene.dots.filter((d) => d.pos === 0)) {
          for (const cell of dot.route.slice(1, -1)) {
            const square = squareOf(scene, cell);
            expect(square < 0 || scene.cells[square] === EMPTY).toBe(true);
          }
        }
      }
      scene = settle(scene, 100000);
      expect(idle(scene), `seed ${seed}`).toBe(true);
      expect(Array.from(scene.cells), `seed ${seed}`).toEqual(Array.from(board.cells));
    }
  });
});
