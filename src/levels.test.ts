import { describe, expect, it } from 'vitest';
import { missBy } from './bake.ts';
import { measure } from './generator.ts';
import levelsFile from './levels.json';
import {
  BAKED_WITHOUT_GATES,
  BAKED_WITHOUT_HOLDOUT,
  BLOCKS,
  CASUAL_GAMES,
  HOLDOUT_CASUAL,
  MAX_LUCK,
  bandFor,
  casualFit,
  holdsBand,
  innerCasual,
  letterMap,
  levelId,
  gaugeMisreads,
  margin,
  passesGates,
  relabel,
  ruleFor,
  thinkerFit,
  type BandRule,
  type Level,
} from './levels.ts';
import { POOL, checkOverrides, colourByChar } from './palette.ts';
import { paintedPicture, poolPicture } from './picture.ts';
import { SCENES, sceneRows } from './scenes.ts';
import { solve } from './thinker.ts';

const levels = levelsFile as unknown as Level[];
const each = levels.map((l) => [l.number, l] as const);

describe('the bands', () => {
  it('stop easy at 0.98 of casual games, so no level is won by every one', () => {
    expect(casualFit(ruleFor(1), 0.98)).toBe('in');
    expect(casualFit(ruleFor(1), 0.985)).toBe('easier');
    expect(casualFit(ruleFor(2), 0.45)).toBe('harder');
  });

  it('give the depth a thinker needs, or say which way the deal is off', () => {
    expect(thinkerFit(ruleFor(1), [0.95])).toBe(1);
    expect(thinkerFit(ruleFor(1), [0.5])).toBe('harder');
    expect(thinkerFit(ruleFor(3), [0.7])).toBe('easier');
    expect(thinkerFit(ruleFor(3), [0.5, 0.95])).toBe(2);
    expect(thinkerFit(ruleFor(10), [0.3, 0.7])).toBe('easier');
    expect(thinkerFit(ruleFor(10), [0.3, 0.5, 0.8])).toBe('harder');
    expect(thinkerFit(ruleFor(10), [0.3, 0.5, 0.85])).toBe(3);
  });

  it('take a level to the rule of its block, and a level past the last block to the last', () => {
    expect(ruleFor(10)).toBe(BLOCKS[0]?.['very hard']);
    expect(ruleFor(11)).toBe(BLOCKS[1]?.easy);
    expect(ruleFor(20)).toBe(BLOCKS[1]?.['very hard']);
    expect(ruleFor(41)).toBe(BLOCKS[4]?.easy);
    expect(ruleFor(60)).toBe(BLOCKS[4]?.['very hard']);
    expect(ruleFor(51)).toBe(BLOCKS[4]?.easy);
    expect(ruleFor(61)).toBe(BLOCKS[6]?.easy);
    expect(ruleFor(90)).toBe(BLOCKS[8]?.['very hard']);
    expect(ruleFor(10 * BLOCKS.length + 1)).toBe(BLOCKS[BLOCKS.length - 1]?.easy);
  });

  it('make each block a step harder than the one before: no band easier, and the casual range lower on some band', () => {
    for (let b = 1; b < BLOCKS.length; b++) {
      if (b === 5) {
        expect(BLOCKS[5], 'levels 51–60 keep the bands of 41–50').toBe(BLOCKS[4]);
        continue;
      }
      let lower = 0;
      for (const band of ['easy', 'medium', 'hard', 'very hard'] as const) {
        const [was, is] = [BLOCKS[b - 1]?.[band], BLOCKS[b]?.[band]] as [BandRule, BandRule];
        expect(is.casual[1], `${band} in block ${b + 1}`).toBeLessThanOrEqual(was.casual[1]);
        expect(is.depth[1], `${band} in block ${b + 1}`).toBeGreaterThanOrEqual(was.depth[1]);
        is.shallow.forEach((cap, i) => expect(cap, `${band} in block ${b + 1}, depth ${i + 1}`).toBeLessThanOrEqual(was.shallow[i] ?? 1));
        if (is.casual[1] < was.casual[1]) lower++;
      }
      expect(lower, `block ${b + 1}`).toBeGreaterThan(0);
    }
  });

  it('need a depth-2 thinker for a medium level of block 2, so looking one pick ahead is not enough', () => {
    expect(thinkerFit(ruleFor(12), [0.95])).toBe('easier');
    expect(thinkerFit(ruleFor(12), [0.6, 0.9])).toBe(2);
  });

  it('hold depth 1 to 0.3 on a hard level of block 3, and let very hard be won at depth 3 or 4', () => {
    expect(ruleFor(21)).toBe(BLOCKS[2]?.easy);
    expect(ruleFor(40)).toBe(BLOCKS[3]?.['very hard']);
    expect(thinkerFit(ruleFor(23), [0.35, 0.95])).toBe('easier');
    expect(thinkerFit(ruleFor(23), [0.3, 0.95])).toBe(2);
    expect(thinkerFit(ruleFor(23), [0.2, 0.5, 0.9])).toBe(3);
    expect(thinkerFit(ruleFor(30), [0.1, 0.3, 0.9])).toBe('easier');
    expect(thinkerFit(ruleFor(30), [0.1, 0.2, 0.85])).toBe(3);
    expect(thinkerFit(ruleFor(30), [0.1, 0.2, 0.5, 0.85])).toBe(4);
    expect(casualFit(ruleFor(21), 0.75)).toBe('easier');
    expect(casualFit(ruleFor(31), 0.4)).toBe('in');
  });

  it('say how far a deal ruled out on its thinkers misses the band, and nothing for one ruled out on casual play', () => {
    const hard = ruleFor(23);
    expect(missBy(hard, { fits: false, why: 'easier', casualWins: 20, thinkers: [0.5] })).toEqual({ by: 0.2, what: 'depth-1 thinker wins 0.5, over 0.3' });
    expect(missBy(hard, { fits: false, why: 'harder', casualWins: 20, thinkers: [0.1, 0.3, 0.6] })).toEqual({ by: 0.3, what: 'depth-3 thinker wins 0.6, under 0.9' });
    expect(missBy(ruleFor(30), { fits: false, why: 'easier', casualWins: 5, thinkers: [0.1, 0.9] })).toEqual({ by: 0.65, what: 'depth-2 thinker wins 0.9, over 0.25' });
    expect(missBy(hard, { fits: false, why: 'easier', casualWins: 80, thinkers: [] })).toBeNull();
    // A deal ruled out on luck is never the closest: the level's luck must stay within MAX_LUCK.
    expect(missBy(hard, { fits: false, why: 'luck', casualWins: 20, thinkers: [0.1, 0.9] })).toBeNull();
  });
});

