// Local-only deterministic deployment fixture. Never proxies private traffic.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';

let release = 'old';
const root = path.resolve('dist');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png', '.svg':'image/svg+xml', '.woff2':'font/woff2'};
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/__test/release') { release = url.searchParams.get('value'); res.end('ok'); return; }
  if (url.pathname.startsWith('/auth/') || url.pathname.startsWith('/api/')) { res.writeHead(200, {'content-type':'text/plain', 'cache-control':'no-store'}); res.end('private-network'); return; }
  const name = url.pathname === '/' ? '/index.html' : url.pathname;
  if (release === 'missing' && name === '/icons/icon-192.png') { res.writeHead(404); res.end(); return; }
  try {
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + path.sep)) throw new Error('invalid path');
    let data = await readFile(file);
    if (name === '/sw.js') data = Buffer.from(data.toString().replace(/gc-shell-([a-f0-9]+)/, `gc-shell-$1-${release}`));
    if (release === 'mixed' && name === '/index.html') data = Buffer.concat([data, Buffer.from('mixed')]);
    res.writeHead(200, {'content-type':types[path.extname(name)] || 'application/octet-stream', 'cache-control':'no-store'}); res.end(data);
  } catch { res.writeHead(404); res.end(); }
}).listen(5179, '127.0.0.1');
