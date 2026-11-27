import {test,expect} from '@playwright/test';
import {syntheticRemote,cardA,cardB} from '../syncFixtures.mjs';
import {schemaCapability} from '../../src/lib/csvSchema.js';
const protocol='gc-wallet-sync-v1';
test.describe.configure({timeout:120000});
const syncPoll=fn=>expect.poll(fn,{timeout:22000});
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
  if(url.pathname==='/api/status')return route.fulfill({json:{...mock,ownershipVerified:true,syncProtocol:protocol,coordinationAvailable:true,schemaCapability,sheetVersion:'',email:'qa@example.invalid'}});
  const body=request.postDataJSON();
  if(url.pathname!=='/api/sync'&&url.pathname!=='/api/sheet/ensure'){blocked.push(url.pathname);return route.fulfill({status:403,json:{error:'Unsupported synthetic API'}});}
  if(mock.hold)await mock.hold;
  try{const result=await remote.coordinator.run(body);return route.fulfill({json:{...result,principal:mock.principal,sheetId:mock.sheetId}});}catch(error){return route.fulfill({status:error.code==='uncertain'?503:409,json:{error:error.message,code:error.code}});}
 });
 context.on('page',page=>{page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>{dialogs.push(dialog.message());return mock.dismissRecovery&&dialog.message().includes('Recovery exports contain')?dialog.dismiss():dialog.accept();});});
 return {errors,blocked,requests,mock,dialogs};
}
async function start(page){await page.goto('/');await expect(page.getByRole('button',{name:'Open settings'})).toBeVisible();await expect.poll(async()=>active(await snapshot(page)).context.ownershipVerified).toBe(true);}
async function recover(page){await settings(page);await page.locator('summary').filter({hasText:'Advanced synchronization and recovery'}).click();await page.getByRole('button',{name:'Recover unbound inventory into connected account'}).click();await syncPoll(async()=>active(await snapshot(page)).pending.length).toBe(0);await cards(page);}

