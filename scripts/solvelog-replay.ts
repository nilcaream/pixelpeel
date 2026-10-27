// Replays every line of a solve log (the file the menu's Share or download gives) on the levels as they are, and
// prints per attempt whether the level's id still matches and whether its picks reach the outcome logged. An
// attempt left before the end ('l') or still in play ('-') matches a replay that is still playing.
//
//   npm run solvelog:replay -- <log file>

import { readFileSync } from 'node:fs';
import { replay } from '../src/generator.ts';
import levelsFile from '../src/levels.json' with { type: 'json' };
import type { Level } from '../src/levels.ts';
import { paintedPicture } from '../src/picture.ts';
import { status } from '../src/rules.ts';
import { decodeAttempt } from '../src/solvelog.ts';

const REACHED = { won: 'w', stuck: 's', playing: '-' } as const;

export interface Replayed {
  level: number;
  n: number;
  idMatches: boolean;
  logged: string;
  reached: (typeof REACHED)[keyof typeof REACHED];
  ok: boolean;
  picks: number;
}

/** One log line replayed; null for a comment, an empty line or a line that is not an attempt. */
export function replayLine(line: string, levels: Level[]): Replayed | null {
  const a = decodeAttempt(line);
  if (!a) return null;
  const level = levels.find((l) => l.number === a.level);
  if (!level) throw new Error(`no level ${a.level}`);
  const board = replay(paintedPicture(level.rows, level.overrides), level.columns, level.structure.buckets, a.picks);
  const reached = REACHED[status(board)];
  const ok = reached === (a.outcome === 'l' ? '-' : a.outcome);
  return { level: a.level, n: a.n, idMatches: a.id === level.id, logged: a.outcome, reached, ok, picks: a.picks.length };
}

function main(file: string | undefined): void {
  if (!file) throw new Error('usage: solvelog-replay.ts <log file>');
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const r = replayLine(line, levelsFile as unknown as Level[]);
    if (!r) {
      console.log(`not an attempt: ${line}`);
      continue;
    }
    console.log(
      `level ${r.level} attempt ${r.n} id ${r.idMatches ? 'matches' : 'DIFFERS'} logged ${r.logged} replayed ${r.reached} ${r.ok ? 'OK' : 'MISMATCH'} (${r.picks} picks)`,
    );
  }
}

if (import.meta.main) main(process.argv[2]);
