// The traps the sensible player meets on a level, one by one: the positions it reaches where one of the picks it
// chooses among can still win and another no longer can, with the chance of being there, one line of picks that
// gets there, and per column whether the sensible player picks it and whether a win is left after it. It says why
// a level's sensible player loses where it does (level 2: every trap is a position where all top pots are digs).
// Only for levels whose whole tree is in reach (see the counts in scripts/design/tree.ts).
//
//   npm run design:traps -- 2

import levelsFile from '../../src/levels.json' with { type: 'json' };
import type { Level } from '../../src/levels.ts';
import { choices, explore, gameOf, type Game, type Position, type Tree } from './tree.ts';

export interface TrapColumn {
  column: number;
  dig: boolean;
  /** The sensible player picks among this column here. */
  chosen: boolean;
  /** A win is still there after this pick. */
  wins: boolean;
  /** The column's next three pots, with how many pixels of each one's colour are reachable now. */
  pots: { colour: number; count: number; reach: number }[];
}

export interface Trap {
  pick: number;
  /** The chance that a sensible game is at this position. */
  reach: number;
  peeled: number;
  held: { colour: number; left: number }[];
  free: number;
  /** One line of column picks from the start that reaches it. */
  line: number[];
  columns: TrapColumn[];
}

/** The sensible player's traps on a whole tree, in the tree's order (by picks made). */
export function traps(game: Game, t: Tree): Trap[] {
  if (t.only || !t.complete) throw new Error('traps needs the whole tree');
  const nc = t.columns;
  // Every pick goes forward in the tree's order, so one pass from the end decides which positions can be won.
  const win = new Uint8Array(t.size);
  for (let at = t.size - 1; at >= 0; at--) {
    if (t.state[at] === 1) win[at] = 1;
    for (let c = 0; c < nc; c++) {
      const to = t.child[at * nc + c] as number;
      if (to >= 0 && win[to]) win[at] = 1;
    }
  }
  const bits = (m: number) => {
    let k = 0;
    for (; m; m &= m - 1) k++;
    return k;
  };
  const reach = new Float64Array(t.size);
  const parent = new Int32Array(t.size).fill(-1);
  const via = new Int8Array(t.size);
  reach[0] = 1;
  const out: Trap[] = [];
  for (let at = 0; at < t.size; at++) {
    if (!reach[at] || t.state[at] !== 0) continue;
    const m = choices(t, at, 'S');
    let lose = false;
    for (let c = 0; c < nc; c++) {
      if (!(m & (1 << c))) continue;
      const to = t.child[at * nc + c] as number;
      reach[to] = (reach[to] as number) + (reach[at] as number) / bits(m);
      if (parent[to] === -1) {
        parent[to] = at;
        via[to] = c;
      }
      if (!win[to]) lose = true;
    }
    if (!win[at] || !lose) continue;
    const line: number[] = [];
    for (let x = at; (parent[x] as number) >= 0; x = parent[x] as number) line.unshift(via[x] as number);
    let p: Position = game.start();
    for (const c of line) p = game.pick(p, c) as Position;
    const free = game.free(p);
    const open = choices(t, at, 'U');
    const columns: TrapColumn[] = [];
    for (let c = 0; c < nc; c++) {
      if (!(open & (1 << c))) continue;
      const depth = p.depths[c] as number;
      const pots = (game.columns[c] ?? []).slice(depth, depth + 3);
      columns.push({
        column: c,
        dig: (((t.dig[at] as number) >> c) & 1) === 1,
        chosen: (m & (1 << c)) !== 0,
        wins: win[t.child[at * nc + c] as number] === 1,
        pots: pots.map((q) => ({ colour: q.colour, count: q.count, reach: free[q.colour] as number })),
      });
    }
    out.push({ pick: t.layer[at] as number, reach: reach[at] as number, peeled: 1 - p.left / game.pixels, held: p.held, free: t.free[at] as number, line, columns });
  }
  return out;
}

async function main(args: string[]): Promise<void> {
  const level = (levelsFile as unknown as Level[]).find((l) => l.number === Number(args[0]));
  if (!level) throw new Error('usage: traps.ts <level>');
  const game = gameOf(level);
  const found = traps(game, await explore(game));
  for (const trap of found) {
    console.log(
      `trap at pick ${trap.pick}, reached by S with ${trap.reach.toFixed(4)}, peeled ${trap.peeled.toFixed(3)}, held ${JSON.stringify(trap.held)}, free buckets ${trap.free}`,
    );
    console.log(`  one line: ${trap.line.join('')}`);
    for (const c of trap.columns)
      console.log(
        `  column ${c.column}: ${c.dig ? 'dig   ' : 'useful'} ${c.chosen ? 'S picks' : 'S never'} → ${c.wins ? 'can win' : 'LOST'}; pots ${c.pots.map((q) => `${q.colour}:${q.count}(reach ${q.reach})`).join(' ')}`,
      );
  }
  console.log(`${found.length} traps, ${found.reduce((s, x) => s + x.reach, 0).toFixed(3)} met per sensible game`);
}

if (import.meta.main) await main(process.argv.slice(2));