test('offline selections survive reload and synchronize delayed observations',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([]),qa=await setup(context,remote);const page=await context.newPage();
 await start(page);await recover(page);qa.mock.offline=true;
 await page.locator('#review-balances').click();await page.getByRole('button',{name:'Batch',exact:true}).click();
 await page.getByLabel('Last checked').selectOption('any');await page.getByRole('button',{name:'Select cards (2)'}).click();
 await expect.poll(async()=>active(await snapshot(page)).ledger?.requests.length).toBe(2);
 const firstLedger=active(await snapshot(page)).ledger;
 const obsolete=firstLedger.requests.find(r=>r.cardNumber===cardB.cardNumber).ref;
 await page.evaluate(ref=>new Promise((resolve,reject)=>{const open=indexedDB.open('walmartGc.inventory',1);open.onerror=()=>reject(open.error);open.onsuccess=()=>{const db=open.result,tx=db.transaction('state','readwrite'),store=tx.objectStore('state'),read=store.get('wallet');read.onsuccess=()=>{const wallet=read.result;wallet.profiles[wallet.active].ledger.requests.find(r=>r.ref===ref).relevance.pinDigest='0'.repeat(64);store.put(wallet,'wallet');};tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};}),obsolete);
 await page.reload();await page.locator('#review-balances').click();await page.getByRole('button',{name:'Batch',exact:true}).click();
 await page.getByRole('button',{name:'Select cards (2)'}).click();
 await expect.poll(async()=>active(await snapshot(page)).ledger?.requests.length).toBe(4);
 const both=active(await snapshot(page)).ledger;
 expect(both.requests.find(r=>r.ref===obsolete).state).toBe('invalidated');
 const first=firstLedger.requests.find(r=>r.cardNumber===cardA.cardNumber),second=both.requests.slice(2).find(r=>r.cardNumber===cardA.cardNumber);
 await page.reload();await page.locator('#review-balances').click();await page.getByRole('button',{name:'Batch',exact:true}).click();
 const checked=new Date().toISOString(),later=new Date(Date.now()+1000).toISOString();
 for(const [ref,balance,at] of [[first.ref,'90.00',checked],[second.ref,'80.00',later]]){
  await page.getByRole('textbox').fill(['WMGC-RESULT\t1','ref\tbalanceCAD\tcheckedAt',`${ref}\t${balance}\t${at}`].join('\n'));
  await page.getByRole('button',{name:'Preview results'}).click();await page.getByRole('button',{name:'Apply accepted results'}).click();
  await expect.poll(async()=>active(await snapshot(page)).ledger.requests.find(r=>r.ref===ref).state).toBe('applied');
 }
 expect(active(await snapshot(page)).cards.find(c=>c.cardNumber===cardA.cardNumber).currentBalance).toBe(80);
 qa.mock.offline=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await page.getByRole('button',{name:'Exit',exact:true}).click();await settings(page);await page.getByRole('button',{name:'Sync now'}).click();
 await syncPoll(async()=>active(await snapshot(page)).pending.length).toBe(0);
 expect((await remote.read()).cards.find(c=>c.cardNumber===cardA.cardNumber).currentBalance).toBe(80);
 await context.close();
});

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
  await page.locator('#review-balances').click();await page.getByRole('button',{name:'Batch',exact:true}).click();
  const status=page.getByRole('group',{name:'Status'}),balance=page.getByRole('group',{name:'Balance'}),quantity=page.getByRole('group',{name:/Quantity/});
  await expect(status.getByLabel('Active')).toBeChecked();await expect(balance.getByLabel('Yes')).toBeChecked();await expect(page.getByText('· 1 matching')).toBeVisible();
  await status.getByText('All',{exact:true}).click();await balance.getByText('All',{exact:true}).click();await quantity.getByText('5',{exact:true}).click();await page.getByLabel('Last checked').selectOption('older');await page.getByLabel('Days').selectOption('7');
  await page.getByRole('button',{name:'Exit',exact:true}).click();await page.reload();await page.locator('#review-balances').click();await page.getByRole('button',{name:'Batch',exact:true}).click();
  await expect(status.getByLabel('All')).toBeChecked();await expect(balance.getByLabel('All')).toBeChecked();await expect(quantity.getByLabel('5',{exact:true})).toBeChecked();await expect(page.getByLabel('Last checked')).toHaveValue('older');await expect(page.getByLabel('Days')).toHaveValue('7');
  qa.mock.offline=true;
  await page.getByLabel('Last checked').selectOption('any');await expect(page.getByLabel('Days')).toBeDisabled();await expect(page.getByText('· 2 matching')).toBeVisible();await page.getByRole('button',{name:'Select cards (2)',exact:true}).click();
  await expect.poll(async()=>active(await snapshot(page)).ledger?.requests.length).toBe(2);
  const state=await snapshot(page),ledger=active(state).ledger;expect(ledger.requests).toHaveLength(2);
  await expect(page.getByRole('heading',{name:'Saved requests'})).toBeVisible();await expect(page.getByRole('button',{name:'Reset',exact:true})).toBeVisible();expect(active(await snapshot(page)).ledger).toEqual(ledger);await page.getByRole('button',{name:'Copy selected cards'}).click();await expect(page.getByText(/Copied 2 requests/)).toBeVisible();
  // A same-day verification before request creation remains eligible.
  const ref=ledger.requests.find(r=>r.cardNumber===cardA.cardNumber).ref;
  const packet=['WMGC-RESULT\t1','ref\tbalanceCAD\tcheckedAt',ref+'\t40.00\t'+new Date().toISOString()].join('\n');
  await page.getByRole('textbox').fill(packet);await page.getByRole('button',{name:'Preview results'}).click();expect(active(await snapshot(page)).cards.find(c=>c.cardNumber===cardA.cardNumber).currentBalance).toBe(86);
  await page.getByRole('button',{name:'Apply accepted results'}).click();await expect.poll(async()=>active(await snapshot(page)).ledger.requests.filter(r=>r.state==='applied').length).toBe(1);
  await expect.poll(async()=>active(await snapshot(page)).cards.find(c=>c.cardNumber===cardA.cardNumber).currentBalance).toBe(40);await expect(page.getByText(/1 outstanding/).first()).toBeVisible();
  expect(active(await snapshot(page)).pending.some(op=>op.kind==='batch-verification')).toBe(true);
  await page.getByRole('textbox').fill(packet);await page.getByRole('button',{name:'Preview results'}).click();await expect(page.getByRole('button',{name:'Apply accepted results'})).toBeDisabled();await page.getByRole('button',{name:'Exit',exact:true}).click();
 });
 await test.step('offline compartments, selected CSV and credential-warned recovery download',async()=>{
  qa.mock.offline=true;await settings(page);await page.locator('#saved-inventory').selectOption('unbound');await expect.poll(async()=>(await snapshot(page)).active).toBe('unbound');
  const csv=page.waitForEvent('download');await page.getByRole('button',{name:'Back up selected inventory CSV'}).click();const download=await csv;expect(download.suggestedFilename()).toMatch(/csv$/);const stream=await download.createReadStream();let text='';for await(const chunk of stream)text+=chunk.toString();expect(text.split('\n')[0].split(',')).toHaveLength(14);expect(text).toContain('0042');
  qa.mock.dismissRecovery=true;await page.getByRole('button',{name:'Export original and quarantined recovery data'}).click();expect(qa.dialogs.at(-1)).toContain('contain card credentials');qa.mock.dismissRecovery=false;
  const recovery=page.waitForEvent('download');await page.getByRole('button',{name:'Export original and quarantined recovery data'}).click();expect((await recovery).suggestedFilename()).toMatch(/recovery.json$/);
  await page.locator('#saved-inventory').selectOption('account:qa-principal:sheet:synthetic-sheet');qa.mock.offline=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 });
 await test.step('injected transaction abort is visible and preserves exact committed state',async()=>{
  await syncPoll(async()=>active(await snapshot(page)).pending.length).toBe(0);
  await cards(page);await page.getByText(/0084/).first().click();await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByPlaceholder('Add card notes...').fill('MUST NOT SAVE');
  // Wait for the previous push before measuring exact transaction state.
  await syncPoll(async()=>active(await snapshot(page)).pending.length).toBe(0);const before=await snapshot(page);await page.evaluate(()=>sessionStorage.setItem('qa-fail','yes'));await page.getByRole('button',{name:'Save Notes'}).click();await expect(page.getByText('QA transaction failure',{exact:true})).toBeVisible();expect(await snapshot(page)).toEqual(before);await page.getByRole('button',{name:'Cancel',exact:true}).click();
 });
 await test.step('412 × 923 navigation and protected explicit controls use only coordinated API writes',async()=>{
  expect(await page.evaluate(()=>({width:innerWidth,height:innerHeight}))).toEqual({width:412,height:923});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(412);
  await cards(page);await settings(page);await expect(page.locator('#open-direct-sheet')).toHaveAttribute('href','https://docs.google.com/spreadsheets/d/synthetic-sheet/edit');await expect(page.getByText(/Last confirmed synchronization:/)).toBeVisible();const recovery=page.locator('summary').filter({hasText:'Advanced synchronization and recovery'});if(!await recovery.evaluate(node=>node.parentElement.open))await recovery.click();await page.locator('#save-to-sheets').click();await syncPoll(async()=>active(await snapshot(page)).pending.length).toBe(0);
  expect(qa.requests.filter(r=>['/api/cards/save'].includes(r.path))).toEqual([]);expect(qa.blocked.every(url=>url.startsWith('https://fonts.googleapis.com/'))).toBe(true);expect(qa.errors).toEqual([]);
  await page.getByRole('button',{name:'Create or initialize private Sheet'}).click();await expect.poll(()=>qa.requests.filter(r=>r.path==='/api/sheet/ensure').length).toBe(1);
  await expect.poll(async()=>(await remote.read()).commitId).not.toBe('');
  // Wait for control acknowledgment before exercising shared maintenance.
  await expect.poll(async()=>Object.keys((await snapshot(page)).controlFlights??{}).length).toBe(0);
  await page.getByRole('button',{name:'Pause shared maintenance'}).click();await syncPoll(async()=>(await remote.read()).maintenance).toBe(true);await expect.poll(async()=>Object.keys((await snapshot(page)).controlFlights??{}).length).toBe(0);
  await page.getByRole('button',{name:'Accept maintenance and resume'}).click();await syncPoll(async()=>(await remote.read()).maintenance).toBe(false);
  await page.setViewportSize({width:1280,height:900});await cards(page);await settings(page);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
 });
 await context.close();
});

