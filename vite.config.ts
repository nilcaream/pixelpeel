import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { inject, precache } from './src/precache.ts';

const VERSION = (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version;

/** Every file under a directory, by its path relative to it. */
function filesUnder(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split('\\').join('/'));
}

/** Builds src/sw.ts as /sw.js and, once the build is written, puts the list of its files into it. */
function serviceWorker(): Plugin {
  let outDir = 'dist';
  return {
    name: 'pixelpeel-service-worker',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    buildStart() {
      this.emitFile({ type: 'chunk', id: 'src/sw.ts', fileName: 'sw.js' });
    },
    writeBundle() {
      const build = new Map(filesUnder(outDir).map((name) => [name, readFileSync(join(outDir, name))] as const));
      const sw = join(outDir, 'sw.js');
      writeFileSync(sw, inject(readFileSync(sw, 'utf8'), precache(VERSION, build)));
    },
  };
}

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(VERSION) },
  plugins: [serviceWorker()],
  server: { host: '127.0.0.1' },
  build: { target: 'es2022' },
  test: { environment: 'node', include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
