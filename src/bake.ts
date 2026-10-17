// Makes one level, offline: converts the source picture, then deals and measures until a deal lands
// in the level's band. Each attempt uses the next seed, and the perturbing strength moves towards the
// band: up when the last deal was too easy, down when it was too hard, in steps that shrink.

import { backgroundColour, convert, fillClear, type Image } from './convert.ts';
import { makePots, measure, perturb, type Knobs } from './generator.ts';
import { BANDS, PLAYOUTS, bandOf, levelId, type Band, type Level, type Source, type Structure } from './levels.ts';
import { POOL } from './palette.ts';
import { poolPicture } from './picture.ts';
import { seededRng } from './rng.ts';

export interface LevelSpec {
  number: number;
  band: Band;
  structure: Structure;
  source: Source;
  /** 'clear' keeps the image's transparent background clear; 'colour' fills it with a pool colour to peel. */
  background: 'clear' | 'colour';
}

/**
 * Where the perturbing strength starts for each band. From 0 to 1 the pots may surface ever earlier
 * than their turn; from 1 to 2 the order is also turned round, until at 2 it is mostly reversed.
 */
const START: Record<Band, number> = { easy: 0, medium: 0.4, hard: 0.9, 'very hard': 1.3 };
const MAX_STRENGTH = 2;

/** The most deals tried for one level before the bake gives up on it. */
export const MAX_ATTEMPTS = 200;

/** The bake gives up early once this many deals in a row were too easy at full strength, or too hard at none. */
const STUCK_AT_LIMIT = 40;

/** The merge chance at strength 1 and above. */
const MAX_MERGE = 0.3;

/** The most the order is turned round, at full strength: 2 reverses it, with the spread's disorder on top. */
const MAX_REVERSE = 2;

const round2 = (x: number) => Math.round(x * 100) / 100;

export function knobsAt(strength: number, pots: number): Knobs {
  const spreadPart = Math.min(1, strength);
  const reversePart = Math.max(0, strength - 1);
  return {
    spread: round2(spreadPart * pots),
    reverse: round2(reversePart * MAX_REVERSE),
    merge: round2(spreadPart * MAX_MERGE),
  };
}

/** The picture of a level, as the converter and the background setting make it. */
export function levelRows(spec: LevelSpec, image: Image): { rows: string[]; background: string } {
  const colours = spec.background === 'colour' ? spec.structure.colours - 1 : spec.structure.colours;
  const rows = convert(image, { size: spec.structure.size, colours });
  if (spec.background === 'clear') return { rows, background: 'clear' };
  const char = backgroundColour(rows);
  return { rows: fillClear(rows, char), background: (POOL.find((c) => c.char === char) as { name: string }).name };
}

/** How many deals at full strength measure how hard a picture can be made. */
const POTENTIAL_SEEDS = 8;

/**
 * How hard a picture can be made: the lowest share of random games won over a few deals at full
 * strength. Lower is harder; the bake gives the hardest pictures of a block to its hardest levels.
 */
export function potential(spec: Pick<LevelSpec, 'structure' | 'background'>, image: Image): number {
  const picture = poolPicture(levelRows({ ...spec, number: 0, band: 'easy', source: {} as Source }, image).rows);
  const st = spec.structure;
  let lowest = 1;
  for (let seed = 1; seed <= POTENTIAL_SEEDS; seed++) {
    const rng = seededRng(seed);
    const pots = makePots(picture, { ...st, seed }, rng).map((m) => m.pot);
    const columns = perturb(pots, st.columns, knobsAt(MAX_STRENGTH, pots.length), rng);
    lowest = Math.min(lowest, measure(picture, columns, st.buckets, PLAYOUTS).wins / PLAYOUTS);
  }
  return lowest;
}

export function bakeLevel(spec: LevelSpec, image: Image, log: (line: string) => void = () => {}): Level {
  const { rows, background } = levelRows(spec, image);
  const picture = poolPicture(rows);
  const { structure: st, band } = spec;
  let strength = START[band];
  let step = 0.25;
  let atLimit = 0;
  for (let seed = 1; seed <= MAX_ATTEMPTS; seed++) {
    const rng = seededRng(seed);
    const pots = makePots(picture, { ...st, seed }, rng).map((m) => m.pot);
    const knobs = knobsAt(strength, pots.length);
    const columns = perturb(pots, st.columns, knobs, rng);
    const m = measure(picture, columns, st.buckets, PLAYOUTS, BANDS[band]);
    const wins =
      m.outside === 'easier' ? `≥ ${m.wins}` : m.outside === 'harder' ? `≤ ${m.wins + PLAYOUTS - m.played}` : `${m.wins}`;
    log(`level ${spec.number} seed ${seed} strength ${strength.toFixed(2)}: ${m.outside ?? 'in band'}, wins ${wins} of ${PLAYOUTS}`);
    if (!m.outside && m.winning && bandOf(m.wins / PLAYOUTS) === band) {
      return {
        number: spec.number,
        band,
        id: levelId(rows, columns, st.buckets),
        source: spec.source,
        rows,
        background,
        structure: st,
        columns,
        seed,
        knobs,
        playouts: PLAYOUTS,
        wins: m.wins,
        winShare: m.wins / PLAYOUTS,
        winningOrder: m.winning,
      };
    }
    const easier = m.outside === 'easier';
    const limit = easier ? MAX_STRENGTH : 0;
    atLimit = strength === limit ? atLimit + 1 : 0;
    if (atLimit >= STUCK_AT_LIMIT)
      throw new Error(
        `level ${spec.number} (${band}, ${spec.source.title}): ${STUCK_AT_LIMIT} deals in a row were too ${easier ? 'easy at full strength' : 'hard with no perturbing'}`,
      );
    strength = Math.min(MAX_STRENGTH, Math.max(0, strength + (easier ? step : -step)));
    step = Math.max(0.04, step * 0.85);
  }
  throw new Error(`level ${spec.number} (${band}, ${spec.source.title}): no deal landed in the band in ${MAX_ATTEMPTS} attempts`);
}
