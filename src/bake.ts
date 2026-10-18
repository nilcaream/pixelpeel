// Makes one level, offline, from its scene: deals pots, measures the deal, and keeps the first deal that
// fits the level's band. A deal fits when the solver wins it, the casual share is in the band, a thinker
// on the visible pots wins at the band's depth while shallower thinkers do not, and seeing the hidden
// pots adds no more than MAX_LUCK.
//
// The knobs turn in this order: the perturbing strength first (up when the deal was too easy, down when
// too hard), then fewer buckets (5, 4, 3) once the strength alone could not make it hard enough, then the
// scene's next seed. The cheap measures go first, so most deals are thrown out after a few games.

import { makePots, measure, perturb, type Knobs } from './generator.ts';
import {
  CASUAL_GAMES,
  MAX_LUCK,
  THINKER_GAMES,
  VISIBLE,
  bandFor,
  casualFit,
  levelId,
  ruleFor,
  thinkerFit,
  type BandRule,
  type Level,
  type Structure,
} from './levels.ts';
import { poolPicture, type Picture } from './picture.ts';
import type { Pot } from './rules.ts';
import { SCENES, sceneRows } from './scenes.ts';
import { seededRng } from './rng.ts';
import { solve, thinkerShare } from './thinker.ts';

/** Columns and pot sizes of every scene level; the buckets are a knob. */
const BASE = { columns: 4, potMin: 10, potMax: 40 };
const BUCKETS = [5, 4, 3] as const;
const SCENE_SEEDS = 3;
/** Deals tried per bucket count before fewer buckets are tried. */
const ATTEMPTS = 8;
const START_STRENGTH = 1;
/** The first step of the strength; it halves each time the deals turn from too easy to too hard or back. */
const STRENGTH_STEP = 0.25;
const MIN_STEP = 0.05;
const MAX_STRENGTH = 2;

/** The merge chance at strength 1 and above. */
const MAX_MERGE = 0.3;

/** The most the order is turned round, at full strength: 2 reverses it, with the spread's disorder on top. */
const MAX_REVERSE = 2;

const round2 = (x: number) => Math.round(x * 100) / 100;

/**
 * From 0 to 1 the pots may surface ever earlier than their turn, and pots of a colour may merge; from
 * 1 to 2 the order is also turned round, until at 2 it is mostly reversed.
 */
export function knobsAt(strength: number, pots: number): Knobs {
  const spreadPart = Math.min(1, strength);
  const reversePart = Math.max(0, strength - 1);
  return {
    spread: round2(spreadPart * pots),
    reverse: round2(reversePart * MAX_REVERSE),
    merge: round2(spreadPart * MAX_MERGE),
  };
}

export type Verdict =
  | { fits: false; why: 'easier' | 'harder' | 'luck'; casualWins: number; thinkers: number[] }
  | { fits: true; casualWins: number; thinkers: number[]; depth: number; fullSight: number; luck: number; winningOrder: number[] };

/** Measures one deal for a band's rule, cheapest measure first, and stops at the first that rules it out. */
export function judge(picture: Picture, columns: Pot[][], buckets: number, rule: BandRule): Verdict {
  const casual = measure(picture, columns, buckets, CASUAL_GAMES, 'sensible', rule.casual);
  const casualWins = casual.wins;
  const fit = casual.outside ?? casualFit(rule, casual.wins / CASUAL_GAMES);
  if (fit !== 'in') return { fits: false, why: fit, casualWins, thinkers: [] };
  const thinkers: number[] = [];
  let depth: ReturnType<typeof thinkerFit> = 'harder';
  for (let d = 1; d <= rule.depth[1]; d++) {
    thinkers.push(thinkerShare(picture, columns, buckets, THINKER_GAMES, { sight: VISIBLE, depth: d }));
    depth = thinkerFit(rule, thinkers);
    if (depth !== 'harder') break;
  }
  if (typeof depth !== 'number') return { fits: false, why: depth, casualWins, thinkers };
  const solved = solve(picture, columns, buckets);
  if (solved.result !== 'win') return { fits: false, why: 'harder', casualWins, thinkers };
  const fullSight = thinkerShare(picture, columns, buckets, THINKER_GAMES, { sight: Infinity, depth });
  const luck = round2(Math.max(0, fullSight - Math.max(...thinkers)));
  if (luck > MAX_LUCK) return { fits: false, why: 'luck', casualWins, thinkers };
  return { fits: true, casualWins, thinkers, depth, fullSight, luck, winningOrder: solved.picks };
}

