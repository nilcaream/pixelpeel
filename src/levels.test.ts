import { describe, expect, it } from 'vitest';
import { dealFor, missBy } from './bake.ts';
import { measure, replay } from './generator.ts';
import levelsFile from './levels.json';
import { BLOCKS, CASUAL_GAMES, MAX_LUCK, bandFor, casualFit, levelId, ruleFor, thinkerFit, type BandRule, type Level } from './levels.ts';
import { checkOverrides, colourByChar } from './palette.ts';
import { paintedPicture, poolPicture } from './picture.ts';
import { status } from './rules.ts';
import { SCENES, sceneRows } from './scenes.ts';

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

  it.each(each)('level %i is its scene, dealt as its seed and strength make it', (_, l) => {
    expect(l.rows).toEqual(sceneRows(SCENES[l.number - 1] as (typeof SCENES)[number], l.sceneSeed));
    expect(l.overrides).toEqual(SCENES[l.number - 1]?.overrides);
    checkOverrides(l.rows, l.overrides);
    const deal = dealFor(poolPicture(l.rows), l.structure, l.seed, l.strength);
    expect(deal.columns).toEqual(l.columns);
    expect(deal.knobs).toEqual(l.knobs);
    expect(l.id).toBe(levelId(l.rows, l.columns, l.structure.buckets));
  });

  it.each(each)('level %i is dealt as its scene names, when it names a deal', (_, l) => {
    const named = SCENES[l.number - 1]?.deal;
    if (named) expect({ sceneSeed: l.sceneSeed, buckets: l.structure.buckets, seed: l.seed, strength: l.strength }).toEqual(named);
  });

  it.each(each)('level %i can be won: its winning order replays to a win', (_, l) => {
    expect(status(replay(poolPicture(l.rows), l.columns, l.structure.buckets, l.winningOrder))).toBe('won');
  });

  const painted = each.filter(([, l]) => l.overrides);
  it('paints levels 61 and 70 navy for charcoal and level 82 teal for sky', () => {
    expect(painted.map(([n, l]) => [n, l.overrides])).toEqual([
      [61, { c: 'v' }],
      [70, { c: 'v' }],
      [82, { s: 't' }],
    ]);
  });

  it.each(painted)('level %i plays the same painted as unpainted: its overrides change only the colours shown', (_, l) => {
    const shown = paintedPicture(l.rows, l.overrides);
    expect({ ...shown, palette: shown.palette.length }).toEqual({ ...poolPicture(l.rows), palette: poolPicture(l.rows).palette.length });
    expect(status(replay(shown, l.columns, l.structure.buckets, l.winningOrder))).toBe('won');
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
    }
    expect(l.luck).toBeLessThanOrEqual(MAX_LUCK);
    expect(l.luck).toBe(Math.round(Math.max(0, l.fullSight - Math.max(...l.thinkers)) * 100) / 100);
  });

  it('measures the very hard level again to exactly the stored casual share', () => {
    for (const l of levels.filter((x) => x.band === 'very hard')) {
      const m = measure(poolPicture(l.rows), l.columns, l.structure.buckets, CASUAL_GAMES, 'sensible');
      expect(m.wins, `level ${l.number}`).toBe(l.casualWins);
    }
  }, 30_000);
});
