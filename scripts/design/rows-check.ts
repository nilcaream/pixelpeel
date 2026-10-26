// Holds the pictures to their letters across a change to the drawing code: `dump` writes the rows of every
// picture (SCENES and PORTFOLIO, by title, scene seeds 1–3) to out/rows.json; `check` draws them again and says,
// per picture, whether it is identical, the same squares with letters swapped one for one (a recolour), or
// different. Moving a picture from PORTFOLIO into SCENES, or a helper between files, must leave every one identical.
//
//   npm run design:rows -- dump      before the change
//   npm run design:rows -- check     after it

import { readFileSync, writeFileSync } from 'node:fs';
import { PORTFOLIO } from '../../src/portfolio.ts';
import { SCENES, sceneRows } from '../../src/scenes.ts';
import { outDir } from './common.ts';

const file = `${outDir()}/rows.json`;
const rowsNow = () => Object.fromEntries([...SCENES, ...PORTFOLIO].map((s) => [s.title, [1, 2, 3].map((seed) => sceneRows(s, seed).join('\n'))]));

/** The one-for-one letter swap that turns a into b, or null when there is none. */
function swapOf(a: string, b: string): Map<string, string> | null {
  if (a.length !== b.length) return null;
  const to = new Map<string, string>();
  const from = new Map<string, string>();
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    if ((to.get(x) ?? y) !== y || (from.get(y) ?? x) !== x) return null;
    to.set(x, y);
    from.set(y, x);
  }
  return to;
}

if (process.argv[2] === 'dump') {
  const rows = rowsNow();
  writeFileSync(file, JSON.stringify(rows));
  console.log(`${Object.keys(rows).length} pictures → ${file}`);
} else if (process.argv[2] === 'check') {
  const before = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string[]>;
  const after = rowsNow();
  let same = 0;
  for (const [title, was] of Object.entries(before)) {
    const now = after[title];
    if (!now) {
      console.log(`missing: ${title}`);
      continue;
    }
    if (now.join() === was.join()) {
      same++;
      continue;
    }
    const swap = swapOf(was.join('|'), now.join('|'));
    const moved = swap && [...swap].filter(([x, y]) => x !== y);
    console.log(moved ? `recoloured: ${title} (${moved.map(([x, y]) => `${x}→${y}`).join(', ')})` : `differs: ${title}`);
  }
  const added = Object.keys(after).filter((t) => !(t in before));
  console.log(`${same}/${Object.keys(before).length} identical${added.length ? `; new: ${added.join(', ')}` : ''}`);
} else throw new Error('usage: rows-check.ts dump|check');