test('two devices combine independent edits and preserve monetary conflicts for verification',async({browser})=>{
 const remote=await syntheticRemote([cardA,cardB]);const a=await browser.newContext(),b=await browser.newContext();await setup(a,remote,[]);await setup(b,remote,[]);const first=await a.newPage(),second=await b.newPage();await start(first);await start(second);
 await checkoutA(first);await first.getByRole('button',{name:'Edit',exact:true}).click();await first.getByPlaceholder('Add card notes...').fill('Device A note');await first.getByRole('button',{name:'Save Notes'}).click();
 await cards(second);await second.getByText(/0084/).first().click();await second.locator('#open-balance-modal').click();await second.locator('#balance-input').fill('45.00');await second.locator('#save-balance-update').click();
 await syncPoll(async()=>(await remote.read()).cards.find(c=>c.cardNumber===cardA.cardNumber).notes).toBe('Device A note');await syncPoll(async()=>(await remote.read()).cards.find(c=>c.cardNumber===cardB.cardNumber).currentBalance).toBe(45);
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
 await checkoutA(a);await a.locator('#open-balance-modal').click();await a.locator('#balance-input').fill('80.00');await a.locator('#save-balance-update').click();await syncPoll(()=>remote.writes).toBe(1);
 await checkoutA(b);await b.locator('#open-balance-modal').click();await b.locator('#balance-input').fill('70.00');await b.locator('#save-balance-update').click();await syncPoll(async()=>Boolean(active(await snapshot(b)).inFlight)).toBe(true);release();
 await syncPoll(async()=>(await remote.read()).cards[0].pendingReconciliation).toBe(true);expect((await remote.read()).cards[0].currentBalance).toBe(80);
 await syncPoll(async()=>active(await snapshot(a)).pending.length).toBe(0);await settings(a);await a.getByRole('button',{name:'Sync now',exact:true}).first().click();await expect.poll(async()=>active(await snapshot(a)).cards[0].pendingReconciliation).toBe(true);
 await checkoutA(a);await expect(a.getByText(/Balance needs verification/)).toBeVisible();await expect(a.locator('#open-balance-modal')).toBeEnabled();const updated=(await remote.read()).cards[0].dateUpdated;
 await cards(a);await a.locator('#review-balances').click();await a.getByLabel('Verified balance (CAD)').fill('80.00');await a.getByRole('button',{name:'Save & next'}).click();await a.getByRole('button',{name:'Exit',exact:true}).click();
 await syncPoll(async()=>(await remote.read()).cards[0].pendingReconciliation).toBe(false);expect((await remote.read()).cards[0].lastBalanceChecked).toBe(new Date().toISOString().slice(0,10));expect((await remote.read()).cards[0].dateUpdated).toBe(updated);
 await one.close();await two.close();
});

