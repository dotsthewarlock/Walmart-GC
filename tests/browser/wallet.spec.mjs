import {test,expect} from '@playwright/test';
import {syntheticRemote,cardA,cardB} from '../syncFixtures.mjs';
import {schemaCapability} from '../../src/lib/csvSchema.js';
const protocol='gc-wallet-sync-v1';
async function snapshot(page){return page.evaluate(()=>new Promise((resolve,reject)=>{const req=indexedDB.open('walmartGc.inventory',1);req.onerror=()=>reject(req.error);req.onsuccess=()=>{const db=req.result,tx=db.transaction('state','readonly'),read=tx.objectStore('state').get('wallet');read.onsuccess=()=>{resolve(read.result);db.close();};};}));}
const active=s=>s.profiles[s.active];
async function settings(page){await page.getByRole('button',{name:'Open settings'}).click();}
async function cards(page){await page.getByRole('button',{name:'Cards',exact:true}).click();}
async function checkoutA(page){await cards(page);await page.getByText(/0042/).first().click();}
async function setup(context,remote,legacy=[cardA,cardB]){
 const errors=[],blocked=[],requests=[],dialogs=[];
 await context.addInitScript(({legacy})=>{
  if(location.origin!=='http://127.0.0.1:5178')return;
  if(!localStorage.getItem('qa-seeded')){localStorage.setItem('walmartGc.cards',JSON.stringify(legacy));localStorage.setItem('qa-seeded','yes');}
  const native=indexedDB;
  const wrap=db=>new Proxy(db,{get(target,key){if(key==='transaction')return(...args)=>{const tx=target.transaction(...args);return new Proxy(tx,{get(target,key){if(key==='objectStore')return(...args)=>{const store=target.objectStore(...args);return new Proxy(store,{get(target,key){if(key==='put')return(...args)=>{if(args[1]==='wallet'&&sessionStorage.getItem('qa-fail')==='yes'){sessionStorage.removeItem('qa-fail');throw Error('QA transaction failure');}return target.put(...args);};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){return Reflect.set(target,key,value,target);}});};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;},set(target,key,value){return Reflect.set(target,key,value,target);}});
  Object.defineProperty(window,'indexedDB',{value:{open(name,version){const req=native.open(name,version),wrapper={};req.onupgradeneeded=()=>{wrapper.result=wrap(req.result);wrapper.onupgradeneeded?.();};req.onsuccess=()=>{wrapper.result=wrap(req.result);wrapper.onsuccess?.();};req.onerror=()=>{wrapper.error=req.error;wrapper.onerror?.();};req.onblocked=()=>wrapper.onblocked?.();return wrapper;}}});
 },{legacy});
 const mock={principal:'qa-principal',sheetId:'synthetic-sheet',authenticated:true,offline:false,hold:null};
 await context.route('**/*',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(url.origin!=='http://127.0.0.1:5178'){blocked.push(url.href);return route.abort();}
  if(url.pathname.startsWith('/auth')){blocked.push(url.pathname);return route.fulfill({status:403,body:'Synthetic QA blocks OAuth navigation'});}
  if(!url.pathname.startsWith('/api/'))return route.continue();
  requests.push({path:url.pathname,method:request.method()});
  if(mock.offline)return route.abort('internetdisconnected');
  if(url.pathname==='/api/status')return route.fulfill({json:{...mock,ownershipVerified:true,syncProtocol:protocol,coordinationAvailable:true,schemaCapability,sheetVersion:(await remote.read()).version,email:'qa@example.invalid'}});
  const body=request.postDataJSON();
  if(url.pathname!=='/api/sync'&&url.pathname!=='/api/sheet/ensure'){blocked.push(url.pathname);return route.fulfill({status:403,json:{error:'Unsupported synthetic API'}});}
  if(mock.hold)await mock.hold;
  try{const result=await remote.coordinator.run(body);return route.fulfill({json:{...result,principal:mock.principal,sheetId:mock.sheetId}});}catch(error){return route.fulfill({status:error.code==='uncertain'?503:409,json:{error:error.message,code:error.code}});}
 });
 context.on('page',page=>{page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>{dialogs.push(dialog.message());return mock.dismissRecovery&&dialog.message().includes('Recovery exports contain')?dialog.dismiss():dialog.accept();});});
 return {errors,blocked,requests,mock,dialogs};
}
async function start(page){await page.goto('/');await expect(page.getByRole('button',{name:'Open settings'})).toBeVisible();await expect.poll(async()=>active(await snapshot(page)).context.ownershipVerified).toBe(true);}
async function recover(page){await settings(page);await page.locator('summary').filter({hasText:'Connection and recovery'}).click();await page.getByRole('button',{name:'Recover unbound inventory into connected account'}).click();await expect.poll(async()=>active(await snapshot(page)).pending.length).toBe(0);await cards(page);}

test('integrated mobile wallet, persistence, verification, Batch, exports, failure and protected sync',async({browser})=>{
 const context=await browser.newContext({viewport:{width:412,height:923}}),remote=await syntheticRemote([]),qa=await setup(context,remote);const page=await context.newPage();
 await test.step('migration/startup and reload preserve original evidence and compartments',async()=>{
  await start(page);let state=await snapshot(page);expect(state.profiles.unbound.cards).toHaveLength(2);expect(state.profiles.unbound.pending).toHaveLength(2);const bytes=state.migration.cards;
  await page.reload();await expect.poll(async()=>active(await snapshot(page)).context.ownershipVerified).toBe(true);expect((await snapshot(page)).migration.cards).toBe(bytes);await recover(page);
 });
 await test.step('balance, notes and used-state edits persist after React reload',async()=>{
  await checkoutA(page);await page.locator('#open-balance-modal').click();await page.locator('#balance-input').fill('87.65');await page.locator('#save-balance-update').click();
  await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByPlaceholder('Add card notes...').fill('Browser persisted note');await page.getByRole('button',{name:'Save Notes'}).click();await page.locator('#mark-used').click();
  await expect.poll(async()=>active(await snapshot(page)).cards.find(c=>c.cardNumber===cardA.cardNumber).used).toBe(true);await page.reload();await expect.poll(async()=>active(await snapshot(page)).cards.find(c=>c.cardNumber===cardA.cardNumber)?.notes).toBe('Browser persisted note');
  const card=active(await snapshot(page)).cards.find(c=>c.cardNumber===cardA.cardNumber);expect(card.currentBalance).toBe(87.65);expect(card.used).toBe(true);
 });
 await test.step('manual confirmation records the UTC verification day and preserves used state',async()=>{
  await cards(page);await page.locator('#review-balances').click();await page.getByLabel('Verified balance (CAD)').fill('86.00');await page.getByRole('button',{name:'Save & next'}).click();await page.getByRole('button',{name:'Exit',exact:true}).click();
  const card=active(await snapshot(page)).cards.find(c=>c.cardNumber===cardA.cardNumber);expect(card.lastBalanceChecked).toBe(new Date().toISOString().slice(0,10));expect(card.used).toBe(true);
 });
 await test.step('Batch v1 preview is read-only; partial application and exact replay remain atomic',async()=>{
  await page.locator('#review-balances').click();await page.getByRole('button',{name:'Batch',exact:true}).click();await page.getByRole('button',{name:'Create batch',exact:true}).click();
  await expect.poll(async()=>active(await snapshot(page)).ledger?.requests.length).toBe(2);
  const state=await snapshot(page),ledger=active(state).ledger;expect(ledger.requests).toHaveLength(2);
  // Card A was verified today, so use never-verified B for the partial result.
  const ref=ledger.requests.find(r=>r.cardNumber===cardB.cardNumber).ref;
  const packet=['WMGC-RESULT\t1','ref\tbalanceCAD\tcheckedAt',ref+'\t40.00\t'+new Date().toISOString()].join('\n');
  await page.getByRole('textbox').fill(packet);await page.getByRole('button',{name:'Preview results'}).click();expect(active(await snapshot(page)).cards.find(c=>c.cardNumber===cardB.cardNumber).currentBalance).toBe(50);
  await page.getByRole('button',{name:'Apply accepted results'}).click();await expect.poll(async()=>active(await snapshot(page)).ledger.requests.filter(r=>r.state==='applied').length).toBe(1);
  await page.getByRole('textbox').fill(packet);await page.getByRole('button',{name:'Preview results'}).click();await expect(page.getByRole('button',{name:'Apply accepted results'})).toBeDisabled();await page.getByRole('button',{name:'Exit',exact:true}).click();
 });
 await test.step('offline compartments, selected CSV and credential-warned recovery download',async()=>{
  qa.mock.offline=true;await settings(page);await page.locator('#saved-inventory').selectOption('unbound');await expect.poll(async()=>(await snapshot(page)).active).toBe('unbound');
  const csv=page.waitForEvent('download');await page.getByRole('button',{name:'Back up selected inventory CSV'}).click();const download=await csv;expect(download.suggestedFilename()).toMatch(/csv$/);const stream=await download.createReadStream();let text='';for await(const chunk of stream)text+=chunk.toString();expect(text.split('\n')[0].split(',')).toHaveLength(13);expect(text).toContain('0042');
  qa.mock.dismissRecovery=true;await page.getByRole('button',{name:'Export original and quarantined recovery data'}).click();expect(qa.dialogs.at(-1)).toContain('contain card credentials');qa.mock.dismissRecovery=false;
  const recovery=page.waitForEvent('download');await page.getByRole('button',{name:'Export original and quarantined recovery data'}).click();expect((await recovery).suggestedFilename()).toMatch(/recovery.json$/);
  await page.locator('#saved-inventory').selectOption('account:qa-principal:sheet:synthetic-sheet');qa.mock.offline=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 });
 await test.step('injected transaction abort is visible and preserves exact committed state',async()=>{
  await expect.poll(async()=>active(await snapshot(page)).pending.length).toBe(0);
  await cards(page);await page.getByText(/0084/).first().click();await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByPlaceholder('Add card notes...').fill('MUST NOT SAVE');
  // Wait for the previous push before measuring exact transaction state.
  await expect.poll(async()=>active(await snapshot(page)).pending.length).toBe(0);const before=await snapshot(page);await page.evaluate(()=>sessionStorage.setItem('qa-fail','yes'));await page.getByRole('button',{name:'Save Notes'}).click();await expect(page.getByText('QA transaction failure',{exact:true})).toBeVisible();expect(await snapshot(page)).toEqual(before);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 });
 await test.step('412 × 923 navigation and protected explicit controls use only coordinated API writes',async()=>{
  expect(await page.evaluate(()=>({width:innerWidth,height:innerHeight}))).toEqual({width:412,height:923});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(412);
  await cards(page);await settings(page);const connection=page.locator('summary').filter({hasText:'Google connection'});if(!await connection.evaluate(node=>node.parentElement.open))await connection.click();await page.locator('#save-to-sheets').click();await expect.poll(async()=>active(await snapshot(page)).pending.length).toBe(0);
  expect(qa.requests.filter(r=>['/api/cards/save'].includes(r.path))).toEqual([]);expect(qa.blocked.every(url=>url.startsWith('https://fonts.googleapis.com/'))).toBe(true);expect(qa.errors).toEqual([]);
  const recovery=page.locator('summary').filter({hasText:'Connection and recovery'});if(!await recovery.evaluate(node=>node.parentElement.open))await recovery.click();
  await page.getByRole('button',{name:'Create or initialize private Sheet'}).click();await expect.poll(()=>qa.requests.filter(r=>r.path==='/api/sheet/ensure').length).toBe(1);
  await expect.poll(async()=>(await remote.read()).commitId).not.toBe('');
  // Wait for control acknowledgment before exercising shared maintenance.
  await expect.poll(async()=>Object.keys((await snapshot(page)).controlFlights??{}).length).toBe(0);
  await page.getByRole('button',{name:'Pause shared maintenance'}).click();await expect.poll(async()=>(await remote.read()).maintenance).toBe(true);await expect.poll(async()=>Object.keys((await snapshot(page)).controlFlights??{}).length).toBe(0);
  await page.getByRole('button',{name:'Accept maintenance and resume'}).click();await expect.poll(async()=>(await remote.read()).maintenance).toBe(false);
  await page.setViewportSize({width:1280,height:900});await cards(page);await settings(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
 });
 await context.close();
});

test('two devices combine independent edits and preserve monetary conflicts for verification',async({browser})=>{
 const remote=await syntheticRemote([cardA,cardB]);const a=await browser.newContext(),b=await browser.newContext();await setup(a,remote,[]);await setup(b,remote,[]);const first=await a.newPage(),second=await b.newPage();await start(first);await start(second);
 await checkoutA(first);await first.getByRole('button',{name:'Edit',exact:true}).click();await first.getByPlaceholder('Add card notes...').fill('Device A note');await first.getByRole('button',{name:'Save Notes'}).click();
 await cards(second);await second.getByText(/0084/).first().click();await second.locator('#open-balance-modal').click();await second.locator('#balance-input').fill('45.00');await second.locator('#save-balance-update').click();
 await expect.poll(async()=>(await remote.read()).cards.find(c=>c.cardNumber===cardA.cardNumber).notes).toBe('Device A note');await expect.poll(async()=>(await remote.read()).cards.find(c=>c.cardNumber===cardB.cardNumber).currentBalance).toBe(45);
 await settings(first);await first.getByRole('button',{name:'Sync now',exact:true}).first().click();await expect.poll(async()=>active(await snapshot(first)).cards.find(c=>c.cardNumber===cardB.cardNumber).currentBalance).toBe(45);await a.close();await b.close();
});

test('two tabs reject stale editors and obsolete generation responses',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA,cardB]);const qa=await setup(context,remote,[]);const first=await context.newPage(),second=await context.newPage();await start(first);await start(second);
 await checkoutA(first);await first.locator('#open-balance-modal').click();await first.locator('#balance-input').fill('66.00');
 await checkoutA(second);await second.locator('#open-balance-modal').click();await second.locator('#balance-input').fill('77.00');await second.locator('#save-balance-update').click();await first.locator('#save-balance-update').click();await expect(first.getByText(/Saved cards changed/).first()).toBeVisible();
 await first.getByRole('button',{name:'Cancel',exact:true}).click();await settings(first);await settings(second);
 let release;qa.mock.hold=new Promise(resolve=>{release=resolve;});await first.getByRole('button',{name:'Sync now',exact:true}).first().click();await first.waitForTimeout(100);
 const activeKey=(await snapshot(second)).active;await second.locator('#saved-inventory').selectOption('unbound');await second.locator('#saved-inventory').selectOption(activeKey);const before=await snapshot(second);release();qa.mock.hold=null;await first.waitForTimeout(200);expect((await snapshot(first)).contextGeneration).toBe(before.contextGeneration);
 await context.close();
});

