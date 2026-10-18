// What the service worker (sw.ts) keeps for offline use: every file of the build, under a cache whose name
// changes whenever any file does. That name is written into sw.js, so every new build is a new sw.js, and
// the browser installs it whether the version was bumped or not.

import { createHash } from 'node:crypto';

/** The build as sw.js knows it. */
export interface Precache {
  version: string;
  /** The cache that holds this build's files: the version and a hash of every file's name and bytes. */
  cache: string;
  /** The SHA-256 of index.html, so an install that is handed a stale page fails instead of keeping it. */
  index: string;
  /** Every file of the build as a path from the site root, sorted. */
  files: string[];
}

/** The placeholder in sw.ts that the build replaces with the precache. */
export const PLACEHOLDER = '__PRECACHE__';

function sha256(...parts: (string | Uint8Array)[]): string {
  const hash = createHash('sha256');
  for (const part of parts) hash.update(part);
  return hash.digest('hex');
}

/** The precache of a build, from its files by their path relative to the output directory. */
export function precache(version: string, build: Map<string, string | Uint8Array>): Precache {
  const names = [...build.keys()].filter((name) => name !== 'sw.js' && !name.endsWith('.map')).sort();
  const index = build.get('index.html');
  if (index === undefined) throw new Error('the build has no index.html');
  const all = createHash('sha256');
  for (const name of names) all.update(name).update('\0').update(sha256(build.get(name) as string | Uint8Array));
  return {
    version,
    cache: `pixelpeel-${version}-${all.digest('hex').slice(0, 12)}`,
    index: sha256(index),
    files: names.map((name) => `/${name}`),
  };
}

/** sw.js with the precache in place of its placeholder, which must be there exactly once. */
export function inject(code: string, p: Precache): string {
  const parts = code.split(PLACEHOLDER);
  if (parts.length !== 2) throw new Error(`sw.js holds ${PLACEHOLDER} ${parts.length - 1} times, not once`);
  return parts.join(JSON.stringify(p));
}