/** The deal of a level, as its picture, structure, seed and strength make it. */
export function dealFor(picture: Picture, structure: Structure, seed: number, strength: number): { columns: Pot[][]; knobs: Knobs } {
  const rng = seededRng(seed);
  const pots = makePots(picture, { ...structure, seed }, rng);
  const knobs = knobsAt(strength, pots.length);
  return { columns: perturb(pots, structure.columns, knobs, rng), knobs };
}

/** The grid tried when the search finds nothing: strengths from GRID_STRENGTHS[0] up by GRID_STEP, GRID_DEALS deals each. */
const GRID_STRENGTHS = [0.5, 2] as const;
const GRID_STEP = 0.25;
const GRID_DEALS = 4;

export function bakeLevel(number: number, log: (line: string) => void = () => {}): Level {
  const scene = SCENES[number - 1];
  if (!scene) throw new Error(`level ${number} has no scene`);
  const band = bandFor(number);
  const rule = ruleFor(number);
  /** Deals and judges one deal; the level when it fits. */
  const tryDeal = (sceneSeed: number, buckets: number, seed: number, strength: number) => {
    const rows = sceneRows(scene, sceneSeed);
    const picture = poolPicture(rows);
    const structure: Structure = { ...BASE, buckets };
    const { columns, knobs } = dealFor(picture, structure, seed, strength);
    const v = judge(picture, columns, buckets, rule);
    log(
      `level ${number} scene seed ${sceneSeed} buckets ${buckets} strength ${strength}: ` +
        `${v.fits ? 'fits' : v.why}, casual ${v.casualWins}/${CASUAL_GAMES}, thinkers ${v.thinkers.join(' ')}`,
    );
    const level: Level | null = v.fits
      ? {
          number,
          band,
          id: levelId(rows, columns, buckets),
          title: scene.title,
          sceneSeed,
          rows,
          structure,
          columns,
          seed,
          strength,
          knobs,
          casualWins: v.casualWins,
          thinkers: v.thinkers,
          depth: v.depth,
          fullSight: v.fullSight,
          luck: v.luck,
          winningOrder: v.winningOrder,
        }
      : null;
    return { v, level };
  };
  for (let sceneSeed = 1; sceneSeed <= SCENE_SEEDS; sceneSeed++) {
    for (const buckets of BUCKETS) {
      let strength = START_STRENGTH;
      let step = STRENGTH_STEP;
      let last: 'easier' | 'harder' | 'luck' = 'easier';
      for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
        const { v, level } = tryDeal(sceneSeed, buckets, sceneSeed * 1000 + buckets * 100 + attempt, strength);
        if (level) return level;
        if (v.fits) continue;
        if (v.why !== 'luck' && last !== 'luck' && v.why !== last && attempt > 1) step = Math.max(MIN_STEP, step / 2);
        last = v.why;
        if (v.why === 'easier') strength = round2(Math.min(MAX_STRENGTH, strength + step));
        if (v.why === 'harder') strength = round2(Math.max(0, strength - step));
      }
      // Fewer buckets mostly make a deal harder: the search moves on when this many were already too hard.
      if (last === 'harder') break;
    }
  }
  // The search follows one path and can step past a narrow band, where the verdict jumps between deals of
  // nearly the same strength. The grid walks every bucket count and strength, a few deals each.
  for (let sceneSeed = 1; sceneSeed <= SCENE_SEEDS; sceneSeed++)
    for (const buckets of BUCKETS)
      for (let strength: number = GRID_STRENGTHS[0]; strength <= GRID_STRENGTHS[1]; strength = round2(strength + GRID_STEP))
        for (let deal = 1; deal <= GRID_DEALS; deal++) {
          const seed = sceneSeed * 1000 + buckets * 100 + 10 * Math.round(strength / GRID_STEP) + deal;
          const { level } = tryDeal(sceneSeed, buckets, seed, strength);
          if (level) return level;
        }
  throw new Error(`level ${number} (${band}, ${scene.title}): no deal fitted the band`);
}
