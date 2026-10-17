// Reads a PNG file into RGBA pixels with nothing but node:zlib: 8-bit greyscale, RGB, palette (with
// tRNS transparency), greyscale with alpha and RGBA, not interlaced. That covers the source pictures;
// anything else is refused with a reason rather than read wrongly.

import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import type { Image } from '../src/convert.ts';

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function readPng(path: string): Image {
  return decodePng(readFileSync(path));
}

export function decodePng(file: Uint8Array): Image {
  if (!SIGNATURE.every((b, i) => file[i] === b)) throw new Error('not a PNG file');
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength);
  let width = 0;
  let height = 0;
  let colourType = 0;
  let palette: Uint8Array = new Uint8Array(0);
  let alphas: Uint8Array = new Uint8Array(0);
  const data: Uint8Array[] = [];
  for (let at = 8; at < file.length; ) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...file.subarray(at + 4, at + 8));
    const body = file.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = view.getUint32(at + 8);
      height = view.getUint32(at + 12);
      const depth = body[8];
      colourType = body[9] as number;
      if (depth !== 8) throw new Error(`bit depth ${depth} is not supported, only 8`);
      if (!(colourType in CHANNELS)) throw new Error(`colour type ${colourType} is not supported`);
      if (body[12] !== 0) throw new Error('interlaced PNGs are not supported');
    } else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') alphas = body;
    else if (type === 'IDAT') data.push(body);
    else if (type === 'IEND') break;
    at += 12 + length;
  }
  const channels = CHANNELS[colourType] as number;
  const stride = width * channels;
  const raw = inflateSync(Buffer.concat(data));
  if (raw.length !== height * (stride + 1)) throw new Error('the image data is not the size the header says');
  const rows = new Uint8Array(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)] as number;
    const src = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const out = rows.subarray(y * stride, (y + 1) * stride);
    const up = y > 0 ? rows.subarray((y - 1) * stride, y * stride) : new Uint8Array(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? (out[i - channels] as number) : 0;
      const b = up[i] as number;
      const c = i >= channels ? (up[i - channels] as number) : 0;
      const x = src[i] as number;
      let v: number;
      if (filter === 0) v = x;
      else if (filter === 1) v = x + a;
      else if (filter === 2) v = x + b;
      else if (filter === 3) v = x + ((a + b) >> 1);
      else if (filter === 4) {
        const p = a + b - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - b);
        const pc = Math.abs(p - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      } else throw new Error(`row ${y} has an unknown filter ${filter}`);
      out[i] = v & 255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let p = 0; p < width * height; p++) {
    const s = p * channels;
    const d = p * 4;
    if (colourType === 6) rgba.set(rows.subarray(s, s + 4), d);
    else if (colourType === 2) rgba.set([rows[s] as number, rows[s + 1] as number, rows[s + 2] as number, 255], d);
    else if (colourType === 0) rgba.set([rows[s] as number, rows[s] as number, rows[s] as number, 255], d);
    else if (colourType === 4) rgba.set([rows[s] as number, rows[s] as number, rows[s] as number, rows[s + 1] as number], d);
    else {
      const i = rows[s] as number;
      if (i * 3 + 2 >= palette.length) throw new Error(`pixel ${p} uses palette entry ${i}, which is not there`);
      rgba.set([palette[i * 3] as number, palette[i * 3 + 1] as number, palette[i * 3 + 2] as number, alphas[i] ?? 255], d);
    }
  }
  return { width, height, rgba };
}
