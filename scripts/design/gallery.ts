// Every level in order as one PNG each, to browse in a file manager: out/gallery/01-mushroom-house.png …, 16 px a
// square, the page colour behind clear squares. The baked levels come from src/levels.json; with an order from
// `npm run design:order`, its levels follow, drawn as they would be baked (a mirror flipped, at the deal's scene seed).
//
//   npm run design:gallery                    src/levels.json
//   npm run design:gallery -- out/order.json  and the proposed levels after them

import { readFileSync, writeFileSync } from 'node:fs';
import type { Level } from '../../src/levels.ts';
import { CLEAR, PAGE, POOL } from '../../src/palette.ts';
import { sceneRows } from '../../src/scenes.ts';
import { mirrored, outDir, pictureAt, png, rgbOf } from './common.ts';

const S = 16;
const colour = new Map<string, number[]>([...POOL.map((p): [string, number[]] => [p.char, rgbOf(p.hex)]), [CLEAR, rgbOf(PAGE)]]);
const out = outDir('gallery');

function draw(rows: readonly string[], file: string) {
  const W = rows[0]!.length * S;
  const H = rows.length * S;
  const rgb = new Uint8Array(W * H * 3);
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      const c = colour.get(ch);
      if (!c) throw new Error(`${file}: no colour for '${ch}'`);
      for (let dy = 0; dy < S; dy++) for (let dx = 0; dx < S; dx++) rgb.set(c, ((y * S + dy) * W + x * S + dx) * 3);
    }),
  );
  writeFileSync(`${out}/${file}`, png(W, H, rgb));
}

const slug = (title: string) => title.toLowerCase().replace(/[^a-z0-9 -]/g, '').trim().replace(/ +/g, '-');
const name = (n: number, title: string, mirror = false) => `${String(n).padStart(2, '0')}-${slug(title)}${mirror ? '-mirrored' : ''}.png`;

const levels = JSON.parse(readFileSync('src/levels.json', 'utf8')) as Level[];
for (const l of levels) draw(l.rows, name(l.number, l.title));
let count = levels.length;

const orderFile = process.argv[2];
if (orderFile) {
  const order = JSON.parse(readFileSync(orderFile, 'utf8')) as { level: number; picture: number; mirror: boolean; deal: { sceneSeed: number } }[];
  for (const o of order) {
    const scene = pictureAt(o.picture);
    const rows = sceneRows(scene, o.deal.sceneSeed);
    draw(o.mirror ? mirrored(rows) : rows, name(o.level, scene.title, o.mirror));
  }
  count += order.length;
}
console.log(`${count} levels → ${out}/`);
