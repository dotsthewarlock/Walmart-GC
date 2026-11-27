import {test, expect} from '@playwright/test';

test('installed shell reloads offline without caching private responses', async ({browser, request}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto('/');
  await expect(page.getByRole('button', {name: 'Open settings'})).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.evaluate(async () => {const name=(await caches.keys()).find(name=>name.startsWith('gc-shell-'));await(await caches.open(name)).delete('/');});
  await page.reload();
  await expect(page.getByRole('button', {name:'Open settings'})).toBeVisible();
  expect(await page.evaluate(async () => (await (await fetch('/')).text()).includes('CDN root transformation'))).toBe(false);
  const manifest = await page.evaluate(async () => (await fetch(document.querySelector('link[rel=manifest]').href)).json());
  expect(manifest.icons.map(icon => icon.sizes)).toEqual(['192x192', '512x512']);
  const keys = await page.evaluate(async () => (await Promise.all((await caches.keys()).map(async name => (await (await caches.open(name)).keys()).map(request => new URL(request.url).pathname)))).flat());
  expect(keys).toContain('/');
  expect(keys.some(key => key.startsWith('/api/') || key.startsWith('/auth'))).toBe(false);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', {name: 'Open settings'})).toBeVisible();
  const removed = await page.evaluate(async () => {
    const name = (await caches.keys()).find(key => key.startsWith('gc-shell-'));
    const cache = await caches.open(name), asset = (await cache.keys()).find(request => new URL(request.url).pathname.endsWith('.js'));
    const response = await cache.match(asset), body = await response.text();
    await cache.delete(asset); return {name, url:asset.url, body};
  });
  await request.get('/__test/release?value=unavailable');
  expect((await page.reload()).status()).toBe(503);
  await expect(page.getByRole('heading', {name:'Wallet temporarily unavailable'})).toBeVisible();
  await request.get('/__test/release?value=old');
  await page.evaluate(async ({name,url,body}) => (await caches.open(name)).put(url, new Response(body, {headers:{'content-type':'text/javascript'}})), removed);
  await page.reload();
  await expect(page.getByRole('button', {name:'Open settings'})).toBeVisible();
  await context.setOffline(false);
  await context.close();
});

import {syntheticRemote, cardA} from '../syncFixtures.mjs';
import {schemaCapability} from '../../src/lib/csvSchema.js';
const state = page => page.evaluate(() => new Promise((resolve, reject) => {
  const open = indexedDB.open('walmartGc.inventory', 1);
  open.onerror = () => reject(open.error);
  open.onsuccess = () => { const db = open.result, tx = db.transaction('state'), request = tx.objectStore('state').get('wallet'); request.onsuccess = () => {resolve(request.result); db.close();}; request.onerror = () => reject(request.error); };
}));
const profile = wallet => wallet.profiles[wallet.active];
const syncPoll = fn => expect.poll(fn, {timeout: 22000});