describe('the scene levels', () => {
  it('are one per scene, in order, on their waves', () => {
    expect(levels.map((l) => l.number)).toEqual(SCENES.map((_, i) => i + 1));
    for (const l of levels) {
      expect(l.band).toBe(bandFor(l.number));
      expect(l.title).toBe(SCENES[l.number - 1]?.title);
    }
  });

  it.each(each)('level %i is its scene, and its stored pots hold exactly the pixels of each colour', (_, l) => {
    expect(l.rows).toEqual(sceneRows(SCENES[l.number - 1] as (typeof SCENES)[number], l.sceneSeed));
    expect(l.overrides).toEqual(SCENES[l.number - 1]?.overrides);
    checkOverrides(l.rows, l.overrides);
    const picture = poolPicture(l.rows);
    const pixels = picture.palette.map((_, c) => picture.cells.filter((x) => x === c).length);
    const potted = picture.palette.map((_, c) => l.columns.flat().reduce((n, p) => n + (p.colour === c ? p.count : 0), 0));
    expect(potted).toEqual(pixels);
    expect(l.id).toBe(levelId(l.rows, l.columns, l.structure.buckets));
  });

  it.each(each)('level %i is dealt as its scene names, when it names a deal', (_, l) => {
    const named = SCENES[l.number - 1]?.deal;
    if (named) expect({ sceneSeed: l.sceneSeed, buckets: l.structure.buckets, seed: l.seed, strength: l.strength }).toEqual(named);
  });

  it.each(each)('level %i keeps no winning line: the bake proved it winnable and stored none', (_, l) => {
    expect(l).not.toHaveProperty('winningOrder');
  });

  it.each(each)('level %i can be won: the solver wins it under the rules as they are now, and the line is not kept', (_, l) => {
    expect(solve(poolPicture(l.rows), l.columns, l.structure.buckets).result).toBe('win');
  }, 30_000);

  const painted = each.filter(([, l]) => l.overrides);
  it('paints levels 61, 70, 96 and 100 navy for charcoal and level 82 teal for sky', () => {
    expect(painted.map(([n, l]) => [n, l.overrides])).toEqual([
      [61, { c: 'v' }],
      [70, { c: 'v' }],
      [82, { s: 't' }],
      [96, { c: 'v' }],
      [100, { c: 'v' }],
    ]);
  });

  it.each(painted)('level %i plays the same painted as unpainted: its overrides change only the colours shown', (_, l) => {
    const shown = paintedPicture(l.rows, l.overrides);
    expect({ ...shown, palette: shown.palette.length }).toEqual({ ...poolPicture(l.rows), palette: poolPicture(l.rows).palette.length });
  });

  it.each(painted)('level %i is painted in its overrides where the game shows it', (_, l) => {
    const shown = paintedPicture(l.rows, l.overrides);
    const letters = [...l.rows.join('')];
    shown.cells.forEach((colour, i) => {
      const letter = letters[i] as string;
      if (colour >= 0) expect(shown.palette[colour], `square ${i} '${letter}'`).toBe(colourByChar(l.overrides?.[letter] ?? letter).hex);
    });
  });

  it.each(each)('level %i is in its band, at its depth, with no more luck than allowed', (_, l) => {
    const rule = ruleFor(l.number);
    expect(casualFit(rule, l.casualWins / CASUAL_GAMES)).toBe('in');
    if (l.misses) {
      // The closest deal: it misses the band on its thinkers, and says so.
      expect(thinkerFit(rule, l.thinkers)).not.toBe(l.depth);
      expect(l.misses).toMatch(/thinker wins|won at depth/);
    } else {
      expect(thinkerFit(rule, l.thinkers)).toBe(l.depth);
      expect(l.depth).toBeGreaterThanOrEqual(rule.depth[0]);
      expect(l.depth).toBeLessThanOrEqual(rule.depth[1]);
      if (l.number > BAKED_WITHOUT_HOLDOUT) expect(l.holdout, 'hold-out measures').toBeDefined();
      if (l.holdout) expect(holdsBand({ ...l, holdout: l.holdout }), 'casual share in the inner range, and the hold-out games in the band').toBe('in');
      if (l.number > BAKED_WITHOUT_GATES) expect(l.gates, 'careless and decided measures').toBeDefined();
      if (l.gates) expect(passesGates(l.band, l.casualWins, l.gates), 'under the careless cap and over the decided floor').toBe('in');
    }
    expect(l.luck).toBeLessThanOrEqual(MAX_LUCK);
    expect(l.luck).toBe(Math.round(Math.max(0, l.fullSight - Math.max(...l.thinkers)) * 100) / 100);
  });

  it('measures the very hard level again to exactly the stored casual share, on the bake games and the hold-out games', () => {
    for (const l of levels.filter((x) => x.band === 'very hard')) {
      const m = measure(poolPicture(l.rows), l.columns, l.structure.buckets, CASUAL_GAMES, 'sensible');
      expect(m.wins, `level ${l.number}`).toBe(l.casualWins);
      if (!l.holdout) continue;
      const h = measure(poolPicture(l.rows), l.columns, l.structure.buckets, CASUAL_GAMES, 'sensible', undefined, HOLDOUT_CASUAL);
      expect(h.wins, `level ${l.number} hold-out`).toBe(l.holdout.casualWins);
    }
  }, 60_000);
});

