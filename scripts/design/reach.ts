// Which bands each picture reaches in deal files, the best deal per band, and the deal nearest the hardest band
// it misses. Deals of a mirrored scene are listed as `Nm` (N = the level mirrored).
//
//   npm run design:reach -- out/deals/deals.jsonl …     several files are read as one
//   BLOCK=6 npm run design:reach -- …                     the rules of that block (default: the last of BLOCKS)

import { BLOCKS, type Band } from '../../src/levels.ts';
import { BANDS, SHORT, better, describe, fits, missOf } from './bands.ts';
import { keyOf, pictureAt, readDeals, type Deal } from './common.ts';

const files = process.argv.slice(2);
if (!files.length) throw new Error('usage: reach.ts file.jsonl …');
const block = Number(process.env.BLOCK ?? BLOCKS.length);
const rules = BLOCKS[block - 1];
if (!rules) throw new Error(`no block ${block}: there are ${BLOCKS.length}`);

const groups = new Map<string, Deal[]>();
for (const d of readDeals(files)) groups.set(keyOf(d), [...(groups.get(keyOf(d)) ?? []), d]);
const keys = [...groups.keys()].sort((a, b) => parseInt(a) - parseInt(b) || a.length - b.length);
const count = Object.fromEntries(BANDS.map((b) => [b, 0])) as Record<Band, number>;
console.log(`block ${block}`);
for (const k of keys) {
  const deals = groups.get(k)!;
  const title = k.endsWith('m') ? `${pictureAt(parseInt(k)).title} mirrored` : pictureAt(parseInt(k)).title;
  const reach = BANDS.filter((b) => deals.some((d) => fits(rules[b], b, d)));
  if (!k.endsWith('m')) for (const b of reach) count[b]++;
  const casuals = deals.map((d) => d.casual);
  console.log(`${k} ${title}: ${reach.map((b) => SHORT[b]).join(' ') || 'none'}  (${deals.length} deals, casual ${Math.min(...casuals)}–${Math.max(...casuals)})`);
  for (const b of reach) {
    const ok = deals.filter((d) => fits(rules[b], b, d)).sort(better(rules[b]));
    console.log(`   ${SHORT[b].padEnd(2)} ${describe(ok[0]!)} (${ok.length} deals)`);
  }
  const hardest = BANDS.at(-1)!;
  if (!reach.includes(hardest)) {
    const near = deals
      .filter((d) => d.solved === 'win' && d.thinkers.length)
      .map((d) => ({ d, ...missOf(rules[hardest], d) }))
      .sort((p, q) => p.miss - q.miss)[0];
    if (near) console.log(`   ${SHORT[hardest]} nearest, miss ${near.miss} (${near.why.join(', ')}): ${describe(near.d)}`);
  }
}
console.log(`pictures per band: ${BANDS.map((b) => `${SHORT[b]} ${count[b]}`).join(', ')}`);
