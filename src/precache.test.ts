import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { PLACEHOLDER, inject, precache } from './precache.ts';

const BUILD = new Map<string, string | Uint8Array>([
  ['index.html', '<script src="/assets/index-AAAA.js"></script>'],
  ['assets/index-AAAA.js', 'play()'],
  ['assets/index-BBBB.css', 'body{}'],
  ['assets/index-AAAA.js.map', '{}'],
  ['fonts/PressStart2P-Regular.ttf', new Uint8Array([1, 2, 3])],
  ['icon-192.png', new Uint8Array([4, 5])],
  ['sw.js', `const BUILD = ${PLACEHOLDER};`],
]);

describe('what the service worker keeps', () => {
  it('every file of the build from the site root, but not itself or a source map', () => {
    expect(precache('1.1.0', BUILD).files).toEqual([
      '/assets/index-AAAA.js',
      '/assets/index-BBBB.css',
      '/fonts/PressStart2P-Regular.ttf',
      '/icon-192.png',
      '/index.html',
    ]);
  });

  it('under a cache named for the version', () => {
    expect(precache('1.2.0', BUILD).cache).toMatch(/^pixelpeel-1\.2\.0-[0-9a-f]{12}$/);
  });

  it('under a new cache when any file changes, even one whose name does not', () => {
    const icon = new Map(BUILD).set('icon-192.png', new Uint8Array([4, 6]));
    expect(precache('1.1.0', icon).cache).not.toBe(precache('1.1.0', BUILD).cache);
    expect(precache('1.1.0', new Map(BUILD)).cache).toBe(precache('1.1.0', BUILD).cache);
  });

  it('with the hash of index.html', () => {
    const page = BUILD.get('index.html') as string;
    expect(precache('1.1.0', BUILD).index).toBe(createHash('sha256').update(page).digest('hex'));
  });

  it('or nothing, when there is no index.html', () => {
    const none = new Map(BUILD);
    none.delete('index.html');
    expect(() => precache('1.1.0', none)).toThrow('no index.html');
  });
});

describe('sw.js with the precache in it', () => {
  it('replaces the placeholder with the precache', () => {
    const p = precache('1.1.0', BUILD);
    expect(inject(`const BUILD = ${PLACEHOLDER};`, p)).toBe(`const BUILD = ${JSON.stringify(p)};`);
  });

  it('refuses a sw.js without the placeholder, or with it twice', () => {
    const p = precache('1.1.0', BUILD);
    expect(() => inject('const BUILD = {};', p)).toThrow('0 times');
    expect(() => inject(`${PLACEHOLDER} ${PLACEHOLDER}`, p)).toThrow('2 times');
  });
});