describe('a level drawn in other letters', () => {
  const level = levels[0] as Level;
  // The letters turned round, and the last of them into a pool letter the level does not use, so colours change
  // their rank in the pool both among themselves and against a letter new to the picture.
  const letters = [...new Set(level.rows.join(''))];
  const unused = POOL.map((c) => c.char).filter((c) => !letters.includes(c));
  const swapped = Object.fromEntries(letters.map((c, i) => [c, letters[letters.length - 1 - i] as string]));
  swapped[letters[letters.length - 1] as string] = unused[unused.length - 1] as string;
  const rows = level.rows.map((r) => [...r].map((c) => swapped[c]).join(''));

  it('is the same pots renumbered, so the same game: the same casual share', () => {
    const moved = relabel(level, rows);
    expect(moved.rows).toEqual(rows);
    expect(moved.columns).not.toEqual(level.columns);
    expect(moved.columns.map((c) => c.map((p) => p.count))).toEqual(level.columns.map((c) => c.map((p) => p.count)));
    const picture = poolPicture(rows);
    expect(measure(picture, moved.columns, moved.structure.buckets, CASUAL_GAMES, 'sensible').wins).toBe(level.casualWins);
    expect(moved.id).toBe(levelId(rows, moved.columns, moved.structure.buckets));
  }, 30_000);

  it('is told from a picture whose squares changed: two letters made one, or a square cleared', () => {
    expect(letterMap(level.rows, rows)).toEqual(swapped);
    const [a, b] = letters as [string, string];
    expect(letterMap(level.rows, level.rows.map((r) => r.replaceAll(a, b)))).toBeNull();
    expect(letterMap(level.rows, [level.rows[0]?.replace(/^./, '.') as string, ...level.rows.slice(1)])).toBeNull();
    expect(() => relabel(level, level.rows.map((r) => r.replaceAll(a, b)))).toThrow();
  });
});