test('concurrent monetary actions retain remote provisional evidence and fresh unchanged verification clears the checkout warning',async({browser})=>{
 const remote=await syntheticRemote([cardA]),one=await browser.newContext(),two=await browser.newContext();await setup(one,remote,[]);await setup(two,remote,[]);const a=await one.newPage(),b=await two.newPage();await start(a);await start(b);
 let release;remote.delay=new Promise(resolve=>{release=resolve;});
 await checkoutA(a);await a.locator('#open-balance-modal').click();await a.locator('#balance-input').fill('80.00');await a.locator('#save-balance-update').click();await expect.poll(()=>remote.writes).toBe(1);
 await checkoutA(b);await b.locator('#open-balance-modal').click();await b.locator('#balance-input').fill('70.00');await b.locator('#save-balance-update').click();await expect.poll(async()=>Boolean(active(await snapshot(b)).inFlight)).toBe(true);release();
 await expect.poll(async()=>(await remote.read()).cards[0].pendingReconciliation).toBe(true);expect((await remote.read()).cards[0].currentBalance).toBe(80);
 await expect.poll(async()=>active(await snapshot(a)).pending.length).toBe(0);await settings(a);await a.getByRole('button',{name:'Sync now',exact:true}).first().click();await expect.poll(async()=>active(await snapshot(a)).cards[0].pendingReconciliation).toBe(true);
 await checkoutA(a);await expect(a.getByText(/Balance needs verification/)).toBeVisible();await expect(a.locator('#open-balance-modal')).toBeEnabled();const updated=(await remote.read()).cards[0].dateUpdated;
 await cards(a);await a.locator('#review-balances').click();await a.getByLabel('Verified balance (CAD)').fill('80.00');await a.getByRole('button',{name:'Save & next'}).click();await a.getByRole('button',{name:'Exit',exact:true}).click();
 await expect.poll(async()=>(await remote.read()).cards[0].pendingReconciliation).toBe(false);expect((await remote.read()).cards[0].lastBalanceChecked).toBe(new Date().toISOString().slice(0,10));expect((await remote.read()).cards[0].dateUpdated).toBe(updated);
 await one.close();await two.close();
});
