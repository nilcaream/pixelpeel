// Pictures as PNGs with their measures (measure.ts): a line per picture, one PNG each at 14 px a square, and a
// sheet out/preview/all.png with each remix framed beside the picture it was drawn from. Targets for a new
// picture: blind ≤ 0.30, filler ≤ 0.50, subject ≥ 0.35 (a mark after the number when one is missed).
//
//   npm run design:preview                       the portfolio
//   npm run design:preview -- 41-59 seed=2       pictures by number (as levels; see common.ts), drawn with seed 2
//   npm run design:preview -- dump=61            the letters of one picture, and each square's round
//   BATCH=path/to/batch.ts START=63 npm run design:preview
//       pictures not yet in PORTFOLIO, numbered from START: a module that exports BATCH (scenes) and may
//       export SUBJECT and REMIX as pictures.ts does, so several drawers can work apart and merge later.

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CLEAR, PAGE, POOL } from '../../src/palette.ts';
import { PORTFOLIO } from '../../src/portfolio.ts';
import { SCENES, sceneRows, type Scene } from '../../src/scenes.ts';
import { FIRST_PORTFOLIO, OUT_DIR, pictureAt, png, rgbOf } from './common.ts';
import { measure, rounds } from './measure.ts';
import { REMIX, SUBJECT } from './pictures.ts';

const args = process.argv.slice(2);
const option = (name: string) => args.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
const seed = Number(option('seed') ?? 1);

const batchFile = process.env.BATCH;
const batch = batchFile
  ? ((await import(resolve(batchFile))) as { BATCH: Scene[]; SUBJECT?: typeof SUBJECT; REMIX?: typeof REMIX })
  : null;
if (batch) {
  Object.assign(SUBJECT, batch.SUBJECT ?? {});
  Object.assign(REMIX, batch.REMIX ?? {});
}

/** The numbers asked for: `a-b`, `a,b,c`, or every portfolio picture. */
function numbers(spec: string | undefined): number[] {
  if (!spec) return PORTFOLIO.map((_, i) => FIRST_PORTFOLIO + i);
  return spec.split(',').flatMap((part) => {
    const [a, b] = part.split('-').map(Number);
    return b === undefined ? [a!] : Array.from({ length: b - a! + 1 }, (_, i) => a! + i);
  });
}
const pictures: { n: number; scene: Scene }[] = batch
  ? batch.BATCH.map((scene, i) => ({ n: Number(process.env.START ?? FIRST_PORTFOLIO) + i, scene }))
  : numbers(args.find((a) => !a.includes('='))).map((n) => ({ n, scene: pictureAt(n) }));

const dump = option('dump');
if (dump) {
  const p = pictures.find((q) => q.n === Number(dump)) ?? { n: Number(dump), scene: pictureAt(Number(dump)) };
  const rows = sceneRows(p.scene, seed);
  const round = rounds(rows);
  console.log('   ' + [...Array(rows[0]!.length).keys()].map((x) => x % 10).join(''));
  rows.forEach((r, y) => console.log(`${String(y).padStart(2)} ${r}  ${[...r].map((_, x) => round[y * r.length + x]!.toString(36)).join('')}`));
  process.exit(0);
}

const num = (v: number) => (Number.isNaN(v) ? ' -  ' : v.toFixed(2));
const flag = (v: number, limit: number, atLeast = false) => (Number.isNaN(v) ? ' ' : (atLeast ? v < limit : v > limit) ? '!' : ' ');
function line(n: number, title: string, rows: string[]): string {
  const m = measure(title, rows);
  return (
    `${n} ${title.padEnd(27)} ${String(m.colours.length).padStart(2)} ${m.colours.join('').padEnd(11)} ` +
    `blind ${num(m.blind)}${flag(m.blind, 0.3)} filler ${num(m.filler)}${flag(m.filler, 0.5)} subject ${num(m.subject)}${flag(m.subject, 0.35, true)} ` +
    `rounds ${m.rounds} late ${num(m.late)} (${m.lateColours} col) groups ${m.groups} checker ${m.checker} straight ${m.straight}` +
    (REMIX[title] ? `  ← ${REMIX[title]}` : '')
  );
}

const colour = new Map<string, number[]>([...POOL.map((p): [string, number[]] => [p.char, rgbOf(p.hex)]), [CLEAR, rgbOf(PAGE)]]);
/** Pictures in cells of the largest size, `across` a row, on the page colour; a null leaves its cell empty; a source is framed grey. */
function sheet(list: ({ rows: string[]; source?: boolean } | null)[], file: string, s: number, across: number) {
  const w = Math.max(...list.map((p) => p?.rows[0]!.length ?? 0)) * s + 12;
  const h = Math.max(...list.map((p) => p?.rows.length ?? 0)) * s + 12;
  const W = Math.min(across, list.length) * w;
  const H = Math.ceil(list.length / across) * h;
  const rgb = new Uint8Array(W * H * 3).fill(28);
  list.forEach((p, i) => {
    if (!p) return;
    const ox = (i % across) * w + 6;
    const oy = Math.floor(i / across) * h + 6;
    if (p.source)
      for (let y = -3; y < p.rows.length * s + 2; y++)
        for (let x = -3; x < p.rows[0]!.length * s + 2; x++) rgb.set([90, 90, 96], ((oy + y) * W + ox + x) * 3);
    p.rows.forEach((r, y) =>
      [...r].forEach((ch, x) => {
        const c = colour.get(ch) ?? [255, 0, 255];
        for (let dy = 0; dy < s - 1; dy++) for (let dx = 0; dx < s - 1; dx++) rgb.set(c, ((oy + y * s + dy) * W + ox + x * s + dx) * 3);
      }),
    );
  });
  writeFileSync(file, png(W, H, rgb));
}

const out = `${OUT_DIR}/preview`;
mkdirSync(out, { recursive: true });
const drawn = pictures.map(({ n, scene }) => ({ n, title: scene.title, rows: sceneRows(scene, seed) }));
const sourceRows = (title: string) => {
  const source = SCENES.find((s) => s.title === title);
  return source ? sceneRows(source, 1) : null;
};
// Remixes first, each after its source, two pairs a row; then the other pictures, four a row.
const cells: ({ rows: string[]; source?: boolean } | null)[] = [];
for (const d of drawn.filter((d) => REMIX[d.title])) {
  const rows = sourceRows(REMIX[d.title]!);
  cells.push(rows ? { rows, source: true } : null, d);
}
while (cells.length % 4) cells.push(null);
cells.push(...drawn.filter((d) => !REMIX[d.title]));
sheet(cells, `${out}/all.png`, 8, 4);
for (const { n, title, rows } of drawn) {
  sheet([{ rows }], `${out}/${n}-${title.toLowerCase().replace(/[^a-z0-9 -]/g, '').replace(/ +/g, '-')}.png`, 14, 1);
  console.log(line(n, title, rows));
}
console.log(`→ ${out}/`);
