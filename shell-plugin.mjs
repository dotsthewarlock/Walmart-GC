import {createHash} from 'node:crypto';
import {readFile, readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

// Only files produced by this application build and the listed public metadata
// belong in the shell. Runtime responses are never added to the cache.
export default function shellPlugin() {
  let outDir;
  return {
    name: 'application-shell',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); },
    async closeBundle() {
      const assets = (await readdir(path.join(outDir, 'assets'))).map(name => `/assets/${name}`);
      const urls = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg', '/icons/icon-192.png', '/icons/icon-512.png', ...assets].sort();
      const hash = createHash('sha256').update(await readFile(new URL(import.meta.url)));
      const digests = {};
      for (const url of urls.filter(url => url !== '/')) {
        const content = await readFile(path.join(outDir, url.slice(1)));
        digests[url] = createHash('sha256').update(content).digest('hex');
        hash.update(url).update(content);
      }
      digests['/'] = digests['/index.html'];
      const version = hash.digest('hex').slice(0, 16);
      const worker = `const CACHE = ${JSON.stringify(`gc-shell-${version}`)};\nconst SHELL = ${JSON.stringify(urls)};\nconst DIGESTS = ${JSON.stringify(digests)};\n` + `
async function matches(response, key) {
  if (!response || !response.ok || response.redirected) return false;
  const bytes = await response.clone().arrayBuffer();
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  return digest === DIGESTS[key];
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await cache.addAll(SHELL);
      for (const url of SHELL) {
        const response = await cache.match(url);
        if (!await matches(response, url)) throw new Error('Shell asset version mismatch');
      }
    } catch (error) {
      await caches.delete(CACHE);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('gc-shell-') && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  const navigation = event.request.mode === 'navigate';
  if (navigation && url.pathname !== '/' && url.pathname !== '/index.html') return;
  if (!navigation && url.search) return;
  const key = navigation ? '/' : url.pathname;
  if (!SHELL.includes(key)) return;
  event.respondWith((async () => {
    async function load(key) {
      let cache;
      try {
        cache = await caches.open(CACHE);
        const cached = await cache.match(key);
        if (await matches(cached, key)) return cached;
      } catch {}
      try {
        // The canonical public URL excludes OAuth parameters and cookies.
        const response = await fetch(new Request(new URL(key, self.location.origin), {cache:'no-store', credentials:'omit', redirect:'error'}));
        if (await matches(response, key)) {
          try { await cache?.put(key, response.clone()); } catch {}
          return response;
        }
      } catch {}
      return null;
    }
    const response = await load(key);
    if (!navigation) return response || Response.error();
    // Ensure startup assets are present before returning an otherwise blank app.
    if (response) {
      const startup = SHELL.filter(path => path.startsWith('/assets/') && (path.endsWith('.js') || path.endsWith('.css')));
      const assets = await Promise.all(startup.map(load));
      if (assets.every(Boolean)) return response;
    }
    return new Response('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wallet temporarily unavailable</title><h1>Wallet temporarily unavailable</h1><p>Connect to the internet and try again. If this persists, close all wallet tabs and reopen the wallet online.</p><p>Your saved inventory has not been removed.</p></html>', {status:503, headers:{'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store'}});
  })());
});
`;
      await writeFile(path.join(outDir, 'sw.js'), worker);
    },
  };
}
