// Makes one level, offline, from its scene: deals pots, measures the deal, and keeps the first deal that
// fits the level's band. A deal fits when the solver wins it, the casual share is inside the band by its
// margin, a thinker on the visible pots wins at the band's depth while shallower thinkers do not, seeing the
// hidden pots adds no more than MAX_LUCK, the hold-out games, which played no part in choosing it, keep
// it in the band, no careless player (random, sensible, sticky) wins more than the band's cap, and, medium and
// harder, no line can lose only from DECIDED_FLOOR of the picture peeled on. A deal that fails one of the last
// two plays easier than its band. Once baked, the stored deal is the level: nothing deals it again.
//
// The knobs turn in this order: the perturbing strength first (up when the deal was too easy, down when
// too hard), then fewer buckets (5, 4, 3) once the strength alone could not make it hard enough, then the
// scene's next seed. The cheap measures go first, so most deals are thrown out after a few games.

import { makePots, measure, perturb, type Knobs } from './generator.ts';
import {
  CARELESS_CAP,
  CASUAL_GAMES,
  HOLDOUT_CASUAL,
  HOLDOUT_THINKER,
  MAX_LUCK,
  THINKER_GAMES,
  THINKER_WINS,
  VISIBLE,
  bandFor,
  casualFit,
  holdsBand,
  innerCasual,
  levelId,
  ruleFor,
  thinkerFit,
  type BandRule,
  type Holdout,
  type Level,
  type Structure,
  RANDOM_FIRST,
  gaugeMisreads,
  passesGates,
  type Band,
  type Gates,
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
  | { fits: false; why: 'easier' | 'harder' | 'luck'; casualWins: number; thinkers: number[]; holdout?: Holdout; gate?: 'careless' | 'decided' }
  | { fits: true; casualWins: number; thinkers: number[]; depth: number; fullSight: number; luck: number; holdout: Holdout; gates?: Gates; winningOrder: number[] };

/**
 * The decided points of a deal: the median, over the sensible player's won games among games 1 to CASUAL_GAMES, of
 * the share peeled where no line can lose any more, and the same on the winning order; null when it won none. It
 * needs the exact solver of the design tools, so the bake is handed it rather than importing it.
 */
export type DecidedOf = (picture: Picture, columns: Pot[][], buckets: number, winningOrder: number[]) => { decided: number | null; line: number };

/**
 * The careless players' wins, cheapest first, stopping as soon as one is over the band's cap: the random player on
 * its own games from RANDOM_FIRST, then the sticky player on the casual games.
 */
function carelessOf(picture: Picture, columns: Pot[][], buckets: number, band: Band, casualWins: number): { randomWins: number; stickyWins: number; over: boolean } {
  const cap = CARELESS_CAP[band];
  if (cap === undefined) {
    const randomWins = measure(picture, columns, buckets, CASUAL_GAMES, 'random', undefined, RANDOM_FIRST).wins;
    return { randomWins, stickyWins: measure(picture, columns, buckets, CASUAL_GAMES, 'sticky').wins, over: false };
  }
  // Over the cap is over (cap × games) wins: a share at or above the next win stops the measure.
  const stop = [0, (Math.floor(cap * CASUAL_GAMES + 1e-9) + 1) / CASUAL_GAMES] as const;
  const random = measure(picture, columns, buckets, CASUAL_GAMES, 'random', stop, RANDOM_FIRST);
  if (random.outside === 'easier') return { randomWins: random.wins, stickyWins: 0, over: true };
  const sticky = measure(picture, columns, buckets, CASUAL_GAMES, 'sticky', stop);
  return { randomWins: random.wins, stickyWins: sticky.wins, over: sticky.outside === 'easier' || casualWins / CASUAL_GAMES > cap };
}

/** The thinkers of depth 1, 2, … on the visible pots, from game `first`, until one says the deal is not too hard. */
function thinkersFor(picture: Picture, columns: Pot[][], buckets: number, rule: BandRule, first: number) {
  const thinkers: number[] = [];
  let depth: ReturnType<typeof thinkerFit> = 'harder';
  for (let d = 1; d <= rule.depth[1]; d++) {
    thinkers.push(thinkerShare(picture, columns, buckets, THINKER_GAMES, { sight: VISIBLE, depth: d }, first));
    depth = thinkerFit(rule, thinkers);
    if (depth !== 'harder') break;
  }
  return { thinkers, depth };
}

/**
 * The hold-out measures of a deal, and whether they keep it in the band: the casual share of the hold-out games
 * in the band, and the hold-out thinkers at a depth the band allows.
 */
export function holdoutOf(picture: Picture, columns: Pot[][], buckets: number, rule: BandRule, full = false): { holdout: Holdout; fit: 'in' | 'easier' | 'harder' } {
  const casual = measure(picture, columns, buckets, CASUAL_GAMES, 'sensible', full ? undefined : rule.casual, HOLDOUT_CASUAL);
  const fit = casual.outside ?? casualFit(rule, casual.wins / CASUAL_GAMES);
  if (fit !== 'in') return { holdout: { casualWins: casual.wins, thinkers: [] }, fit };
  const { thinkers, depth } = thinkersFor(picture, columns, buckets, rule, HOLDOUT_THINKER);
  return { holdout: { casualWins: casual.wins, thinkers }, fit: typeof depth === 'number' ? 'in' : depth };
}

/**
 * Measures one deal for a band's rule, cheapest measure first, and stops at the first that rules it out. The
 * casual share must be inside the band by its margin, no careless player may win more than the band's cap, the
 * hold-out games must keep the deal in the band, and, last and dearest, the decided points must reach the floor.
 * A deal ruled out on a gate plays easier than its band.
 */
export function judge(picture: Picture, columns: Pot[][], buckets: number, rule: BandRule, band: Band, decidedOf: DecidedOf): Verdict {
  const inner = { ...rule, casual: innerCasual(rule) };
  const casual = measure(picture, columns, buckets, CASUAL_GAMES, 'sensible', inner.casual);
  const casualWins = casual.wins;
  const fit = casual.outside ?? casualFit(inner, casual.wins / CASUAL_GAMES);
  if (fit !== 'in') return { fits: false, why: fit, casualWins, thinkers: [] };
  const careless = carelessOf(picture, columns, buckets, band, casualWins);
  if (careless.over) return { fits: false, why: 'easier', gate: 'careless', casualWins, thinkers: [] };
  const { thinkers, depth } = thinkersFor(picture, columns, buckets, rule, 1);
  if (typeof depth !== 'number') return { fits: false, why: depth, casualWins, thinkers };
  const solved = solve(picture, columns, buckets);
  if (solved.result !== 'win') return { fits: false, why: 'harder', casualWins, thinkers };
  const fullSight = thinkerShare(picture, columns, buckets, THINKER_GAMES, { sight: Infinity, depth });
  const luck = round2(Math.max(0, fullSight - Math.max(...thinkers)));
  if (luck > MAX_LUCK) return { fits: false, why: 'luck', casualWins, thinkers };
  const { holdout, fit: held } = holdoutOf(picture, columns, buckets, rule);
  if (held !== 'in') return { fits: false, why: held, casualWins, thinkers, holdout };
  const { decided, line } = band === 'easy' ? { decided: null, line: null } : decidedOf(picture, columns, buckets, solved.picks);
  const gates: Gates = { randomWins: careless.randomWins, stickyWins: careless.stickyWins, decided, decidedLine: line };
  if (passesGates(band, casualWins, gates) !== 'in') return { fits: false, why: 'easier', gate: 'decided', casualWins, thinkers, holdout };
  return { fits: true, casualWins, thinkers, depth, fullSight, luck, holdout, gates, winningOrder: solved.picks };
}

/**
 * How far a deal that was ruled out on its thinkers misses the band: the most a shallow thinker is over its
 * cap, or how far the deepest allowed thinker falls short of winning. Null for a deal ruled out on the casual
 * share alone (its casual measure stopped early, so it cannot be ranked), for one ruled out on luck (a level
 * never has more luck than MAX_LUCK, closest or not), or for a deal that fits.
 */
export function missBy(rule: BandRule, v: Verdict): { by: number; what: string } | null {
  if (v.fits || v.why === 'luck' || v.holdout || v.thinkers.length === 0) return null;
  const wins = rule.wins ?? THINKER_WINS;
  let worst: { by: number; what: string } | null = null;
  v.thinkers.forEach((share, i) => {
    const cap = rule.shallow[i];
    if (cap !== undefined && share > cap && (!worst || share - cap > worst.by)) worst = { by: round2(share - cap), what: `depth-${i + 1} thinker wins ${share}, over ${cap}` };
    if (cap === undefined && i + 1 < rule.depth[0] && share >= wins) worst = { by: round2(rule.depth[0] - i - 1), what: `won at depth ${i + 1}, below ${rule.depth[0]}` };
  });
  if (worst) return worst;
  const deepest = v.thinkers[v.thinkers.length - 1] as number;
  return { by: round2(wins - deepest), what: `depth-${v.thinkers.length} thinker wins ${deepest}, under ${wins}` };
}

/** The full measure of a deal taken as the closest to its band: thinkers up to the band's depth, the solver, luck. */
function judgeClosest(picture: Picture, columns: Pot[][], buckets: number, rule: BandRule, casualWins: number): Verdict & { fits: true } {
  const thinkers: number[] = [];
  let depth = rule.depth[1];
  for (let d = 1; d <= rule.depth[1]; d++) {
    thinkers.push(thinkerShare(picture, columns, buckets, THINKER_GAMES, { sight: VISIBLE, depth: d }));
    if ((thinkers[d - 1] as number) >= (rule.wins ?? THINKER_WINS)) {
      depth = d;
      break;
    }
  }
  const solved = solve(picture, columns, buckets);
  if (solved.result !== 'win') throw new Error('the closest deal cannot be won');
  const fullSight = thinkerShare(picture, columns, buckets, THINKER_GAMES, { sight: Infinity, depth });
  const luck = round2(Math.max(0, fullSight - Math.max(...thinkers)));
  const { holdout } = holdoutOf(picture, columns, buckets, rule);
  return { fits: true, casualWins, thinkers, depth, fullSight, luck, holdout, winningOrder: solved.picks };
}

/**
 * A stored level judged again on its own deal under its band's rule, for when a rule changes: its hold-out
 * measures in full, and whether it holds its band (`holdsBand`).
 */
export function rejudge(level: Level, decidedOf: DecidedOf): { holdout: Holdout; fit: 'in' | 'easier' | 'harder'; gates: Gates; gatesFit: 'in' | 'careless' | 'decided' } {
  const picture = poolPicture(level.rows);
  const { buckets } = level.structure;
  const { holdout } = holdoutOf(picture, level.columns, buckets, ruleFor(level.number), true);
  const randomWins = measure(picture, level.columns, buckets, CASUAL_GAMES, 'random', undefined, RANDOM_FIRST).wins;
  const stickyWins = measure(picture, level.columns, buckets, CASUAL_GAMES, 'sticky').wins;
  const { decided, line } = level.band === 'easy' ? { decided: null, line: null } : decidedOf(picture, level.columns, buckets, level.winningOrder);
  const gates: Gates = { randomWins, stickyWins, decided, decidedLine: line };
  return { holdout, fit: holdsBand({ ...level, holdout }), gates, gatesFit: passesGates(level.band, level.casualWins, gates) };
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

export function bakeLevel(number: number, decidedOf: DecidedOf, log: (line: string) => void = () => {}): Level {
  const scene = SCENES[number - 1];
  if (!scene) throw new Error(`level ${number} has no scene`);
  const band = bandFor(number);
  const rule = ruleFor(number);
  /** The deal nearest the band so far, among those ruled out on their thinkers, for when nothing fits. */
  const best: { closest: { by: number; what: string; sceneSeed: number; buckets: number; seed: number; strength: number } | null } = { closest: null };
  /** Deals and judges one deal; the level when it fits. */
  const tryDeal = (sceneSeed: number, buckets: number, seed: number, strength: number, verdict?: Verdict & { fits: true }) => {
    const rows = sceneRows(scene, sceneSeed);
    const picture = poolPicture(rows);
    const structure: Structure = { ...BASE, buckets };
    const { columns, knobs } = dealFor(picture, structure, seed, strength);
    const v = verdict ?? judge(picture, columns, buckets, rule, band, decidedOf);
    log(
      `level ${number} scene seed ${sceneSeed} buckets ${buckets} strength ${strength}: ` +
        `${v.fits ? 'fits' : v.gate ? `${v.why} (${v.gate})` : v.why}, casual ${v.casualWins}/${CASUAL_GAMES}, thinkers ${v.thinkers.join(' ')}` +
        (v.fits && v.gates ? `, random ${v.gates.randomWins}, sticky ${v.gates.stickyWins}${gaugeMisreads(v.gates.randomWins, v.casualWins) ? ' (the random player beats the casual share)' : ''}` : ''),
    );
    const miss = missBy(rule, v);
    if (miss && (!best.closest || miss.by < best.closest.by)) best.closest = { ...miss, sceneSeed, buckets, seed, strength };
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
          holdout: v.holdout,
          ...(v.gates && { gates: v.gates }),
          winningOrder: v.winningOrder,
          ...(scene.overrides && { overrides: scene.overrides }),
        }
      : null;
    return { v, level, picture, columns };
  };
  if (scene.deal) {
    const { level } = tryDeal(scene.deal.sceneSeed, scene.deal.buckets, scene.deal.seed, scene.deal.strength);
    if (level) return level;
  }
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
  // Nothing fitted: the level takes the closest deal, measured in full, and says what it misses. A level
  // whose every deal was ruled out on the casual share alone has no closest deal: its picture must change.
  const c = best.closest;
  if (!c) throw new Error(`level ${number} (${band}, ${scene.title}): no deal fitted the band`);
  const first = tryDeal(c.sceneSeed, c.buckets, c.seed, c.strength);
  const full = judgeClosest(first.picture, first.columns, c.buckets, rule, first.v.casualWins);
  const { level } = tryDeal(c.sceneSeed, c.buckets, c.seed, c.strength, full);
  log(`level ${number} takes its closest deal: ${c.what}`);
  return { ...(level as Level), misses: c.what };
}
