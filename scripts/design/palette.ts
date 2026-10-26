// Tools for a palette round: how far a candidate colour is from the pool, the best colour near a target, which
// pool colours each picture uses, whether a set of colours keeps the distance rule, and a one-for-one recolour.
// Distances are CIEDE2000 (src/palette.ts). Colour-vision deficiency is simulated with Machado, Oliveira and
// Fernandes (2009) at severity 1.0 in linear sRGB, and the simulated colours are measured the same way.
//
//   npm run design:palette -- near '#26a69a' …            the nearest pool colours and the page, seen normally and by
//                                                          protan, deutan and tritan viewers
//   npm run design:palette -- search navy=#1a237e:40 …     per target, the colour in a box of ±radius per channel that is
//                                                          farthest from the pool, the page and the targets found before it
//   npm run design:palette -- census                       pool colours of every level and portfolio picture → out/census.json
//   npm run design:palette -- check vbspkroywnge v=#1a237e  the set rule on a set of letters; added colours as letter=#hex
//   npm run design:palette -- recolour 61 vbspkroywnge [c=v] [v=#1a237e]
//                                                          a picture recoloured into a set one for one: overrides first,
//                                                          then each colour already in the set keeps itself, then the
//                                                          least total distance for the rest
//
// The set rule: a pair of pool colours at least MIN_DELTA_E apart (the pool's own test), a pair with an added colour
// at least ADDED_FLOOR, every colour at least MIN_DELTA_E from the page, at most MAX_SET colours (the whole pool
// may be one set), and at most MAX_COOL of the blue-greens (`cool=` letters, where colours are most often confused).

import { readFileSync, writeFileSync } from 'node:fs';
import type { Level } from '../../src/levels.ts';
import { BLUE_GREENS, MAX_BLUE_GREENS, MIN_DELTA_E, PAGE, POOL, deltaE, hexToLab, paint } from '../../src/palette.ts';
import { PORTFOLIO } from '../../src/portfolio.ts';
import { sceneRows } from '../../src/scenes.ts';
import { FIRST_PORTFOLIO, outDir, pictureAt, rgbOf } from './common.ts';

const ADDED_FLOOR = 25;
const MAX_SET = 12;
const MAX_COOL = MAX_BLUE_GREENS;

const [command, ...args] = process.argv.slice(2);
const option = (name: string) => args.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
const positional = args.filter((a) => !a.includes('='));

