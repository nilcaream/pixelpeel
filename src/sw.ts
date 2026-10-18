// The service worker: it keeps one build of the game for offline use and answers the page's requests from
// it, so the app always opens the build it installed, whole. A newer build is a newer sw.js (precache.ts):
// it installs beside this one, takes over at once, and the page reloads onto it when that loses nothing
// (update.ts). Anything it does not keep goes to the network as if it were not there.

import type { Precache } from './precache.ts';

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}

// The DOM library has no worker scope; this is the part of it used here.
const worker = self as unknown as {
  addEventListener(type: 'install' | 'activate', listener: (e: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (e: FetchEvent) => void): void;
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
};

declare const __PRECACHE__: Precache;
const BUILD = __PRECACHE__;
const PREFIX = 'pixelpeel-';

async function sha256(body: ArrayBuffer): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', body));
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Fetches every file past the HTTP cache, and keeps them only if index.html is this build's very page. */
async function install(): Promise<void> {
  const cache = await caches.open(BUILD.cache);
  await Promise.all(
    BUILD.files.map(async (path) => {
      const response = await fetch(new Request(path, { cache: 'reload' }));
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      if (path === '/index.html' && (await sha256(await response.clone().arrayBuffer())) !== BUILD.index) {
        throw new Error('index.html is not this build');
      }
      await cache.put(path, response);
    }),
  );
}

worker.addEventListener('install', (e) => {
  // A failed install leaves the build that is running in place; the next check tries again.
  e.waitUntil(
    install()
      .then(() => worker.skipWaiting())
      .catch(async (error: unknown) => {
        await caches.delete(BUILD.cache);
        throw error;
      }),
  );
});

worker.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== BUILD.cache).map((k) => caches.delete(k))))
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener('fetch', (e) => {
  const request = e.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  // Every page of the site is the game's one page.
  const path = request.mode === 'navigate' ? '/index.html' : url.pathname;
  if (!BUILD.files.includes(path)) return;
  e.respondWith(
    caches
      .open(BUILD.cache)
      .then((cache) => cache.match(path))
      .then((kept) => kept ?? fetch(request)),
  );
});