test('legacy clipboard opt-in is ignored; checker return requires explicit paste',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA,cardB]);const qa=await setup(context,remote,[]);
 await context.addInitScript(()=>{
  localStorage.setItem('walmartGc.settings',JSON.stringify({detectBatchResults:true,clipboardPermissionAttempted:true}));
  window.qaClipboard={text:'',reads:0,queries:0};
  Object.defineProperty(navigator,'permissions',{value:{query:async()=>{window.qaClipboard.queries++;return {state:'granted'};}}});
  Object.defineProperty(navigator,'clipboard',{value:{readText:async()=>{window.qaClipboard.reads++;return window.qaClipboard.text;},writeText:async()=>{}}});
 });
 const page=await context.newPage();await start(page);await settings(page);
 await expect(page.getByText('Detect copied Batch results')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Allow clipboard access'})).toHaveCount(0);
 await page.getByText('Automatic synchronization',{exact:true}).click();
 const before=qa.requests.length;
 await cards(page);await page.locator('#review-balances').click();await page.getByRole('button',{name:'Batch',exact:true}).click();await page.getByRole('button',{name:/Select cards/}).click();await expect.poll(async()=>active(await snapshot(page)).ledger?.requests.length).toBeGreaterThan(0);
 const ref=active(await snapshot(page)).ledger.requests[0].ref,packet=['WMGC-RESULT\t1','ref\tbalanceCAD\tcheckedAt',ref+'\t40.00\t'+new Date().toISOString()].join('\n');
 await page.evaluate(text=>{window.qaClipboard.text=text;window.dispatchEvent(new Event('focus'));},packet);
 await expect(page.getByRole('heading',{name:'Results preview'})).toHaveCount(0);
 await expect(page.getByText('Copied Batch results found.')).toHaveCount(0);
 expect(await page.evaluate(()=>({reads:window.qaClipboard.reads,queries:window.qaClipboard.queries}))).toEqual({reads:0,queries:0});
 await page.getByRole('textbox').fill(packet);await page.getByRole('button',{name:'Preview results'}).click();await expect(page.getByRole('heading',{name:'Results preview'})).toBeVisible();
 expect(active(await snapshot(page)).ledger.requests.every(r=>r.state==='pending')).toBe(true);
 expect(qa.requests.length).toBe(before);
 await page.getByRole('button',{name:'Apply accepted results'}).click();await expect.poll(async()=>active(await snapshot(page)).ledger.requests.some(r=>r.state==='applied')).toBe(true);
 expect(await page.evaluate(()=>window.qaClipboard.reads)).toBe(0);
 expect(active(await snapshot(page)).pending.length).toBeGreaterThan(0);expect(remote.writes).toBe(0);
 await page.getByRole('button',{name:'Exit',exact:true}).click();await settings(page);await page.getByRole('button',{name:'Sync now',exact:true}).first().click();
 await syncPoll(async()=>active(await snapshot(page)).pending.length).toBe(0);expect(remote.writes).toBe(1);
 await context.close();
});