/** The pool's letters and colours, plus the added colours given as letter=#hex. */
const HEX = new Map<string, string>(POOL.map((p) => [p.char, p.hex]));
const NAME = new Map<string, string>(POOL.map((p) => [p.char, p.name]));
const PROVEN = new Set(POOL.map((p) => p.char));
for (const a of args) {
  const m = /^(\w)=(#[0-9a-f]{6})$/i.exec(a);
  if (m) {
    HEX.set(m[1]!, m[2]!.toLowerCase());
    if (!NAME.has(m[1]!)) NAME.set(m[1]!, m[2]!.toLowerCase());
  }
}
const COOL = new Set(option('cool') ?? BLUE_GREENS);

type Kind = 'protan' | 'deutan' | 'tritan';
const MACHADO: Record<Kind, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const lin = (v: number) => (v / 255 <= 0.04045 ? v / 255 / 12.92 : ((v / 255 + 0.055) / 1.055) ** 2.4);
const unlin = (c: number) => {
  const x = Math.min(1, Math.max(0, c));
  return Math.round((x <= 0.0031308 ? x * 12.92 : 1.055 * x ** (1 / 2.4) - 0.055) * 255);
};
const toHex = (rgb: number[]) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
/** The colour a viewer with the full deficiency sees. */
function simulate(hex: string, kind: Kind): string {
  const rgb = rgbOf(hex).map(lin);
  return toHex(MACHADO[kind].map((row) => unlin(row.reduce((s, m, j) => s + m * rgb[j]!, 0))));
}
const de = (a: string, b: string, kind?: Kind) => (kind ? deltaE(hexToLab(simulate(a, kind)), hexToLab(simulate(b, kind))) : deltaE(hexToLab(a), hexToLab(b)));
const f1 = (x: number) => x.toFixed(1);

/** The pool's colours and the page, nearest first. */
function nearest(hex: string, kind?: Kind): [string, number][] {
  const others: [string, string][] = [...POOL.map((p): [string, string] => [p.name, p.hex]), ['page', PAGE]];
  return others
    .filter(([, x]) => x !== hex)
    .map(([n, x]): [string, number] => [n, de(hex, x, kind)])
    .sort((a, b) => a[1] - b[1]);
}

function floor(a: string, b: string): number {
  return PROVEN.has(a) && PROVEN.has(b) ? MIN_DELTA_E : ADDED_FLOOR;
}

/** Every way a set breaks the rule; empty when it keeps it. */
function check(letters: string): string[] {
  const bad: string[] = [];
  const set = [...letters];
  const unknown = set.filter((c) => !HEX.has(c));
  if (unknown.length) return [`no colour for ${unknown.join(', ')}: add it as letter=#hex`];
  const wholePool = set.length === PROVEN.size && set.every((c) => PROVEN.has(c));
  if (!wholePool && set.length > MAX_SET) bad.push(`${set.length} colours, more than ${MAX_SET}`);
  if (new Set(set).size !== set.length) bad.push('a colour twice');
  const cool = set.filter((c) => COOL.has(c));
  if (cool.length > MAX_COOL) bad.push(`${cool.length} blue-greens (${cool.join('')}), more than ${MAX_COOL}`);
  for (const c of set) if (de(HEX.get(c)!, PAGE) < MIN_DELTA_E) bad.push(`${NAME.get(c)} is ${f1(de(HEX.get(c)!, PAGE))} from the page`);
  for (let i = 0; i < set.length; i++)
    for (let j = i + 1; j < set.length; j++) {
      const [a, b] = [set[i]!, set[j]!];
      const d = de(HEX.get(a)!, HEX.get(b)!);
      if (d < floor(a, b)) bad.push(`${NAME.get(a)}/${NAME.get(b)} ${f1(d)} < ${floor(a, b)}`);
    }
  return bad;
}

/** Every way to give `k` of `items` an order. */
function* arrangements<T>(items: readonly T[], k: number): Generator<T[]> {
  if (k === 0) return yield [];
  for (let i = 0; i < items.length; i++)
    for (const rest of arrangements([...items.slice(0, i), ...items.slice(i + 1)], k - 1)) yield [items[i]!, ...rest];
}

/** The one-for-one recolour of the colours `used` into the set. */
function recolourMap(used: readonly string[], set: string, overrides: Record<string, string>, distance: (a: string, b: string) => number): Map<string, string> {
  const map = new Map(Object.entries(overrides));
  for (const c of used) if (!map.has(c) && set.includes(c) && ![...map.values()].includes(c)) map.set(c, c);
  const left = used.filter((c) => !map.has(c)).sort();
  const free = [...set].filter((c) => ![...map.values()].includes(c));
  if (left.length > free.length) throw new Error(`${used.length} colours do not fit a set of ${set.length}`);
  let best: string[] | null = null;
  let bestCost = Infinity;
  for (const pick of arrangements(free, left.length)) {
    const cost = pick.reduce((s, c, i) => s + distance(left[i]!, c), 0);
    if (cost < bestCost) [best, bestCost] = [pick, cost];
  }
  left.forEach((c, i) => map.set(c, best![i]!));
  if (new Set(map.values()).size !== map.size) throw new Error('not one for one: two colours would become one');
  return map;
}

const count = (rows: readonly string[]) => {
  const n: Record<string, number> = {};
  for (const ch of rows.join('')) if (ch !== '.') n[ch] = (n[ch] ?? 0) + 1;
  return n;
};

if (command === 'near') {
  for (const hex of positional) {
    console.log(`${hex}  ${nearest(hex).slice(0, 4).map(([n, d]) => `${n} ${f1(d)}`).join('  ')}`);
    for (const kind of Object.keys(MACHADO) as Kind[]) console.log(`  ${kind.padEnd(6)} ${nearest(hex, kind).slice(0, 3).map(([n, d]) => `${n} ${f1(d)}`).join('  ')}`);
  }
} else if (command === 'search') {
  const found: string[] = [];
  for (const target of args) {
    const m = /^([\w ]+)=(#[0-9a-f]{6})(?::(\d+))?$/i.exec(target);
    if (!m) throw new Error(`a target is name=#hex or name=#hex:radius, not ${target}`);
    const [r, g, b] = rgbOf(m[2]!);
    const radius = Number(m[3] ?? 40);
    const others = [...POOL.map((p) => p.hex), PAGE, ...found];
    let best = { hex: m[2]!, d: 0 };
    for (let dr = -radius; dr <= radius; dr += 8)
      for (let dg = -radius; dg <= radius; dg += 8)
        for (let db = -radius; db <= radius; db += 8) {
          const rgb = [r + dr, g + dg, b + db];
          if (rgb.some((v) => v < 0 || v > 255)) continue;
          const hex = toHex(rgb);
          const d = Math.min(...others.map((o) => de(hex, o)));
          if (d > best.d) best = { hex, d };
        }
    found.push(best.hex);
    console.log(`${m[1]} ${best.hex}: ${f1(best.d)} from the nearest (${nearest(best.hex).slice(0, 2).map(([n, d]) => `${n} ${f1(d)}`).join(', ')})`);
  }
} else if (command === 'census') {
  const levels = JSON.parse(readFileSync('src/levels.json', 'utf8')) as Level[];
  const census = [
    ...levels.map((l) => ({ n: l.number, title: l.title, counts: count(paint(l.rows, l.overrides)) })),
    ...PORTFOLIO.map((s, i) => ({ n: FIRST_PORTFOLIO + i, title: s.title, counts: count(paint(sceneRows(s, 1), s.overrides)) })),
  ];
  for (const p of census) console.log(`${String(p.n).padStart(3)} ${p.title.slice(0, 34).padEnd(34)} ${String(Object.keys(p.counts).length).padStart(2)} ${Object.keys(p.counts).sort().join('')}`);
  const file = `${outDir()}/census.json`;
  writeFileSync(file, JSON.stringify(census, null, 1) + '\n');
  console.log(`→ ${file}`);
} else if (command === 'check') {
  for (const set of positional) {
    const bad = check(set);
    console.log(`${set}: ${bad.length ? bad.join('; ') : 'keeps the rule'}`);
  }
} else if (command === 'recolour') {
  const [n, set] = positional;
  if (!n || !set) throw new Error('usage: palette.ts recolour <picture> <set letters> [old=new …]');
  const scene = pictureAt(Number(n));
  const rows = sceneRows(scene, Number(option('seed') ?? 1));
  const overrides = Object.fromEntries(args.filter((a) => /^\w=\w$/.test(a)).map((a) => a.split('=') as [string, string]));
  const map = recolourMap(Object.keys(count(rows)), set, overrides, (a, b) => de(HEX.get(a)!, HEX.get(b)!));
  console.log(`${scene.title}: ${[...map].map(([a, b]) => (a === b ? NAME.get(a) : `${NAME.get(a)}→${NAME.get(b)}`)).join(', ')}`);
} else throw new Error('usage: palette.ts near|search|census|check|recolour …');