test('updates preserve controlled releases and durable sync through offline activation', async ({browser, request}) => {
  await request.get('/__test/release?value=old');
  const remote = await syntheticRemote([]), context = await browser.newContext();
  let hold = false, offline = false, releaseHeld;
  context.on('page', page => page.on('dialog', dialog => dialog.accept()));
  await context.addInitScript(card => { if (!localStorage.getItem('qa-seeded')) {localStorage.setItem('walmartGc.cards', JSON.stringify([card])); localStorage.setItem('qa-seeded','yes');} }, cardA);
  await context.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (offline) return route.abort('internetdisconnected');
    if (url.pathname === '/api/status') return route.fulfill({json:{principal:'qa-principal',sheetId:'synthetic-sheet',authenticated:true,offline:false,ownershipVerified:true,syncProtocol:'gc-wallet-sync-v1',coordinationAvailable:true,schemaCapability,sheetVersion:'',email:'qa@example.invalid'}});
    if (url.pathname !== '/api/sync' && url.pathname !== '/api/sheet/ensure') return route.abort();
    if (hold) { await new Promise(resolve => { releaseHeld = resolve; }); return route.abort(); }
    try { return route.fulfill({json:{...await remote.coordinator.run(route.request().postDataJSON()),principal:'qa-principal',sheetId:'synthetic-sheet'}}); }
    catch (error) { return route.fulfill({status:error.code === 'uncertain' ? 503 : 409,json:{error:error.message,code:error.code}}); }
  });
  const old = await context.newPage();
  await old.goto('/');
  await expect(old.getByRole('button',{name:'Open settings'})).toBeVisible();
  await old.evaluate(() => navigator.serviceWorker.ready);
  await old.reload();
  await expect.poll(() => old.evaluate(() => navigator.serviceWorker.controller?.scriptURL)).toContain('/sw.js');
  await old.getByRole('button',{name:'Open settings'}).click();
  await old.locator('summary').filter({hasText:'Advanced synchronization and recovery'}).click();
  await old.getByRole('button',{name:'Recover unbound inventory into connected account'}).click();
  await syncPoll(async () => profile(await state(old)).pending.length).toBe(0);
  await old.getByRole('button',{name:'Cards',exact:true}).click();
  hold = true;
  await old.getByText(/0042/).first().click();
  await old.getByRole('button',{name:'Edit',exact:true}).click();
  await old.getByPlaceholder('Add card notes...').fill('Durable shell update');
  await old.getByRole('button',{name:'Save Notes'}).click();
  await syncPoll(async () => Boolean(profile(await state(old)).inFlight)).toBe(true);
  const before = profile(await state(old));
  expect(before.pending.length).toBeGreaterThan(0);
  await expect.poll(() => Boolean(releaseHeld)).toBe(true);
  const oldCache = await old.evaluate(async () => (await caches.keys()).find(k => k.endsWith('-old')));
  const asset = await old.evaluate(async key => (await (await caches.open(key)).keys()).map(r => new URL(r.url).pathname).find(p => p.endsWith('.js')), oldCache);
  const oldBytes = await old.evaluate(async asset => await (await fetch(asset)).text(), asset);
  // Missing and corrupted entries are repaired only from matching public bytes.
  for (const corrupt of [false, true]) {
    expect(await old.evaluate(async ({key, asset, corrupt}) => {
      const cache = await caches.open(key);
      if (corrupt) await cache.put(asset, new Response('corrupt'));
      else await cache.delete(asset);
      const response = await fetch(asset);
      return {body:await response.text(), stored:await (await cache.match(asset)).text()};
    }, {key:oldCache, asset, corrupt})).toEqual({body:oldBytes, stored:oldBytes});
  }
  for (const bad of ['mixed','missing']) {
    await request.get(`/__test/release?value=${bad}`);
    await old.evaluate(async () => { try { await (await navigator.serviceWorker.ready).update(); } catch {} });
    await expect.poll(async () => old.evaluate(async () => Boolean((await navigator.serviceWorker.ready).installing)), {timeout:10000}).toBe(false);
    expect(await old.evaluate(async () => (await navigator.serviceWorker.ready).waiting)).toBeNull();
    expect(await old.evaluate(() => caches.keys())).toEqual([oldCache]);
  }
  await request.get('/__test/release?value=new');
  await old.evaluate(async () => (await navigator.serviceWorker.ready).update());
  await expect.poll(() => old.evaluate(async () => (await navigator.serviceWorker.ready).waiting?.state), {timeout:10000}).toBe('installed');
  expect(await old.evaluate(async asset => await (await fetch(asset)).text(), asset)).toBe(oldBytes);
  // A newer release has genuinely different HTML and JS; neither may repair an old tab.
  expect(await old.evaluate(async ({key, asset}) => {
    const cache = await caches.open(key), saved = await cache.match(asset);
    await cache.delete(asset);
    let failed = false;
    try { await fetch(asset); } catch { failed = true; }
    await cache.put(asset, saved);
    return failed;
  }, {key:oldCache, asset})).toBe(true);
  const query = await context.newPage();
  const queryResponse = await query.goto('/?auth=connected');
  expect(query.url()).toContain('?auth=connected');
  expect(await queryResponse.text()).not.toContain('synthetic new release');
  await expect(query.getByRole('button',{name:'Open settings'})).toBeVisible();
  await query.close();
  const savedAsset = await old.evaluate(async ({key, asset}) => {
    const cache = await caches.open(key), response = await cache.match(asset);
    const text = await response.text(); await cache.delete(asset); return text;
  }, {key:oldCache, asset});
  const brokenStartup = await context.newPage();
  expect((await brokenStartup.goto('/')).status()).toBe(503);
  await expect(brokenStartup.getByRole('heading',{name:'Wallet temporarily unavailable'})).toBeVisible();
  await brokenStartup.close();
  await old.evaluate(async ({key, asset, text}) => (await caches.open(key)).put(asset, new Response(text, {headers:{'content-type':'text/javascript'}})), {key:oldCache, asset, text:savedAsset});
  const savedRoot = await old.evaluate(async key => {
    const cache = await caches.open(key), root = await cache.match('/');
    const text = await root.text(); await cache.delete('/'); return text;
  }, oldCache);
  const recovery = await context.newPage();
  const unavailable = await recovery.goto('/?auth=connected');
  expect(unavailable.status()).toBe(503);
  await expect(recovery.getByRole('heading',{name:'Wallet temporarily unavailable'})).toBeVisible();
  expect(profile(await state(old)).pending).toEqual(before.pending);
  await recovery.close();
  await old.evaluate(async ({key, html}) => (await caches.open(key)).put('/', new Response(html, {headers:{'content-type':'text/html'}})), {key:oldCache, html:savedRoot});
  const auth = await context.newPage();
  await auth.goto('/auth/test');
  await expect(auth.locator('body')).toHaveText('private-network');
  await auth.close();
  const cachesBefore = await old.evaluate(() => caches.keys());
  expect(cachesBefore).toHaveLength(2);
  offline = true;
  await context.setOffline(true);
  hold = false; releaseHeld();
  await old.close();
  // Allow the waiting worker to activate after its last controlled client closes.
  await new Promise(resolve => setTimeout(resolve, 500));
  const next = await context.newPage();
  const nextResponse = await next.goto('/');
  await expect(next.getByRole('button',{name:'Open settings'})).toBeVisible();
  expect(await nextResponse.text()).toContain('synthetic new release');
  expect(await next.evaluate(async asset => (await (await fetch(asset)).text()).includes('synthetic new release'), asset)).toBe(true);
  await expect.poll(() => next.evaluate(() => navigator.serviceWorker.controller?.state)).toBe('activated');
  const after = profile(await state(next));
  expect(after.pending).toEqual(before.pending);
  expect(after.inFlight).toEqual(before.inFlight);
  expect(after.cards.find(card => card.cardNumber === cardA.cardNumber).notes).toBe('Durable shell update');
  await next.reload();
  expect(profile(await state(next)).pending).toEqual(before.pending);
  offline = false;
  await context.setOffline(false);
  await next.evaluate(() => window.dispatchEvent(new Event('online')));
  await next.getByRole('button',{name:'Open settings'}).click();
  await next.getByRole('button',{name:'Sync now',exact:true}).first().click();
  await syncPoll(async () => profile(await state(next)).pending.length).toBe(0);
  expect((await remote.read()).cards.find(card => card.cardNumber === cardA.cardNumber).notes).toBe('Durable shell update');
  expect((await next.evaluate(() => caches.keys())).some(key => key.endsWith('-old'))).toBe(false);
  await context.close();
});