test('Settings retains drafts, shares persistent preferences and exposes failures without changing inventory',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA,cardB]);
 const qa=await setup(context,remote,[]),page=await context.newPage();await start(page);
 await expect(page.getByText('Synced',{exact:true}).first()).toBeVisible();
 await checkoutA(page);await settings(page);
 const connection=page.locator('details').filter({has:page.locator('summary h3').filter({hasText:'Google connection'})});
 await expect(connection).not.toHaveAttribute('open');
 await connection.locator('summary').click();await expect(page.getByText('Connected: qa@example.invalid')).toBeVisible();
 const advanced=page.locator('summary').filter({hasText:'Advanced synchronization and recovery'});
 await advanced.click();await page.getByLabel('Exact Sheet ID (optional)').fill('  synthetic-sheet  ');
 await page.getByLabel('Explicitly deleted card numbers (optional)').fill('0000, 1111');
 await page.getByLabel('Sort gift cards').focus();await page.keyboard.press('Tab');
 await expect(page.getByRole('combobox',{name:'Appearance',exact:true})).toBeFocused();
 await page.getByLabel('Sort gift cards').selectOption('balance-desc');
 await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption('light');
 await page.getByText('Checkout auto-dark',{exact:true}).click();
 await page.getByText('Hide Used Cards',{exact:true}).click();await page.getByText('Hide $0 Cards',{exact:true}).click();
 await page.getByText('Auto-Advance',{exact:true}).click();await page.getByText('Automatic synchronization',{exact:true}).click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('walmartGc.settings')));
 expect(saved).toMatchObject({sortMode:'balance-desc',themeMode:'light',checkoutDark:false,hideUsedCards:false,hideZeroBalanceCards:true,advanceOnMarkUsed:false,automaticSync:false});
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:test.info().outputPath('settings-mobile.png'),fullPage:true,animations:'disabled'});
 const before=await snapshot(page);
 // Back returns to Checkout; the header toggle returns there too.
 await page.locator('#settings-back').click();await expect(page.locator('#card-detail')).toBeVisible();
 await expect(page.getByText(/qa@example.invalid/)).toHaveCount(0);
 await expect(page.locator('html')).not.toHaveClass(/dark/);
 await settings(page);await expect(connection).not.toHaveAttribute('open');await advanced.click();
 await expect(page.getByLabel('Exact Sheet ID (optional)')).toHaveValue('  synthetic-sheet  ');
 await expect(page.getByLabel('Explicitly deleted card numbers (optional)')).toHaveValue('0000, 1111');
 await page.locator('#open-settings').click();await expect(page.locator('#card-detail')).toBeVisible();
 await cards(page);await expect(page.getByText(/0042/).first()).toBeVisible();
 await page.locator('#review-balances').click();await page.getByRole('button',{name:'Exit',exact:true}).click();
 await settings(page);await page.setViewportSize({width:1280,height:900});
 await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:test.info().outputPath('settings-desktop.png'),fullPage:true,animations:'disabled'});
 await expect(page.getByLabel('Sort gift cards')).toHaveValue('balance-desc');
 // A synchronous preference write failure retains the session and the inventory.
 await page.evaluate(()=>{window.qaOriginalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='walmartGc.settings')throw Error('QA preferences unavailable');return window.qaOriginalSetItem.call(this,key,value);};});
 await page.getByRole('combobox',{name:'Appearance',exact:true}).selectOption('dark');
 await expect(page.locator('html')).toHaveClass(/dark/);
 expect(await snapshot(page)).toEqual(before);
 // A transport failure opens connection details and leaves committed cards intact.
 qa.mock.offline=true;await page.getByRole('button',{name:'Sync now',exact:true}).click();
 await expect(page.getByText('Review sync',{exact:true}).first()).toBeVisible();
 await expect(connection).toHaveAttribute('open','');
 expect(active(await snapshot(page)).cards).toEqual(active(before).cards);
 qa.mock.offline=false;
 await page.reload();await expect(page.getByRole('button',{name:'Open settings'})).toBeVisible();await settings(page);
 await expect(page.getByRole('combobox',{name:'Appearance',exact:true})).toHaveValue('light');
 await expect(page.getByLabel('Automatic synchronization')).not.toBeChecked();
 await expect(page.getByLabel('Sort gift cards')).toHaveValue('balance-desc');
 await advanced.click();await expect(page.getByLabel('Exact Sheet ID (optional)')).toHaveValue('');
 expect(qa.errors).toEqual([]);await context.close();
});


