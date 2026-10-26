// An order for a run of levels: each level a picture and a deal that fits the level's band, from deal files.
// The rules are ruleFor(level) of src/levels.ts, so a proposal for new blocks is tried by adding them to BLOCKS.
//
//   npm run design:order -- 60 90 out/deals/a.jsonl out/deals/b.jsonl …
//
// Constraints: each picture once; pictures of one APART group never next to each other; a remix at least 10
// levels from the picture it was drawn from, and a mirrored level's picture at least 10 levels from that level
// and from any remix of it; mirrors only where nothing else fills a level. A depth-first search fills the most
// levels from the first with the fewest mirrors, then swaps spread the mirrors: none on a very hard level, and
// none fewer than 4 levels apart. Writes out/order.json, which `npm run design:gallery` draws.

import { writeFileSync } from 'node:fs';
import { BLOCKS, bandFor, ruleFor } from '../../src/levels.ts';
import { SCENES } from '../../src/scenes.ts';
import { SHORT, better, fits } from './bands.ts';
import { keyOf, numberOf, outDir, pictureAt, readDeals, type Deal } from './common.ts';
import { APART, REMIX } from './pictures.ts';

const [from, to, ...files] = process.argv.slice(2);
if (!from || !to || !files.length) throw new Error('usage: order.ts <first level> <last level> file.jsonl …');
const LEVELS = Array.from({ length: Number(to) - Number(from) + 1 }, (_, i) => Number(from) + i);
const deals = readDeals(files);

const isMirror = (k?: string) => Boolean(k?.endsWith('m'));
const titleOf = (k: string) => pictureAt(parseInt(k)).title;
// A level's picture is played already: only pictures that are not levels yet, and mirrors, are candidates.
const keys = [...new Set(deals.map(keyOf))].filter((k) => isMirror(k) || parseInt(k) > SCENES.length);
/** The block whose rules a level takes: its own, or the last of BLOCKS past it (as ruleFor). */
const block = (level: number) => Math.min(Math.floor((level - 1) / 10), BLOCKS.length - 1) + 1;

/** The best deal of each picture for each level it fits. */
const best = new Map<string, Map<number, Deal & { count: number }>>();
for (const k of keys) {
  const mine = deals.filter((d) => keyOf(d) === k);
  const fitting = new Map<number, Deal & { count: number }>();
  for (const level of LEVELS) {
    const rule = ruleFor(level);
    const ok = mine.filter((d) => fits(rule, bandFor(level), d)).sort(better(rule));
    if (ok.length) fitting.set(level, { ...ok[0]!, count: ok.length });
  }
  best.set(k, fitting);
}

/** The level a picture comes from: the level mirrored, or the shipped picture a remix was drawn from. */
const family = (k: string): number | undefined => (isMirror(k) ? parseInt(k) : REMIX[titleOf(k)] ? numberOf(REMIX[titleOf(k)]!) : undefined);
const apart = (a: string, b?: string) => b !== undefined && APART.some((g) => g.includes(titleOf(a)) && g.includes(titleOf(b)) && a !== b);

/** Whether picture k may take the level, next to the other levels of `at`. */
function allowed(k: string, level: number, at: Record<number, string>): boolean {
  if (!best.get(k)!.has(level)) return false;
  if (Object.entries(at).some(([l, other]) => other === k && Number(l) !== level)) return false;
  if (apart(k, at[level - 1]) || apart(k, at[level + 1])) return false;
  const f = family(k);
  if (f === undefined) return true;
  if (Math.abs(level - f) < 10) return false;
  return Object.entries(at).every(([l, other]) => Number(l) === level || family(other) !== f || Math.abs(level - Number(l)) >= 10);
}

let bestRun = 0;
let bestAt: Record<number, string> = {};
let bestMirrors = Infinity;
let steps = 0;
const at: Record<number, string> = {};
function search(i: number, mirrors: number) {
  if (++steps > 2e6) return;
  if (i > bestRun || (i === bestRun && mirrors < bestMirrors)) {
    bestRun = i;
    bestMirrors = mirrors;
    bestAt = { ...at };
  }
  if (i === LEVELS.length) return;
  const level = LEVELS[i]!;
  // New pictures before mirrors; of those, the one that fits the fewest levels first.
  const cands = keys
    .filter((k) => allowed(k, level, at))
    .sort((p, q) => Number(isMirror(p)) - Number(isMirror(q)) || best.get(p)!.size - best.get(q)!.size);
  for (const k of cands) {
    if (isMirror(k) && mirrors + 1 >= bestMirrors && bestRun === LEVELS.length) continue;
    at[level] = k;
    search(i + 1, mirrors + Number(isMirror(k)));
    delete at[level];
  }
}
search(0, 0);

/** A mirror on a very hard level costs 5, two mirrors fewer than 4 levels apart 1. */
function penalty(a: Record<number, string>): number {
  const ms = LEVELS.filter((l) => isMirror(a[l]));
  let p = ms.filter((l) => bandFor(l) === 'very hard').length * 5;
  for (let i = 1; i < ms.length; i++) if (ms[i]! - ms[i - 1]! < 4) p++;
  return p;
}
const valid = (a: Record<number, string>) => LEVELS.every((level) => allowed(a[level]!, level, a));
if (bestRun === LEVELS.length) {
  for (let improved = true; improved; ) {
    improved = false;
    const spare = keys.filter((k) => !Object.values(bestAt).includes(k));
    for (const a of LEVELS) {
      for (const b of [...LEVELS, ...spare]) {
        const next = { ...bestAt };
        if (typeof b === 'number') {
          if (b <= a) continue;
          [next[a], next[b]] = [bestAt[b]!, bestAt[a]!];
        } else next[a] = b;
        if (Object.values(next).filter((k) => isMirror(k)).length > bestMirrors) continue;
        if (penalty(next) < penalty(bestAt) && valid(next)) {
          bestAt = next;
          improved = true;
        }
      }
    }
  }
  console.log(`spread penalty after swaps: ${penalty(bestAt)}`);
}

console.log(`run: ${bestRun} levels (${from}–${Number(from) + bestRun - 1}), mirrors ${bestMirrors}, search steps ${steps}`);
const order = LEVELS.slice(0, bestRun).map((level) => {
  const k = bestAt[level]!;
  const d = best.get(k)!.get(level)!;
  const title = isMirror(k) ? `${titleOf(k)}, mirrored (level ${parseInt(k)})` : `${k} ${titleOf(k)}`;
  console.log(
    `${level} ${SHORT[bandFor(level)].padEnd(2)} block ${block(level)}  ${title}  b${d.buckets} s${d.strength} seed ${d.seed} (scene seed ${d.sceneSeed}): casual ${d.casual}, thinkers ${d.thinkers.join(' ')}, freeStart ${d.freeStart}, luck ${d.luck}, ${d.count} deals fit`,
  );
  return { level, band: bandFor(level), picture: parseInt(k), mirror: isMirror(k), title: titleOf(k), deal: { sceneSeed: d.sceneSeed, buckets: d.buckets, seed: d.seed, strength: d.strength } };
});
const left = keys.filter((k) => !Object.values(bestAt).includes(k));
console.log(`not used: ${left.map((k) => `${k} ${titleOf(k)} (fits ${[...best.get(k)!.keys()].join(' ') || 'no level'})`).join('; ')}`);
const file = `${outDir()}/order.json`;
writeFileSync(file, JSON.stringify(order, null, 1) + '\n');
console.log(`→ ${file}`);
