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
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try {
      await cache.addAll(SHELL);
      for (const url of SHELL) {
        const response = await cache.match(url);
        const bytes = await response.arrayBuffer();
        const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
        if (digest !== DIGESTS[url]) throw new Error('Shell asset version mismatch');
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
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.search) return;
  if (event.request.mode === 'navigate' && url.pathname !== '/' && url.pathname !== '/index.html') return;
  const key = event.request.mode === 'navigate' ? '/' : url.pathname;
  if (!SHELL.includes(key)) return;
  // Never substitute a newer network asset into an older controlled release.
  event.respondWith(caches.open(CACHE).then(cache => cache.match(key)).then(response => response || Response.error()));
});
`;
      await writeFile(path.join(outDir, 'sw.js'), worker);
    },
  };
}