test('Cards preserves filters, sorting, totals, selection and empty-state commands across navigation',async({browser})=>{
 const context=await browser.newContext({viewport:{width:412,height:923}});
 const remote=await syntheticRemote([{...cardA,used:true}, {...cardB,currentBalance:0}]);
 const qa=await setup(context,remote,[]),page=await context.newPage();await start(page);
 const rows=page.getByRole('main').getByRole('button').filter({hasText:/6300/});
 const balance=amount=>page.getByRole('status',{name:new RegExp('Available Walmart balance: \\$'+amount)});
 await expect(rows).toHaveCount(1);await expect(rows.first()).toContainText('0084');
 await expect(balance('0.00')).toBeVisible();
 await settings(page);await page.getByText('Hide $0 Cards',{exact:true}).click();await cards(page);
 await expect(page.getByText('All registered cards are filtered out',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Go to Settings',exact:true}).click();
 await expect(page.getByLabel('Hide $0 Cards')).toBeChecked();await cards(page);
 await page.getByRole('button',{name:'Reset Filters',exact:true}).click();
 await expect(rows).toHaveCount(2);await expect(rows.first()).toContainText('0084');
 await expect(rows.last()).toContainText('Used');await expect(balance('100.00')).toBeVisible();
 await settings(page);await page.getByLabel('Sort gift cards').selectOption('balance-desc');await cards(page);
 await expect(rows.first()).toContainText('0042');await expect(rows.last()).toContainText('0084');
 await rows.first().focus();await page.keyboard.press('Enter');
 await expect(page.locator('#card-detail')).toBeVisible();await expect(page.locator('#card-detail')).toContainText('0042');
 await expect(balance('100.00')).toBeVisible();await cards(page);
 await expect(rows.first()).toHaveAttribute('aria-pressed','true');
 await page.locator('#review-balances').click();await page.getByRole('button',{name:'Exit',exact:true}).click();
 await expect(page.locator('#review-balances')).toBeFocused();await expect(rows.first()).toHaveAttribute('aria-pressed','true');
 await expect(page.getByText(/qa@example.invalid/)).toHaveCount(0);
 await page.screenshot({path:test.info().outputPath('cards-mobile.png'),fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:1280,height:900});
 await expect(rows.first()).toContainText('0042');expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
 await page.screenshot({path:test.info().outputPath('cards-desktop.png'),fullPage:true,animations:'disabled'});
 await page.reload();await expect(rows.first()).toContainText('0042');await expect(rows).toHaveCount(2);
 await settings(page);await page.locator('#saved-inventory').selectOption('unbound');await cards(page);
 await expect(page.getByText('No gift cards yet',{exact:true})).toBeVisible();
 await expect(page.locator('#empty-state-connect-google')).toHaveCount(0);
 const choosing=page.waitForEvent('filechooser',{timeout:5000});await page.locator('#empty-state-import-csv').click();
 const chooser=await choosing;expect(await chooser.element().getAttribute('id')).toBe('csv-file-input');
 expect(qa.errors).toEqual([]);await context.close();
});

test('Checkout retains workflow drafts and selection while copy, barcode, navigation and wake locks stay scoped',async({browser})=>{
 const context=await browser.newContext(),remote=await syntheticRemote([cardA,cardB]);
 const qa=await setup(context,remote,[]);
 await context.addInitScript(()=>{
  window.qaCopies=[];window.qaWakeRequests=[];window.qaWakeReleased=[];window.qaFinePointer=false;
  const match=window.matchMedia.bind(window);
  window.matchMedia=query=>query==='(hover: hover) and (pointer: fine)'?{matches:window.qaFinePointer}:match(query);
  Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.qaCopies.push(text);}}});
  Object.defineProperty(navigator,'wakeLock',{value:{request:()=>new Promise(resolve=>{
   const id=window.qaWakeRequests.length;window.qaWakeRequests.push(()=>resolve({release:async()=>{window.qaWakeReleased.push(id);}}));
  })}});
 });
 const page=await context.newPage();await start(page);
 await settings(page);await page.getByLabel('Sort gift cards').selectOption('balance-desc');await page.locator('#settings-back').click();await checkoutA(page);
 await expect(page.getByRole('img',{name:'Code 128 checkout barcode'})).toBeVisible();
 await expect(page.locator('#prev-card')).toBeDisabled();await expect(page.locator('#next-card')).toBeEnabled();
 await page.locator('#detail-barcode-caption').click();await expect(page.locator('#detail-barcode-caption')).toHaveText(cardA.cardNumber);
 await page.getByRole('button',{name:'Edit',exact:true}).click();await page.getByPlaceholder('Add card notes...').fill('  Checkout draft  ');
 await settings(page);await page.locator('#settings-back').click();await expect(page.getByPlaceholder('Add card notes...')).toHaveValue('  Checkout draft  ');
 await page.getByRole('button',{name:'Save Notes'}).click();await expect(page.locator('#detail-notes')).toHaveText('Checkout draft');
 // Resolve an already abandoned wake-lock request as well as the current grant.
 await page.evaluate(()=>{window.qaWakeRequests.forEach(resolve=>resolve());});
 await expect.poll(()=>page.evaluate(()=>window.qaWakeReleased.length)).toBe(1);
 await cards(page);await expect.poll(()=>page.evaluate(()=>window.qaWakeReleased.length)).toBe(2);
 await page.locator('#review-balances').click();await page.getByRole('button',{name:'Exit',exact:true}).click();
 await page.locator('#nav-detail').click();await expect(page.locator('#detail-barcode-caption')).toHaveText(cardA.cardNumber);
 await page.locator('#open-balance-modal').click();await page.locator('#amount-used-input').fill('12.34');await expect(page.locator('#balance-input')).toHaveValue('87.66');
 await page.keyboard.press('Escape');await expect(page.locator('#balance-modal')).toHaveCount(0);
 await page.locator('#next-card').click();await expect(page.locator('#card-position')).toHaveText('Card 2 of 2');
 await expect(page.locator('#detail-barcode-caption')).not.toHaveText(cardB.cardNumber);
 await page.locator('#prev-card').click();await expect(page.locator('#card-position')).toHaveText('Card 1 of 2');
 await page.screenshot({path:test.info().outputPath('checkout-mobile.png'),fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:1280,height:900});await page.evaluate(()=>{window.qaFinePointer=true;});
 await page.locator('#detail-barcode-caption').click();await page.locator('#detail-barcode-pin').click();
 expect(await page.evaluate(()=>window.qaCopies)).toEqual([`${cardA.cardNumber}/${cardA.pin}`,`${cardA.cardNumber}/${cardA.pin}`]);
 await expect(page.getByText('Code/PIN copied',{exact:true})).toBeVisible();
 await page.screenshot({path:test.info().outputPath('checkout-desktop.png'),fullPage:true,animations:'disabled'});
 await expect(page.getByText(/qa@example.invalid/)).toHaveCount(0);expect(qa.errors).toEqual([]);
 await context.close();
});
