// Whether a measured deal fits a band's rule as the bake judges it, plus what a level's game asks beyond the
// bake: no trivial first phase on medium and harder levels. Shared by reach.ts and order.ts.

import { MAX_LUCK, THINKER_WINS, thinkerFit, type Band, type BandRule } from '../../src/levels.ts';
import type { Deal } from './common.ts';

/** The most of the picture a medium or harder level may let go before the first choice that matters. */
export const FREE_START = 0.15;

export const BANDS: readonly Band[] = ['easy', 'medium', 'hard', 'very hard'];
export const SHORT: Record<Band, string> = { easy: 'E', medium: 'M', hard: 'H', 'very hard': 'VH' };

/** Whether the deal fits the band's rule: casual range, thinkers by depth with the shallow caps, solver, luck, freeStart. */
export function fits(rule: BandRule, band: Band, d: Deal): boolean {
  if (d.casual < rule.casual[0] || d.casual >= rule.casual[1]) return false;
  if (d.solved !== 'win' || (d.luck ?? 1) > MAX_LUCK) return false;
  if (band !== 'easy' && d.freeStart > FREE_START) return false;
  const depth = thinkerFit(rule, d.thinkers);
  return typeof depth === 'number' && depth <= rule.depth[1];
}

/** Best deal of a band first: lowest freeStart, then casual nearest the band's middle, then lowest freeRun. */
export function better(rule: BandRule): (p: Deal, q: Deal) => number {
  const mid = (rule.casual[0] + rule.casual[1]) / 2;
  return (p, q) => p.freeStart - q.freeStart || Math.abs(p.casual - mid) - Math.abs(q.casual - mid) || p.freeRun - q.freeRun;
}

/**
 * How far a deal misses a band: each bound's miss (casual, the shallow thinkers over their caps, the deep thinkers'
 * best under the share to win, luck and freeStart over theirs), summed; 0 when only the depth floor is missed.
 */
export function missOf(rule: BandRule, d: Deal): { miss: number; why: string[] } {
  // The thinkers stop at the first that wins, so a shallow winner stands for the deep ones too.
  const deep = Math.max(0, ...d.thinkers);
  const parts: [string, number][] = [
    ['casual', d.casual < rule.casual[0] ? rule.casual[0] - d.casual : d.casual - rule.casual[1] + (d.casual >= rule.casual[1] ? 0.01 : 0)],
    ...rule.shallow.map((cap, i): [string, number] => [`L${i + 1}`, (d.thinkers[i] ?? 0) - cap]),
    ['deep', (rule.wins ?? THINKER_WINS) - deep],
    ['luck', (d.luck ?? 0) - MAX_LUCK],
    ['freeStart', d.freeStart - FREE_START],
  ];
  const over = parts.filter(([, v]) => v > 0);
  const r2 = (x: number) => Math.round(x * 100) / 100;
  return { miss: r2(over.reduce((s, [, v]) => s + v, 0)), why: over.map(([k, v]) => `${k} +${r2(v)}`) };
}

export const describe = (d: Deal): string =>
  `b${d.buckets} s${d.strength} seed ${d.seed}: casual ${d.casual}, thinkers ${d.thinkers.join(' ')}, freeStart ${d.freeStart}, luck ${d.luck}`;
