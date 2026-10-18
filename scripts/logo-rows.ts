// Prints the logo's rows and the pool's colours as JSON, for scripts/make-icons.py.
import { readFileSync } from 'node:fs';
import { LOGO_TITLE, logoRows } from '../src/logo.ts';
import { POOL } from '../src/palette.ts';

const levels = JSON.parse(readFileSync(new URL('../src/levels.json', import.meta.url), 'utf8')) as { title: string; sceneSeed: number }[];
const level = levels.find((l) => l.title === LOGO_TITLE);
if (!level) throw new Error(`no level called ${LOGO_TITLE}`);
console.log(JSON.stringify({ rows: logoRows(level.sceneSeed), pool: Object.fromEntries(POOL.map((c) => [c.char, c.hex])) }));