describe('the margin and the hold-out games', () => {
  it('move the bottom of a casual range up by one standard error and the top down by two, and leave an edge at 0', () => {
    expect(margin(0)).toBe(0);
    expect(margin(0.2)).toBeCloseTo(0.0283, 4);
    expect(innerCasual(ruleFor(88))).toEqual([0.06 + margin(0.06), 0.2 - 2 * margin(0.2)]);
    const inner = { ...ruleFor(90), casual: innerCasual(ruleFor(90)) };
    expect(inner.casual).toEqual([0, 0.03 - 2 * margin(0.03)]);
    expect(casualFit(inner, 1 / CASUAL_GAMES)).toBe('in');
    expect(casualFit(inner, 2 / CASUAL_GAMES)).toBe('easier');
  });

  it('hold a level out of its band when the hold-out games say so, though the bake games put it in', () => {
    const l = { number: 90, casualWins: 1, thinkers: [0, 0, 0.85], holdout: { casualWins: 2, thinkers: [0, 0.05, 0.9] } };
    expect(holdsBand(l)).toBe('in');
    expect(holdsBand({ ...l, holdout: { ...l.holdout, casualWins: 6 } })).toBe('easier');
    expect(holdsBand({ ...l, holdout: { ...l.holdout, thinkers: [0, 0, 0.8, 0.8] } })).toBe('harder');
    expect(holdsBand({ ...l, holdout: { ...l.holdout, thinkers: [0, 0.2] } })).toBe('easier');
    expect(holdsBand({ ...l, casualWins: 2 })).toBe('easier');
  });
});

describe('the careless cap and the decided floor', () => {
  const g = { randomWins: 20, stickyWins: 40, decided: 0.7, decidedLine: 0.7 };

  it('fail a level any careless player wins more often than its band allows', () => {
    expect(passesGates('medium', 60, { ...g, stickyWins: 100 })).toBe('in');
    expect(passesGates('medium', 60, { ...g, stickyWins: 101 })).toBe('careless');
    expect(passesGates('medium', 101, g)).toBe('careless');
    expect(passesGates('hard', 30, { ...g, randomWins: 41 })).toBe('careless');
    expect(passesGates('very hard', 2, { ...g, randomWins: 0, stickyWins: 12 })).toBe('in');
    expect(passesGates('very hard', 2, { ...g, randomWins: 0, stickyWins: 13 })).toBe('careless');
    expect(passesGates('easy', 190, { ...g, randomWins: 200, stickyWins: 200 })).toBe('in');
  });

  it('fail a level medium or harder that is decided before the floor, by the sensible wins or the winning order', () => {
    expect(passesGates('hard', 10, { ...g, decided: 0.59 })).toBe('decided');
    expect(passesGates('hard', 10, { ...g, decidedLine: 0.59 })).toBe('decided');
    expect(passesGates('very hard', 0, { ...g, randomWins: 0, stickyWins: 0, decided: null })).toBe('in');
    expect(passesGates('easy', 100, { ...g, decided: 0.3, decidedLine: 0.3 })).toBe('in');
  });

  it('report a casual share the random player beats by more than two standard errors', () => {
    // Level 39: random 55 of 200 against sensible 0; level 3: 65 against 40; level 2: 135 against 126.
    expect(gaugeMisreads(55, 0)).toBe(true);
    expect(gaugeMisreads(65, 40)).toBe(true);
    expect(gaugeMisreads(135, 126)).toBe(false);
  });
});
